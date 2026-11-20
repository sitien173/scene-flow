# Assemble index.html from parts/ and write ledger.json.
#
# Only for the first build, before the author opens Studio: Studio re-serialises index.html on load,
# after which an author's edits in Studio are patched with scripts/edit_helpers.py, not rebuilt over.
# (A file that differs from a fresh build only in serialisation — data-hf-id, &#160; — holds no edits
# and may be rebuilt.)
#
# One table owns the scene cuts; every scene's data-start/data-duration, the seam ledger (and so every
# swoosh) and the end-card clock derive from it. Times are RECORDED seconds (syl-times.json); every cut
# sits in a silence of the recording (scripts/silences.py: 20 ms RMS < -45 dB).
import io
import json
import math
import os
import re
import subprocess
import unicodedata

THEME = json.load(io.open("meta.json", encoding="utf-8")).get("theme", "neon3d")
if THEME in ("dark", "paper", "world3d"):
    raise SystemExit("theme %s was removed; only neon3d is supported" % THEME)
if THEME != "neon3d":
    raise SystemExit("unknown theme: " + THEME)

# ── PER-PROJECT ──────────────────────────────────────────────────────────────────────────
SC = [("neon", 0.00), ("cta", 17.50), ("ec", 24.20)]   # scene id, cut (s)
EC_DUR = 2.75                     # the house end card at 2x (5.5 s -> 2.75 s)
STEPS = ["i-laptopdl", "i-code", "i-send"]       # the step tracker's icons (sprite ids); [] for none
CTA_WORD = "VIDEO"                # typed into the comment box on its word
BRAND_NAME = "Soi Repo"
BRAND_LOGO = "assets/logos/soi-repo-mark.svg"
SLOGAN = "Slogan của bạn"         # the end card's line (the author's: "AI Agent Agency Việt Nam")
PARTS = ["head.part", "scenes.part", "script.js"]
# ──────────────────────────────────────────────────────────────────────────────────────────

START = dict(SC)
END = round(SC[-1][1] + EC_DUR, 2)
NEXT = {sid: (SC[k + 1][1] if k + 1 < len(SC) else END) for k, (sid, _) in enumerate(SC)}
DUR = {sid: round(NEXT[sid] - START[sid], 2) for sid in START}


def probe(path):
    try:
        return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                                    capture_output=True, text=True).stdout.strip())
    except ValueError:
        return None


VO = probe("assets/audio/voiceover.mp3")
assert VO, "assets/audio/voiceover.mp3 missing — run scripts/prep-voice.py first"
if THEME == "neon3d":
    SC = [(SC[0][0], 0.00), ("cta", round(VO, 2)), ("ec", round(VO + 6.70, 2))]
    START = dict(SC)
    END = round(SC[-1][1] + EC_DUR, 2)
    NEXT = {sid: (SC[k + 1][1] if k + 1 < len(SC) else END) for k, (sid, _) in enumerate(SC)}
    DUR = {sid: round(NEXT[sid] - START[sid], 2) for sid in START}
TITLE = json.load(io.open("meta.json", encoding="utf-8")).get("name", "Video")


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def path_of(f):
    """The d of a brand file's single path — read from the file, never retyped."""
    txt = io.open(f, encoding="utf-8").read().strip()
    m = re.search(r'\bd="([^"]+)"', txt)
    return m.group(1) if m else txt


# the step tracker: 112 px tiles, 40 px apart, centred; top 92 -> centres (TK_X + 56, 148)
TK_X = [round((1080 - (len(STEPS) * 112 + (len(STEPS) - 1) * 40)) / 2) + k * 152 for k in range(len(STEPS))]
syl = json.load(io.open("syl-times.json", encoding="utf-8")) if os.path.exists("syl-times.json") else []


def normalized_syllable(value):
    value = unicodedata.normalize("NFC", value).casefold().strip()
    while value and unicodedata.category(value[0]).startswith("P"):
        value = value[1:].strip()
    while value and unicodedata.category(value[-1]).startswith("P"):
        value = value[:-1].strip()
    return value


