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
import io
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import colab

MODEL = sys.argv[1] if len(sys.argv) > 1 else "small"
AUDIO = sys.argv[2] if len(sys.argv) > 2 else "assets/audio/src/voiceover-master.wav"

colab.get_config()

if not os.path.isfile(AUDIO):
    sys.exit("audio file not found: %s" % AUDIO)

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
