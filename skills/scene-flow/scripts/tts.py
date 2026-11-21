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
#   python scripts/tts.py --provider local                 # VieNeu-TTS in this Python (gpu-check.py)
#   python scripts/tts.py --provider vibi                  # Vibi (api.vibi.pro) ElevenLabs voices
#   python scripts/tts.py --provider vibi --voice <id> --lang vi --model eleven_v3
#   python scripts/tts.py --provider elevenlabs           # ElevenLabs API directly, same options as vibi
#   python scripts/tts.py --provider elevenlabs --list    # voices in the ElevenLabs account
#
# SCRIPT.md marks (scriptmd.py): a [pause:0.6s] line sets the silence after the sentence above it,
# for every provider. With vibi or elevenlabs on eleven_v3 or eleven_v4, a leading [tense] or [calm]
# is sent as an audio tag; [normal] and every tag on VieNeu are dropped. VieNeu (colab, local) reads
# the "- term -> spelling" lines in place of each term.
#
# Needs a server from colab-session.py up, or COLAB_URL and COLAB_TOKEN in ~/.config/scene-flow/.env.
# --provider local needs vieneu installed here and runs on CUDA when torch sees a GPU, else on CPU.
# --provider vibi needs VIBI_API_KEY in that .env instead; --ref and --list are VieNeu only.
# --provider elevenlabs needs ELEVENLABS_API_KEY in that .env; --list works, --ref does not.
# Keys come from the .env only (settings.py), never from the environment.
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
import scriptmd
import settings

VIBI_API = "https://api.vibi.pro/v1"
ELEVENLABS_API = "https://api.elevenlabs.io/v1"


def xi_call(url, key, body=None):
    # Vibi and ElevenLabs both take the key in the xi-api-key header
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
        err = RuntimeError("HTTP %d: %s" % (e.code, msg.replace(key, "[redacted]") if key else msg))
        err.code = e.code
        raise err
    except urllib.error.URLError as e:
        raise RuntimeError("cannot reach %s: %s" % (urllib.parse.urlsplit(url).netloc, e.reason))


def vibi_synthesize(texts, voice, lang, model, key):
    # Vibi is asynchronous and slow per task (~50 s for one short sentence), so every sentence is
    # queued first, then /history/{id} is polled for all of them together every 2 s with no deadline,
    # showing a live progress line on stderr, then each result.audio_url is downloaded without the key.
    # A poll that fails on the network, 429, or 5xx is retried next round; other 4xx and a failed task
    # stop the run. Returns the audio bytes in order.
    url = "%s/text-to-speech/%s" % (VIBI_API, urllib.parse.quote(voice, safe=""))
    ids = []
    for i, text in enumerate(texts):
        task = json.loads(xi_call(url, key, {"text": text, "language_code": lang, "model_id": model}))
        if not task.get("id"):
            raise RuntimeError("sentence %d (%s): no task id in response" % (i + 1, text[:40]))
        ids.append(task["id"])
    done = {}
    progress = [0] * len(ids)
    start = time.monotonic()
    tty = sys.stderr.isatty()
    shown = None
    while len(done) < len(ids):
        time.sleep(2)
        retry = None
        for i, task_id in enumerate(ids):
            if i in done:
                continue
            try:
                task = json.loads(xi_call("%s/history/%s" % (VIBI_API, urllib.parse.quote(task_id, safe="")), key))
            except (RuntimeError, OSError, ValueError) as e:
                code = getattr(e, "code", None)
                if code and 400 <= code < 500 and code != 429:
                    raise RuntimeError("sentence %d: polling task %s: %s" % (i + 1, task_id, e))
                retry = str(e)[:80]
                continue
            progress[i] = min(task.get("progress") or 0, 100)
            if task.get("status") == "failed":
                raise RuntimeError("sentence %d (%s): task %s failed: %s"
                                   % (i + 1, texts[i][:40], task_id, task.get("error") or "no reason"))
            if task.get("status") == "completed":
                done[i] = (task.get("result") or {}).get("audio_url") or task.get("audio_url")
                if not done[i]:
                    raise RuntimeError("sentence %d: task %s returned no audio_url" % (i + 1, task_id))
        pct = sum(100 if i in done else progress[i] for i in range(len(ids))) // len(ids)
        state = "%d/%d done, %d%%%s" % (len(done), len(ids), pct, ", retrying: " + retry if retry else "")
        m, s = divmod(int(time.monotonic() - start), 60)
        line = "  Vibi %d:%02d %s" % (m, s, state)
        if tty:
            # pad instead of an ANSI clear so the line also redraws on old Windows consoles
            sys.stderr.write("\r" + line.ljust(len(shown or "")))
            sys.stderr.flush()
            shown = line
        elif state != shown:
            print(line, file=sys.stderr, flush=True)  # logs get one line per change, not one per poll
            shown = state
    if tty:
        sys.stderr.write("\n")
    return [xi_call(done[i], None) for i in range(len(ids))]