def anchor_time(anchor, who, fail):
    """Recorded start (s) of an anchor's word in syl-times.json; fail(problem, detail) when it is missing."""
    sentence = anchor["sentence"]
    entries = [entry for entry in syl if entry.get("i") == sentence]
    wanted = [token for token in (normalized_syllable(word) for word in anchor["word"].split()) if token]
    if not wanted:
        fail("anchor has no syllables", "%s sentence %d word %r normalizes to no syllables"
             % (who, sentence, anchor["word"]))
    normalized_entries = [(entry, normalized_syllable(str(entry.get("syl", "")))) for entry in entries]
    normalized_entries = [(entry, token) for entry, token in normalized_entries if token]
    syllables = [token for _, token in normalized_entries]
    found = next((i for i in range(len(syllables) - len(wanted) + 1)
                  if wanted and syllables[i:i + len(wanted)] == wanted), None)
    if found is None:
        fail("anchor not found", "%s sentence %d word %r; searched sentence text: %r"
             % (who, sentence, anchor["word"],
                " ".join(str(entry.get("syl", "")) for entry in entries) or "<no syllable timings>"))
    time = normalized_entries[found][0].get("s")
    if isinstance(time, bool) or not isinstance(time, (int, float)) or not math.isfinite(time):
        fail("invalid anchor time", "%s has no finite start in syl-times.json" % who)
    return float(time)


# neon3d: banned in vignette and kit code, so every frame is a function of seek time (comments included)
NEON_BANNED = [r"\brandom\b", r"\bDate\b", r"\bperformance\b", r"requestAnimationFrame", r"setAnimationLoop",
               r"setTimeout", r"setInterval", r"\bClock\b", r"\bTimer\b", r"getDelta", r"GlitchPass", r"FilmPass",
               r"\bfetch\b", r"XMLHttpRequest", r"WebSocket", r"\b(?:https?|wss?):"]
NEON_KINDS = ("cut", "fly", "flash")
FLY_DUR = 0.9


def vignette_error(problem, detail):
    raise SystemExit("vignettes.json %s: %s" % (problem, detail))


def neon_sources():
    files = [os.path.join("vignettes", f) for f in sorted(os.listdir("vignettes")) if f.endswith(".js")] \
        if os.path.isdir("vignettes") else []
    for root, _, names in sorted(os.walk(os.path.join("assets", "neon3d"))):
        files += [os.path.join(root, f) for f in sorted(names) if f.endswith(".js")]
    return files


