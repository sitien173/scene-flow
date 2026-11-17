# Upload this file to Colab, run it in one cell, then copy the COLAB_URL and
# COLAB_TOKEN lines. Enable "Omit code cell output when saving this notebook".
import hmac
import json
import queue
import re
import secrets
import shutil
import stat
import subprocess
import tempfile
import threading
import urllib.request
import uuid
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response


MAX_BODY_BYTES = 100 * 1024 * 1024
TOKEN = None
SESSION_ID = uuid.uuid4().hex
MODEL_LOCK = threading.Lock()
_JOBS_LOCK = threading.Lock()
_JOBS = {}
_REFERENCES = set()
_whisper_model = None
_whisper_model_name = None
_vieneu = None

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


def _authorized(scope):
    expected = TOKEN
    if not expected:
        return False
    authorization = next(
        (value for name, value in scope.get("headers", []) if name.lower() == b"authorization"),
        b"",
    ).decode("latin-1")
    scheme, separator, credential = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer":
        return False
    return hmac.compare_digest(credential.encode("utf-8"), expected.encode("utf-8"))


class AuthAndBodyLimitMiddleware:
    def __init__(self, app, max_bytes):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if scope.get("path") != "/health" and not _authorized(scope):
            response = JSONResponse({"error": "unauthorized"}, status_code=401)
            await response(scope, receive, send)
            return

        if scope.get("method") not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, send)
            return

        messages = []
        size = 0
        while True:
            message = await receive()
            if message["type"] != "http.request":
                messages.append(message)
                break
            size += len(message.get("body", b""))
            if size > self.max_bytes:
                response = JSONResponse({"error": "too large"}, status_code=413)
                await response(scope, receive, send)
                return
            messages.append(message)
            if not message.get("more_body", False):
                break

        async def replay_receive():
            if messages:
                return messages.pop(0)
            return {"type": "http.request", "body": b"", "more_body": False}

        await self.app(scope, replay_receive, send)


app.add_middleware(AuthAndBodyLimitMiddleware, max_bytes=MAX_BODY_BYTES)


def _get_vieneu():
    global _vieneu
    if _vieneu is None:
        from vieneu import Vieneu

        _vieneu = Vieneu(mode="v3turbo")
    return _vieneu


def _get_whisper_model(model_name):
    global _whisper_model, _whisper_model_name
    if _whisper_model is None or model_name != _whisper_model_name:
        import whisper

        _whisper_model = None
        _whisper_model_name = None
        _whisper_model = whisper.load_model(model_name)
        _whisper_model_name = model_name
    return _whisper_model


def _write_upload(data, suffix):
    with tempfile.NamedTemporaryFile(prefix="colab-upload-", suffix=suffix, delete=False) as upload:
        upload.write(data)
        return Path(upload.name)


def _normalize_asr_result(result, requested_model, requested_language, duration):
    segments = []
    words = []
    for segment in result.get("segments", []):
        segments.append({
            "start": float(round(float(segment["start"]), 3)),
            "end": float(round(float(segment["end"]), 3)),
            "text": str(segment.get("text", "")).strip(),
        })
        for word in segment.get("words") or []:
            words.append({
                "w": str(word.get("word", "")).strip(),
                "s": float(round(float(word["start"]), 3)),
                "e": float(round(float(word["end"]), 3)),
                "p": float(round(float(word["probability"]), 3)),
            })
    return {
        "model": requested_model,
        "language": str(result.get("language") or requested_language),
        "duration": float(round(duration, 3)),
        "segments": segments,
        "words": words,
    }


def _run_asr(job_id, model_name, language, upload_path):
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
        if job is None:
            upload_path.unlink(missing_ok=True)
            return
        job["state"] = "running"
    try:
        import whisper
        from whisper.audio import SAMPLE_RATE

        audio = whisper.load_audio(str(upload_path))
        duration = len(audio) / SAMPLE_RATE
        with MODEL_LOCK:
            model = _get_whisper_model(model_name)
            result = model.transcribe(
                audio,
                language=language,
                word_timestamps=True,
                beam_size=5,
            )
            del model
        result = _normalize_asr_result(result, model_name, language, duration)
        with _JOBS_LOCK:
            job = _JOBS.get(job_id)
            if job is not None:
                job["result"] = result
                job["state"] = "done"
    except Exception as error:
        message = str(error) or type(error).__name__
        with _JOBS_LOCK:
            job = _JOBS.get(job_id)
            if job is not None:
                job["error"] = message
                job["state"] = "error"
    finally:
        upload_path.unlink(missing_ok=True)


def _audio_response(audio):
    output_path = None
    try:
        with tempfile.NamedTemporaryFile(prefix="colab-tts-", suffix=".wav", delete=False) as output:
            output_path = Path(output.name)
        _get_vieneu().save(audio, output_path)
        return Response(output_path.read_bytes(), media_type="audio/wav")
    finally:
        if output_path is not None:
            output_path.unlink(missing_ok=True)


