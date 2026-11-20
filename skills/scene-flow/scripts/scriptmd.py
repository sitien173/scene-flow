# Reads SCRIPT.md for plan-beats.py and tts.py.
#
# One sentence per plain line, exactly as spoken. Three optional marks, all kept out of the
# aligner and the captions:
#   [tense] / [normal] / [calm] at the start of a line   delivery tone of that sentence
#   [pause:0.6s] alone on a line                         silence after the sentence above it
#   - Hugging Face -> Hắc-ging Phây-x                     spelling VieNeu-TTS reads instead of the term
# Any other line starting with # - > | is a note and is skipped.
#
# A script written elsewhere, such as a chatbot's table or labelled prose, must be normalized first
# (SKILL.md step 2). read() stops on what normalization removes: markdown, timestamps, beat labels,
# list numbers, and a table that holds every sentence.
#
#   python scriptmd.py [SCRIPT.md]     prints the sentences, or stops on the first problem lines
import io
import re

TONE = re.compile(r"^\[(tense|normal|calm)\]\s*")
PAUSE = re.compile(r"^\[pause:\s*(\d+(?:\.\d+)?)\s*s?\]$")
RESPELL = re.compile(r"^-\s*(.+?)\s*->\s*(.+?)$")
NOT_SPOKEN = [
    (re.compile(r"[*`]"), "markdown"),
    (re.compile(r"(?<![\d,.])\d{1,2}:\d{2}(?!\d)"), "timestamp"),
    (re.compile(r"^\d+[.)]\s"), "list number"),
    (re.compile(r"^(hook|setup|bối cảnh|leo thang|escalation|cao trào|climax|twist|payoff|kết thúc|ending|loop"
                r"|cta|voiceover|vo|lời thoại|lời đọc|narrator|người dẫn|(cảnh|scene|nhịp|beat)\s*\d+)\b[^:]{0,20}:",
                re.I), "label"),
]


def read(path="SCRIPT.md"):
    # -> (sentences, respell): sentences are {"text", "tone", "pause"} with pause in seconds or None,
    # respell maps a term to its fallback spelling
    sentences, respell, problems, table = [], {}, [], False
    for n, line in enumerate(io.open(path, encoding="utf-8").read().split("\n"), 1):
        line = line.strip()
        m = RESPELL.match(line)
        if m:
            respell[m.group(1)] = m.group(2)
            continue
        table = table or line.startswith("|")
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
        problems += ["%s:%d: %s in %r" % (path, n, why, text) for rx, why in NOT_SPOKEN if rx.search(text)]
        if text:
            sentences.append({"text": text, "tone": m.group(1) if m else None, "pause": None})
    if table and not sentences:
        problems.append("%s: every sentence sits in a table" % path)
    if problems:
        raise SystemExit("\n".join(problems[:10]) + "\nnot a spoken script yet; normalize it first (SKILL.md step 2)")
    return sentences, respell


def respelled(text, respell):
    # longest term first, so "The Swarm" wins over "Swarm"
    for term in sorted(respell, key=len, reverse=True):
        text = re.sub(r"(?<!\w)%s(?!\w)" % re.escape(term), respell[term], text)
    return text


if __name__ == "__main__":
    import sys
    lines = read(sys.argv[1] if len(sys.argv) > 1 else "SCRIPT.md")[0]
    for i, s in enumerate(lines, 1):
        print("%2d %s%s" % (i, "[%s] " % s["tone"] if s["tone"] else "", s["text"]))
    print("%d sentences, %d syllables" % (len(lines), sum(len(s["text"].split()) for s in lines)))
