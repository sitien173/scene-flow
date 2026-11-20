# Word-level transcription of the voiceover.
#
# This replaces guessing. The heuristic aligner had to infer sentence boundaries from
# pause lengths, and on this recording it kept cutting at 0.09-0.16s gaps while skipping
# 0.50-0.60s gaps a few hundred milliseconds later — boundaries landing early, which is
# exactly the "picture slightly ahead of the voice" the author heard. Raising the seam
# weight to 10x moved nothing, because the rate band was the binding constraint, and
# both candidate assignments were self-consistent. Without hearing the audio there is no
# way to arbitrate between them.
#
# Transcribes audio on Google Colab using OpenAI Whisper via colab/server.py.
# Needs a server from colab-session.py up, or COLAB_URL and COLAB_TOKEN. Output is words with start/end
# times, which the map can then be built from as measurement instead of inference.
#
# --local runs whisper.cpp on this machine through hyperframes transcribe instead; gpu-check.py says
# when that is worth it. The words then carry no confidence, which nothing downstream reads.
#   python scripts/asr.py [model] [audio] [--local]
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import colab

LOCAL = "--local" in sys.argv
ARGS = [x for x in sys.argv[1:] if x != "--local"]
MODEL = ARGS[0] if ARGS else "small"
AUDIO = ARGS[1] if len(ARGS) > 1 else "assets/audio/src/voiceover-master.wav"

if not LOCAL:
    colab.get_config()

if not os.path.isfile(AUDIO):
    sys.exit("audio file not found: %s" % AUDIO)

if LOCAL:
    # --engine whisper: Parakeet does not cover Vietnamese. --dir in a temp folder, because transcribe
    # rewrites caption arrays in every HTML file under --dir.
    tmp = tempfile.mkdtemp(prefix="asr-")
    done = subprocess.run([shutil.which("npx") or "npx", "--yes", "hyperframes@0.8.140", "transcribe",
                           os.path.abspath(AUDIO), "--engine", "whisper", "--model", MODEL, "--language", "vi",
                           "--json", "--dir", tmp], stdout=subprocess.PIPE, text=True, encoding="utf-8")
    if done.returncode:
        sys.exit("local ASR failed: %s" % done.stdout.strip()[-500:])
    info = json.loads(done.stdout.strip().splitlines()[-1])
    words = [{"w": w["text"], "s": w["start"], "e": w["end"]}
             for w in json.load(io.open(info["transcriptPath"], encoding="utf-8"))]
    result = {"model": MODEL, "language": "vi", "duration": info["durationSeconds"], "segments": [], "words": words}
    json.dump(result, io.open("asr-words.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("%d words -> asr-words.json" % len(words))
    sys.exit(0)

with io.open(AUDIO, "rb") as f:
    audio_bytes = f.read()

print("transcribing ...", flush=True)
try:
    job_id = colab.submit_asr(audio_bytes, model=MODEL, language="vi")
except colab.ColabHttpError as e:
    sys.exit("ASR submission failed: %s" % e)

deadline = time.time() + 15 * 60
result = None
consecutive_transient = 0

while time.time() < deadline:
    time.sleep(3)
    try:
        status, data = colab.get_asr(job_id)
    except colab.ColabTransientError:
        consecutive_transient += 1
        if consecutive_transient >= 5:
            sys.exit("Could not connect to Colab: the Colab session probably ended or the URL changed.")
        continue
    except colab.ColabHttpError as e:
        if e.status_code == 404:
            sys.exit("ASR job failed: %s (the Colab session probably restarted)" % e)
        sys.exit("ASR job failed: %s" % e)

    consecutive_transient = 0
    if status == 200:
        result = data
        break
    if status == 500:
        err_msg = data.get("error", "ASR transcription failed") if isinstance(data, dict) else str(data)
        sys.exit(err_msg)

if result is None:
    sys.exit("ASR job timed out after 15 minutes")

segments = result.get("segments", [])
words = result.get("words", [])

for s in segments:
    print("  %6.2f-%6.2f  %s" % (s["start"], s["end"], s.get("text", "").strip()[:78]), flush=True)

json.dump(result, io.open("asr-words.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n%d words, %d segments -> asr-words.json" % (len(words), len(segments)))