def quiet_windows():
    """20 ms windows of the voice below -45 dBFS (scripts/silences.py's rule)."""
    import array
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "assets/audio/voiceover.mp3", "-ac", "1", "-ar", "16000",
                          "-f", "s16le", "-"], capture_output=True, check=True).stdout
    x = array.array("h", raw[: len(raw) // 2 * 2])
    out = []
    for k in range(len(x) // 320):
        w = x[k * 320:(k + 1) * 320]
        out.append(20 * math.log10(math.sqrt(sum(v * v for v in w) / 320.0) / 32768.0 + 1e-12) < -45.0)
    return out


def resolve_vignettes():
    try:
        data = json.load(io.open("vignettes.json", encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        vignette_error("load failed", str(exc))
    rows = data.get("vignettes") if isinstance(data, dict) else None
    if not isinstance(rows, list) or not rows:
        vignette_error("invalid schema", "vignettes must be a non-empty list")
    seen = set()
    for k, v in enumerate(rows):
        if not isinstance(v, dict) or not isinstance(v.get("id"), str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", v["id"]):
            vignette_error("invalid id", "entry %d needs an id of lowercase letters, digits, - or _" % k)
        vid = v["id"]
        if vid in seen:
            vignette_error("duplicate vignette id", vid)
        seen.add(vid)
        anchors = [("anchor", v.get("anchor"))] if k else []
        if k == 0 and "anchor" in v:
            vignette_error("invalid anchor", "%r is the first vignette, which starts at 0; remove its anchor" % vid)
        beats = v.get("beats", {})
        if not isinstance(beats, dict):
            vignette_error("invalid beats", "%r beats must be an object of name -> anchor" % vid)
        anchors += [("beat %r" % name, a) for name, a in beats.items()]
        for what, a in anchors:
            if not isinstance(a, dict) or isinstance(a.get("sentence"), bool) or not isinstance(a.get("sentence"), int) \
                    or a["sentence"] < 1 or not isinstance(a.get("word"), str) or not a["word"].strip():
                vignette_error("invalid anchor", "%r %s needs a positive sentence and a word" % (vid, what))
        tr = v.get("in", {"kind": "cut"})
        if not isinstance(tr, dict) or tr.get("kind") not in NEON_KINDS:
            vignette_error("invalid transition", "%r in.kind must be one of %s" % (vid, ", ".join(NEON_KINDS)))
        if "dur" in tr and (isinstance(tr["dur"], bool) or not isinstance(tr["dur"], (int, float))
                            or not 0.2 <= tr["dur"] <= 2.0):
            vignette_error("invalid transition", "%r in.dur must be between 0.2 and 2.0 seconds" % vid)
        v["in"] = dict(tr, dur=float(tr.get("dur", FLY_DUR if tr["kind"] == "fly" else 0.3)))
        if not os.path.isfile(os.path.join("vignettes", vid + ".js")):
            vignette_error("missing vignette module", "%r: vignettes/%s.js" % (vid, vid))

    for f in neon_sources():
        text = io.open(f, encoding="utf-8").read()
        for pat in NEON_BANNED:
            m = re.search(pat, text)
            if m:
                line = text.count("\n", 0, m.start()) + 1
                vignette_error("banned API", "%s:%d uses %r; frames must depend on seek time only" % (f, line, m.group(0)))

    def fail(problem, detail):
        vignette_error(problem, detail)

    previous = None
    for k, v in enumerate(rows):
        v["t"] = anchor_time(v["anchor"], "vignette %r" % v["id"], fail) if k else 0.0
        if previous is not None and v["t"] <= previous:
            vignette_error("anchors not strictly increasing in time", "%r at %.3f is not after %.3f" % (v["id"], v["t"], previous))
        if v["t"] >= START["cta"]:
            vignette_error("anchor at or after cta scene start", "%r resolves to %.3f; cta starts at %.2f"
                           % (v["id"], v["t"], START["cta"]))
        v["beats"] = {name: anchor_time(a, "vignette %r beat %r" % (v["id"], name), fail) for name, a in v.get("beats", {}).items()}
        previous = v["t"]
    return rows


def check_vignettes(rows, cta):
    quiet = None
    flashes = []
    for k, v in enumerate(rows):
        v["end"] = rows[k + 1]["t"] if k + 1 < len(rows) else cta
        for name, t in v["beats"].items():
            if not v["t"] <= t < v["end"]:
                vignette_error("beat outside its vignette", "%r beat %r at %.3f is outside %.2f-%.2f"
                               % (v["id"], name, t, v["t"], v["end"]))
        if not k:
            continue
        prev = rows[k - 1]
        kind = v["in"]["kind"]
        if kind == "fly":
            if not re.search(r"\bportal\s*[:(]", io.open(os.path.join("vignettes", prev["id"] + ".js"), encoding="utf-8").read()):
                vignette_error("fly without portal", "%r flies out of %r, whose build returns no portal()" % (v["id"], prev["id"]))
            if v["in"]["dur"] > (v["t"] - prev["t"]) * 0.6:
                vignette_error("fly too long", "%r fly of %.2fs exceeds 60%% of %r (%.2fs)"
                               % (v["id"], v["in"]["dur"], prev["id"], v["t"] - prev["t"]))
        elif kind == "cut":
            if quiet is None:
                quiet = quiet_windows()
            lo, hi = max(0, int((v["t"] - 0.4) / 0.02)), int(v["t"] / 0.02)
            if not any(quiet[lo:hi + 1]):
                vignette_error("cut outside silence", "%r: no quiet 20 ms window in the 0.4 s before %.2f; "
                               "move the anchor or use another transition" % (v["id"], v["t"]))
        else:
            flashes.append((v["t"], v["id"]))
    for k in range(len(flashes) - 3):
        if flashes[k + 3][0] - flashes[k][0] < 1.0:
            vignette_error("too many flashes", "%r: more than 3 flash transitions within 1 s (WCAG 2.3.1)" % flashes[k + 3][1])
    print("neon3d vignette table:")
    print("  vignette | in    | anchor                    | start | end")
    for v in rows:
        a = v.get("anchor")
        where = "sentence %d: %s" % (a["sentence"], a["word"]) if a else "(film start)"
        print("  %-8s | %-5s | %-25s | %5.2f | %5.2f" % (v["id"], v["in"]["kind"], where[:25], v["t"], v["end"]))


VIGNETTES = resolve_vignettes() if THEME == "neon3d" else None
if THEME == "neon3d":
    # the neon3d script has no spoken CTA line, so the card waits for the last spoken syllable
    spoken_end = max((x["e"] for x in syl), default=VO - 9.45)
    cta_start = round(max(17.50, VIGNETTES[-1]["t"] + 2.50, spoken_end + 0.30), 2)
    SC = [("neon", 0.00), ("cta", cta_start), ("ec", round(cta_start + 6.70, 2))]
    START = dict(SC)
    END = round(SC[-1][1] + EC_DUR, 2)
    NEXT = {sid: (SC[k + 1][1] if k + 1 < len(SC) else END) for k, (sid, _) in enumerate(SC)}
    DUR = {sid: round(NEXT[sid] - START[sid], 2) for sid in START}
    check_vignettes(VIGNETTES, cta_start)

html = "".join(io.open("parts/" + f, encoding="utf-8").read() for f in PARTS)
ff = io.open("parts/fontfaces.txt", encoding="utf-8").read().rstrip("\n")
assert html.count("      /* @fontfaces */") == 1
html = html.replace("      /* @fontfaces */", ff, 1)
for ph, f in (("      /* @theme */", "parts/theme.css"), ("      <!-- @stage -->", "parts/stage.part"),
              ("      /* @timeline */", "parts/timeline.js")):
    assert html.count(ph) == 1, ph
    html = html.replace(ph, io.open(f, encoding="utf-8").read().rstrip("\n"), 1)
for name, f in (("openai", "assets/logos/openai-path.txt"), ("claude", "assets/logos/claude.svg"),
                ("github", "assets/logos/github-mark.svg")):
    html = html.replace("@@path:%s@@" % name, path_of(f))
blocks = {"@@title@@": esc(TITLE), "@@brand@@": esc(BRAND_NAME), "@@slogan@@": esc(SLOGAN), "@@logo@@": BRAND_LOGO}
for tok, val in blocks.items():
    html = html.replace(tok, val)
html = html.replace("/* @geo */", "var GEO = %s;" % json.dumps({"tk": TK_X, "cta": len(CTA_WORD)}), 1)
if THEME == "neon3d":
    assert html.count("@@vignettes@@") == 1
    vignette_data = [{"id": v["id"], "t": v["t"], "end": v["end"], "in": v["in"], "beats": v["beats"]} for v in VIGNETTES]
    html = html.replace("@@vignettes@@", json.dumps(vignette_data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c"), 1)
for sid in START:
    html = html.replace("@@start:%s@@" % sid, "%.2f" % START[sid])
    html = html.replace("@@dur:%s@@" % sid, "%.2f" % DUR[sid])
html = html.replace("@@vo@@", "%.2f" % VO).replace("@@end@@", "%.2f" % END)
assert "@@" not in html, "unfilled token: " + html[html.index("@@") - 40: html.index("@@") + 40]
assert "<!-- @" not in html and "/* @" not in html, "unfilled placeholder"
io.open("index.html", "w", encoding="utf-8").write(html)

# the seam ledger: every cut is a Z blur push
seams = []
for k in range(1, len(SC)):
    a, b = SC[k - 1][0], SC[k][0]
    seams.append({"id": "%s->%s" % (a, b), "cut": SC[k][1], "technique": "blur push", "blur": 10,
                  "exit": {"selector": "#w-" + a, "axis": "z", "dir": 1},
                  "entry": {"selector": "#w-" + b, "axis": "z", "dir": 1}})
ledger = {"fps": 30, "seams": seams}
if THEME == "neon3d":  # vignette transitions live inside the neon scene: not HyperFrames seams, no sound cue
    ledger["vignettes"] = [{"id": v["id"], "t": v["t"], "end": v["end"], "in": v["in"]} for v in VIGNETTES]
io.open("ledger.json", "w", encoding="utf-8").write(json.dumps(ledger, ensure_ascii=False, indent=1))
print("index.html: %d scenes, %.2fs (voice %.2fs); ledger: %d seams" % (len(SC), END, VO, len(seams)))