@app.get("/health")
def health():
    return {"ok": True, "session": SESSION_ID}


@app.post("/asr")
async def submit_asr(request: Request, model: str = "small", language: str = "vi"):
    audio = await request.body()
    if not audio:
        return JSONResponse({"error": "empty body"}, status_code=400)
    upload_path = _write_upload(audio, ".audio")
    job_id = uuid.uuid4().hex
    with _JOBS_LOCK:
        _JOBS[job_id] = {"state": "queued", "result": None, "error": None}
    worker = threading.Thread(
        target=_run_asr,
        args=(job_id, model, language, upload_path),
        daemon=True,
    )
    try:
        worker.start()
    except Exception:
        upload_path.unlink(missing_ok=True)
        with _JOBS_LOCK:
            _JOBS.pop(job_id, None)
        return JSONResponse({"error": "could not start ASR job"}, status_code=500)
    return {"job": job_id}


@app.get("/asr/{job_id}")
def get_asr(job_id: str):
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
        if job is None:
            return JSONResponse({"error": "unknown job"}, status_code=404)
        state = job["state"]
        result = job["result"]
        error = job["error"]
    if state in {"queued", "running"}:
        return JSONResponse({"state": state}, status_code=202)
    if state == "error":
        return JSONResponse({"error": error}, status_code=500)
    return result


@app.get("/voices")
def voices():
    with MODEL_LOCK:
        presets = _get_vieneu().list_preset_voices()
    return {"voices": [{"label": str(label), "id": str(voice_id)} for label, voice_id in presets]}


@app.post("/references")
async def enroll_reference(request: Request):
    audio = await request.body()
    if not audio:
        return JSONResponse({"error": "empty body"}, status_code=400)
    upload_path = _write_upload(audio, ".wav")
    ref_id = uuid.uuid4().hex
    try:
        with MODEL_LOCK:
            _get_vieneu().add_voice(ref_id, upload_path, save=False)
            _REFERENCES.add(ref_id)
    except Exception as error:
        return JSONResponse({"error": str(error) or type(error).__name__}, status_code=500)
    finally:
        upload_path.unlink(missing_ok=True)
    return {"ref_id": ref_id}


@app.post("/tts")
async def synthesize(request: Request):
    try:
        payload = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JSONResponse({"error": "invalid JSON"}, status_code=400)
    if not isinstance(payload, dict):
        return JSONResponse({"error": "invalid request"}, status_code=400)

    text = payload.get("text")
    has_voice = "voice" in payload
    has_ref_id = "ref_id" in payload
    if not isinstance(text, str) or not text.strip() or has_voice == has_ref_id:
        return JSONResponse({"error": "text and exactly one voice selector are required"}, status_code=400)

    selector = payload.get("voice") if has_voice else payload.get("ref_id")
    if not isinstance(selector, str) or not selector.strip():
        return JSONResponse({"error": "voice selector must be a non-empty string"}, status_code=400)

    with MODEL_LOCK:
        if has_ref_id and selector not in _REFERENCES:
            return JSONResponse({"error": "unknown ref_id"}, status_code=404)
        try:
            engine = _get_vieneu()
            audio = engine.infer(text.strip(), voice=selector)
            return _audio_response(audio)
        except Exception as error:
            return JSONResponse({"error": str(error) or type(error).__name__}, status_code=500)


def _cloudflared_path():
    installed = shutil.which("cloudflared")
    if installed:
        return installed
    path = Path(tempfile.gettempdir()) / "cloudflared"
    if not path.is_file():
        urllib.request.urlretrieve(
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64",
            path,
        )
    path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return str(path)


def _start_cloudflared():
    process = subprocess.Popen(
        [_cloudflared_path(), "tunnel", "--url", "http://127.0.0.1:8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )
    url_ready = queue.Queue(maxsize=1)

    def drain_output():
        pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
        if process.stdout is None:
            return
        for line in process.stdout:
            match = pattern.search(line)
            if match:
                try:
                    url_ready.put_nowait(match.group(0))
                except queue.Full:
                    pass

    reader = threading.Thread(target=drain_output, daemon=True)
    reader.start()
    try:
        url = url_ready.get(timeout=90)
    except queue.Empty as error:
        _stop_cloudflared(process)
        raise RuntimeError("cloudflared did not provide a quick tunnel URL") from error
    return process, reader, url


def _stop_cloudflared(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def warm_vieneu():
    with MODEL_LOCK:
        engine = _get_vieneu()
        presets = engine.list_preset_voices()
        if presets:
            engine.infer("Xin chào.", voice=presets[0][1])


def main():
    global TOKEN
    TOKEN = secrets.token_urlsafe(32)
    process, _, url = _start_cloudflared()
    print(f"COLAB_URL={url}", flush=True)
    print(f"COLAB_TOKEN={TOKEN}", flush=True)
    try:
        warm_vieneu()
        import uvicorn

        uvicorn.run(app, host="127.0.0.1", port=8000)
    finally:
        _stop_cloudflared(process)


if __name__ == "__main__":
    main()
