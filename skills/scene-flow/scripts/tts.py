# Vietnamese voiceover with VieNeu-TTS on Google Colab via colab/server.py.
#
# Reads SCRIPT.md (one sentence per plain line, the same file the aligner reads), speaks each sentence
# separately, and joins them with a short silence, so every sentence gap is a clean cut point for
# silences.py. Writes assets/audio/src/tts-voice.wav, then levels it with prep-voice.py (-21.0 LUFS)
# unless --no-prep. From there the pipeline is the usual voice-first chain (asr.py, align-asr.py, …).
#
# usage (from the project root):
#   python scripts/tts.py                                  # default preset voice (Hải Đăng)
#   python scripts/tts.py --voice "<name>"                 # specify a preset voice label or id
#   python scripts/tts.py --ref "<clip.wav>"               # clone voice from reference clip
#   python scripts/tts.py --gap 0.35                       # gap between sentences (s)
#   python scripts/tts.py --list                           # list available preset voices
#   python scripts/tts.py --provider vibi                  # Vibi (api.vibi.pro) ElevenLabs voices
#   python scripts/tts.py --provider vibi --voice <id> --lang vi --model eleven_v3
#
# Needs a server from colab-session.py up, or COLAB_URL and COLAB_TOKEN in the environment.
# --provider vibi needs VIBI_API_KEY in the environment instead; --ref and --list are Colab only.
import argparse
import io
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import colab

VIBI_API = "https://api.vibi.pro/v1"


def vibi_call(url, key, body=None):
    headers = {"User-Agent": "scene-flow-tts"}
    if key:
        headers.update({"xi-api-key": key, "Content-Type": "application/json"})
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", "replace")[:300]
        # error bodies must never echo the key into the terminal
        raise RuntimeError("HTTP %d: %s" % (e.code, msg.replace(key, "[redacted]") if key else msg))
    except urllib.error.URLError as e:
        raise RuntimeError("cannot reach %s: %s" % (urllib.parse.urlsplit(url).netloc, e.reason))


def vibi_synthesize(text, voice, lang, model, key):
    # Vibi is asynchronous: the POST queues a task, /history/{id} is polled until it completes
    # (every 2 s, up to ~5 min), then result.audio_url is downloaded without the key.
    body = {"text": text, "language_code": lang}
    if model:
        body["model_id"] = model
    task = json.loads(vibi_call("%s/text-to-speech/%s" % (VIBI_API, urllib.parse.quote(voice, safe="")), key, body))
    task_id = task.get("id")
    if not task_id:
        raise RuntimeError("no task id in response")
    for _ in range(150):
        if task.get("status") in ("completed", "failed"):
            break
        time.sleep(2)
        task = json.loads(vibi_call("%s/history/%s" % (VIBI_API, urllib.parse.quote(task_id, safe="")), key))
    if task.get("status") != "completed":
        raise RuntimeError("task %s %s: %s" % (task_id, task.get("status"), task.get("error") or "no reason"))
    url = (task.get("result") or {}).get("audio_url") or task.get("audio_url")
    if not url:
        raise RuntimeError("task %s returned no audio_url" % task_id)
    return vibi_call(url, None)


ap = argparse.ArgumentParser()
ap.add_argument("--provider", choices=["colab", "vibi"], default="colab")
group = ap.add_mutually_exclusive_group()
group.add_argument("--voice", help="preset voice label or id (default: Hải Đăng); "
                                   "with vibi an ElevenLabs voice id (default: Rachel)")
group.add_argument("--ref", help="reference audio clip for voice cloning")
ap.add_argument("--lang", default="vi", help="vibi language_code (default: vi)")
ap.add_argument("--model", help="vibi model_id (default: Vibi's eleven_v3)")
ap.add_argument("--gap", type=float, default=0.35, help="silence between sentences (s); 0.55 after a question")
ap.add_argument("--script", default="SCRIPT.md")
ap.add_argument("--no-prep", action="store_true")
ap.add_argument("--list", action="store_true")
a = ap.parse_args()
a.voice = a.voice or ("21m00Tcm4TlvDq8ikWAM" if a.provider == "vibi" else "Hải Đăng")

if a.provider == "vibi" and (a.ref or a.list):
    sys.exit("--ref and --list need the Colab provider")

if a.list:
    voices = colab.get_voices()
    for v in voices:
        print("%-24s %s" % (v.get("label", ""), v.get("id", "")))
    sys.exit(0)

