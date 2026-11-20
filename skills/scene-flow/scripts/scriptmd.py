# Reads SCRIPT.md for plan-beats.py and tts.py.
#
# One sentence per plain line, exactly as spoken. Three optional marks, all kept out of the
# aligner and the captions:
#   [tense] / [normal] / [calm] at the start of a line   delivery tone of that sentence
#   [pause:0.6s] alone on a line                         silence after the sentence above it
#   - Hugging Face -> Hắc-ging Phây-x                     spelling VieNeu-TTS reads instead of the term
# Any other line starting with # - > | is a note and is skipped.
import io
import re

TONE = re.compile(r"^\[(tense|normal|calm)\]\s*")
PAUSE = re.compile(r"^\[pause:\s*(\d+(?:\.\d+)?)\s*s?\]$")
RESPELL = re.compile(r"^-\s*(.+?)\s*->\s*(.+?)$")


def read(path="SCRIPT.md"):
    # -> (sentences, respell): sentences are {"text", "tone", "pause"} with pause in seconds or None,
    # respell maps a term to its fallback spelling
    sentences, respell = [], {}
    for n, line in enumerate(io.open(path, encoding="utf-8").read().split("\n"), 1):
        line = line.strip()
        m = RESPELL.match(line)
        if m:
            respell[m.group(1)] = m.group(2)
            continue
        if not line or line.startswith(("#", "-", ">", "|")):
            continue
        m = PAUSE.match(line)
        if m:
            if sentences:
                sentences[-1]["pause"] = float(m.group(1))
            continue
        m = TONE.match(line)
        text = line[m.end():] if m else line
        if text.startswith("["):
            raise SystemExit("%s:%d: unknown mark %s; use [tense], [normal], [calm] or [pause:0.6s]"
                             % (path, n, text.split("]")[0] + "]"))
        if text:
            sentences.append({"text": text, "tone": m.group(1) if m else None, "pause": None})
    return sentences, respell


def respelled(text, respell):
    # longest term first, so "The Swarm" wins over "Swarm"
    for term in sorted(respell, key=len, reverse=True):
        text = re.sub(r"(?<!\w)%s(?!\w)" % re.escape(term), respell[term], text)
    return text
