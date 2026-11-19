# Shared client for the Google Colab Whisper and VieNeu-TTS server.
#
# Connects to colab/server.py running behind a cloudflared quick tunnel. Reads COLAB_URL
# and COLAB_TOKEN from the environment, else the session file that colab-session.py up
# writes. All routes except /health require the token as a Bearer token in the Authorization header.
#
# Handles HTTP communication using the standard library only. Maps transient connection
# failures and timeouts to helpful diagnostic messages, and handles voice resolution,
# reference enrolment, per-sentence synthesis, and polled transcription.
import json
import os
import sys
import time
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

TIMEOUT_DEFAULT = 30
TIMEOUT_POLL = 15
TIMEOUT_TTS = 120
TIMEOUT_UPLOAD = 300
STATE_PATH = Path(os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config") / "scene-flow" / "colab.json"


class ColabError(Exception):
    """Base error for Colab client communication."""
    pass


class ColabTransientError(ColabError):
    """Network drop, gateway timeout, or 5xx/52x error that callers may retry."""
    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.status_code = status_code


class ColabHttpError(ColabError):
    """HTTP error response with status code and parsed body."""
    def __init__(self, status_code, message, data=None):
        super().__init__(message)
        self.status_code = status_code
        self.data = data or {}


def get_config():
    """Read COLAB_URL and COLAB_TOKEN from the environment, else STATE_PATH. Exit cleanly if missing."""
    url = os.environ.get("COLAB_URL")
    token = os.environ.get("COLAB_TOKEN")
    if (not url or not token) and STATE_PATH.is_file():
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        url, token = state.get("url"), state.get("token")
    if not url or not token:
        sys.exit("No Colab server configured. Run scripts/colab-session.py up from the scene-flow skill, "
                 "or set COLAB_URL and COLAB_TOKEN.")
    return url.rstrip("/"), token


def _request(path, method="GET", query=None, body=None, content_type=None, timeout=TIMEOUT_DEFAULT,
             raise_transient=False, return_500=False):
    """Send an authenticated HTTP request to the Colab server."""
    base_url, token = get_config()
    full_url = f"{base_url}{path}"
    if query:
        full_url = f"{full_url}?{urllib.parse.urlencode(query)}"

    headers = {
        "Authorization": f"Bearer {token}",
    }
    if content_type:
        headers["Content-Type"] = content_type

    req = urllib.request.Request(full_url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status = response.status
            content_type_header = response.headers.get("Content-Type", "")
            raw = response.read()
            if "application/json" in content_type_header:
                data = json.loads(raw.decode("utf-8", errors="replace")) if raw else {}
                return status, data
            return status, raw
    except urllib.error.HTTPError as error:
        status = error.code
        if status == 401:
            sys.exit("Colab token mismatch (401 unauthorized). Run scripts/colab-session.py up again, or check that COLAB_TOKEN matches the running Colab session.")

        raw_body = b""
        data = {}
        try:
            raw_body = error.read()
            if raw_body:
                data = json.loads(raw_body.decode("utf-8", errors="replace"))
        except Exception:
            data = {}

        if status == 500 and return_500:
            return 500, data

        if status == 500:
            err_msg = data.get("error") if isinstance(data, dict) else str(error)
            if not err_msg:
                err_msg = f"HTTP {status}"
            if raise_transient:
                raise ColabTransientError(str(err_msg), status_code=500)
            sys.exit(f"Colab server error: {err_msg}")

        if status in (502, 503, 504) or (520 <= status <= 530):
            if raise_transient:
                err_msg = data.get("error") if isinstance(data, dict) else str(error)
                raise ColabTransientError(f"HTTP {status}: {err_msg}", status_code=status)
            sys.exit("Could not connect to Colab: the Colab session probably ended or the URL changed.")

        err_msg = data.get("error", f"HTTP {status}") if isinstance(data, dict) else f"HTTP {status}"
        raise ColabHttpError(status, str(err_msg), data=data)
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        if raise_transient:
            raise ColabTransientError("Transient connection error", status_code=None) from error
        sys.exit("Could not connect to Colab: the Colab session probably ended or the URL changed.")


def get_voices(timeout=TIMEOUT_POLL):
    """Fetch available preset voices from GET /voices."""
    _, data = _request("/voices", method="GET", timeout=timeout)
    return data.get("voices", [])


def resolve_voice(voice_name, voices=None):
    """Resolve a voice label or id against available presets.

    Matches id exactly, else label exactly, else label case-insensitively.
    When nothing matches, exits with one line listing the available labels.
    """
    if voices is None:
        voices = get_voices()

    # 1. Match id exactly
    for v in voices:
        if v.get("id") == voice_name:
            return v["id"]
    # 2. Match label exactly
    for v in voices:
        if v.get("label") == voice_name:
            return v["id"]
    # 3. Match label case-insensitively
    name_lower = voice_name.lower()
    for v in voices:
        if str(v.get("label", "")).lower() == name_lower:
            return v["id"]

    available = ", ".join(v.get("label", "") for v in voices if "label" in v)
    sys.exit(f"Voice '{voice_name}' not found. Available voices: {available}")


def enroll_reference(audio_bytes, timeout=TIMEOUT_UPLOAD):
    """Upload reference voice clip to POST /references. Returns ref_id."""
    _, data = _request(
        "/references",
        method="POST",
        body=audio_bytes,
        content_type="application/octet-stream",
        timeout=timeout,
    )
    return data["ref_id"]


def synthesize(text, voice=None, ref_id=None, timeout=TIMEOUT_TTS, raise_transient=False):
    """Synthesize speech via POST /tts. Returns WAV audio bytes."""
    payload = {"text": text}
    if voice is not None:
        payload["voice"] = voice
    if ref_id is not None:
        payload["ref_id"] = ref_id

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    _, wav_bytes = _request(
        "/tts",
        method="POST",
        body=body,
        content_type="application/json",
        timeout=timeout,
        raise_transient=raise_transient,
    )
    return wav_bytes


def submit_asr(audio_bytes, model="small", language="vi", timeout=TIMEOUT_UPLOAD):
    """Submit raw audio bytes to POST /asr. Returns job_id."""
    query = {"model": model, "language": language}
    _, data = _request(
        "/asr",
        method="POST",
        query=query,
        body=audio_bytes,
        content_type="application/octet-stream",
        timeout=timeout,
    )
    return data["job"]


def get_asr(job_id, timeout=TIMEOUT_POLL):
    """Poll GET /asr/<job_id>. Returns (status_code, data_dict)."""
    return _request(
        f"/asr/{job_id}",
        method="GET",
        timeout=timeout,
        raise_transient=True,
        return_500=True,
    )