SENT = [s.strip() for s in io.open(a.script, encoding="utf-8").read().split("\n")
        if s.strip() and not s.strip().startswith(("#", "-", ">", "|"))]
if not SENT:
    sys.exit("%s has no sentences — one sentence per plain line" % a.script)

SR = 48000
tmp = tempfile.mkdtemp(prefix="tts-")

voice_id = None
ref_id = None
ref_bytes = None

if a.provider == "vibi":
    vibi_key = os.environ.get("VIBI_API_KEY")
    if not vibi_key:
        sys.exit("--provider vibi needs VIBI_API_KEY in the environment")
elif a.ref:
    if not os.path.isfile(a.ref):
        sys.exit("reference clip not found: %s" % a.ref)
    with io.open(a.ref, "rb") as f:
        ref_bytes = f.read()
    try:
        ref_id = colab.enroll_reference(ref_bytes)
    except colab.ColabHttpError as e:
        sys.exit("Reference enrollment failed: %s" % e)
else:
    voice_id = colab.resolve_voice(a.voice)

files = []
for i, s in enumerate(SENT):
    dl_path = os.path.join(tmp, "s%03d.dl.wav" % i)
    if a.provider == "vibi":
        dl_path = os.path.join(tmp, "s%03d.dl" % i)  # no extension: ffmpeg probes whatever format Vibi serves
        try:
            audio = vibi_synthesize(s, a.voice, a.lang, a.model, vibi_key)
        except RuntimeError as e:
            sys.exit("TTS failed on sentence %d (%s): %s" % (i + 1, s[:40], e))
        with io.open(dl_path, "wb") as f:
            f.write(audio)
        files.append(dl_path)
        continue
    reenrolled = False
    written = False
    attempt = 0
    while attempt < 3:
        try:
            wav_bytes = colab.synthesize(
                text=s,
                voice=voice_id,
                ref_id=ref_id,
                raise_transient=True,
            )
            with io.open(dl_path, "wb") as f:
                f.write(wav_bytes)
            files.append(dl_path)
            written = True
            break
        except colab.ColabHttpError as e:
            if e.status_code == 404 and ref_id is not None and not reenrolled:
                try:
                    ref_id = colab.enroll_reference(ref_bytes)
                except colab.ColabHttpError as enroll_err:
                    sys.exit("Reference re-enrollment failed: %s" % enroll_err)
                reenrolled = True
                continue
            sys.exit("TTS failed on sentence %d (%s): %s" % (i + 1, s[:40], e))
        except colab.ColabTransientError as e:
            attempt += 1
            if attempt >= 3:
                if getattr(e, "status_code", None) == 500:
                    sys.exit("TTS failed on sentence %d (%s): %s" % (i + 1, s[:40], e))
                sys.exit("Could not connect to Colab: the Colab session probably ended or the URL changed.")
            time.sleep(1)

    if not written:
        sys.exit("TTS failed on sentence %d (%s): clip was not written" % (i + 1, s[:40]))

lst = os.path.join(tmp, "list.txt")
with io.open(lst, "w", encoding="utf-8") as f:
    for i, (dl_path, s) in enumerate(zip(files, SENT)):
        wav = os.path.join(tmp, "s%03d.wav" % i)
        # trim the service's own lead/tail silence so the gaps below are exact
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", dl_path, "-ac", "1", "-ar", str(SR),
                        "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                               "silenceremove=start_periods=1:start_threshold=-50dB,areverse",
                        wav], check=True)
        f.write("file '%s'\n" % wav.replace("\\", "/"))
        if i + 1 < len(SENT):
            gap = a.gap + (0.2 if s.endswith("?") else 0.0)
            sil = os.path.join(tmp, "g%03d.wav" % i)
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
                            "anullsrc=r=%d:cl=mono" % SR, "-t", "%.3f" % gap, sil], check=True)
            f.write("file '%s'\n" % sil.replace("\\", "/"))

os.makedirs("assets/audio/src", exist_ok=True)
out = "assets/audio/src/tts-voice.wav"
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                "-af", "apad=pad_dur=0.4", "-c:a", "pcm_s16le", out], check=True)
target_voice = a.ref if a.ref else a.voice
print("  %d sentences, voice %s -> %s" % (len(SENT), target_voice, out))
if not a.no_prep:
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "prep-voice.py"), out],
                   check=True)
