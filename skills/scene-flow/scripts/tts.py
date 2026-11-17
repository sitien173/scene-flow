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
#
# Requires COLAB_URL and COLAB_TOKEN in the environment.
import argparse
import io
import os
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import colab

ap = argparse.ArgumentParser()
group = ap.add_mutually_exclusive_group()
group.add_argument("--voice", default="Hải Đăng", help="preset voice label or id (default: Hải Đăng)")
group.add_argument("--ref", help="reference audio clip for voice cloning")
ap.add_argument("--gap", type=float, default=0.35, help="silence between sentences (s); 0.55 after a question")
ap.add_argument("--script", default="SCRIPT.md")
ap.add_argument("--no-prep", action="store_true")
ap.add_argument("--list", action="store_true")
a = ap.parse_args()

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

if a.ref:
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