def elevenlabs_synthesize(texts, voice, lang, model, key):
    # synchronous: each request returns the MP3 bytes of one sentence
    url = "%s/text-to-speech/%s?output_format=mp3_44100_128" % (ELEVENLABS_API, urllib.parse.quote(voice, safe=""))
    out = []
    for i, text in enumerate(texts):
        try:
            out.append(xi_call(url, key, {"text": text, "language_code": lang, "model_id": model}))
        except RuntimeError as e:
            raise RuntimeError("sentence %d (%s): %s" % (i + 1, text[:40], e))
    return out


ap = argparse.ArgumentParser()
ap.add_argument("--provider", choices=["colab", "local", "vibi", "elevenlabs"], default="colab")
group = ap.add_mutually_exclusive_group()
group.add_argument("--voice", help="preset voice label or id (default: Hải Đăng); "
                                   "with vibi or elevenlabs an ElevenLabs voice id (default: Quang Toan)")
group.add_argument("--ref", help="reference audio clip for voice cloning")
ap.add_argument("--lang", default="vi", help="vibi or elevenlabs language_code (default: vi)")
ap.add_argument("--model", default="eleven_v3", help="vibi or elevenlabs model_id (default: eleven_v3)")
ap.add_argument("--gap", type=float, default=0.35, help="silence between sentences (s); 0.55 after a question")
ap.add_argument("--script", default="SCRIPT.md")
ap.add_argument("--no-prep", action="store_true")
ap.add_argument("--list", action="store_true")
a = ap.parse_args()
a.voice = a.voice or ("ZsjEJaLQy3sgvwxicmDx" if a.provider in ("vibi", "elevenlabs") else "Hải Đăng")

if a.provider == "vibi" and (a.ref or a.list):
    sys.exit("--ref and --list need the colab or local provider")
if a.provider == "elevenlabs":
    if a.ref:
        sys.exit("--ref needs the colab or local provider")
    elevenlabs_key = settings.get("ELEVENLABS_API_KEY")
    if not elevenlabs_key:
        sys.exit("--provider elevenlabs needs ELEVENLABS_API_KEY in %s" % settings.PATH)
    if a.list:
        try:
            voices = json.loads(xi_call(ELEVENLABS_API + "/voices", elevenlabs_key))["voices"]
        except RuntimeError as e:
            sys.exit("listing voices failed: %s" % e)
        for v in voices:
            print("%-24s %s" % (v.get("name", ""), v.get("voice_id", "")))
        sys.exit(0)

engine = None
if a.provider == "local":
    try:
        from vieneu import Vieneu
    except ImportError:
        sys.exit("vieneu is not installed in %s; scripts/gpu-check.py in the skill prints the install command"
                 % sys.executable)
    engine = Vieneu(mode="v3turbo")  # same engine as colab/server.py
    presets = [{"label": str(l), "id": str(i)} for l, i in engine.list_preset_voices()]

if a.list:
    voices = presets if engine else colab.get_voices()
    for v in voices:
        print("%-24s %s" % (v.get("label", ""), v.get("id", "")))
    sys.exit(0)

LINES, RESPELL = scriptmd.read(a.script)
if not LINES:
    sys.exit("%s has no sentences — one sentence per plain line" % a.script)
SENT = [s["text"] for s in LINES]
if a.provider in ("vibi", "elevenlabs"):
    tagged = a.model.startswith(("eleven_v3", "eleven_v4"))
    SPOKEN = ["[%s] %s" % (s["tone"], s["text"]) if tagged and s["tone"] in ("tense", "calm") else s["text"]
              for s in LINES]
else:
    SPOKEN = [scriptmd.respelled(s, RESPELL) for s in SENT]

SR = 48000
tmp = tempfile.mkdtemp(prefix="tts-")

voice_id = None
ref_id = None
ref_bytes = None

if a.provider == "vibi":
    vibi_key = settings.get("VIBI_API_KEY")
    if not vibi_key:
        sys.exit("--provider vibi needs VIBI_API_KEY in %s" % settings.PATH)
    try:
        remote_audio = vibi_synthesize(SPOKEN, a.voice, a.lang, a.model, vibi_key)
    except RuntimeError as e:
        sys.exit("TTS failed: %s" % e)
elif a.provider == "elevenlabs":
    try:
        remote_audio = elevenlabs_synthesize(SPOKEN, a.voice, a.lang, a.model, elevenlabs_key)
    except RuntimeError as e:
        sys.exit("TTS failed: %s" % e)
elif engine and a.ref:
    if not os.path.isfile(a.ref):
        sys.exit("reference clip not found: %s" % a.ref)
    voice_id = engine.add_voice("scene-flow-ref", a.ref)
elif engine:
    voice_id = colab.resolve_voice(a.voice, presets)
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
for i, s in enumerate(SPOKEN):
    dl_path = os.path.join(tmp, "s%03d.dl.wav" % i)
    if a.provider in ("vibi", "elevenlabs"):
        dl_path = os.path.join(tmp, "s%03d.dl" % i)  # no extension: ffmpeg probes whatever format the service serves
        with io.open(dl_path, "wb") as f:
            f.write(remote_audio[i])
        files.append(dl_path)
        continue
    if engine:
        engine.save(engine.infer(s, voice=voice_id), dl_path)
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
            gap = LINES[i]["pause"]
            if gap is None:
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
