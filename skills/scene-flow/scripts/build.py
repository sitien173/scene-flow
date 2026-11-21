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
import struct
import subprocess
import unicodedata

THEME = json.load(io.open("meta.json", encoding="utf-8")).get("theme", "neon3d")
if THEME in ("dark", "paper", "world3d"):
    raise SystemExit("theme %s was removed; only neon3d, terra3d, toon3d, atlas3d and cleanui are supported" % THEME)
if THEME not in ("neon3d", "terra3d", "toon3d", "atlas3d", "cleanui"):
    raise SystemExit("unknown theme: " + THEME)

# ── PER-PROJECT ──────────────────────────────────────────────────────────────────────────
SC = [("terra" if THEME == "terra3d" else "toon", 0.00), ("cta", 17.50), ("ec", 24.20)] if THEME in ("terra3d", "toon3d") else \
     [("atlas", 0.00), ("cta", 17.50), ("ec", 24.20)] if THEME == "atlas3d" else \
     [("neon", 0.00), ("cta", 17.50), ("ec", 24.20)]   # scene id, cut (s)
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
if THEME in ("neon3d", "terra3d", "toon3d", "atlas3d"):
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


# neon3d, terra3d, toon3d and atlas3d: banned in vignette and kit code, so every frame is a function of seek time (comments included)
VIGNETTE_THEMES = ("neon3d", "terra3d", "toon3d", "atlas3d")
NEON_BANNED = [r"\brandom\b", r"\bDate\b", r"\bperformance\b", r"requestAnimationFrame", r"setAnimationLoop",
               r"setTimeout", r"setInterval", r"\bClock\b", r"\bTimer\b", r"getDelta", r"GlitchPass", r"FilmPass",
               r"\bfetch\b", r"XMLHttpRequest", r"WebSocket", r"\b(?:https?|wss?):"]
NEON_KINDS = ("cut", "fly", "flash")
FLY_DUR = 0.9
TERRA_KINDS = ("cut",)            # terra3d is hard cuts only
TERRA_MIN_LEN = 1.0               # s: a terra3d vignette shorter than this is a flicker, not a shot
TOON_SOUNDS = ("pop", "click", "laser")   # toon3d: the house sounds a vignettes.json sfx beat may name
AMBIENCE_GAINS = ("soft", "medium", "strong")   # categories; add-sfx.py owns their dB targets
# atlas3d: transitions between vignettes, vignette kinds, and the default pan length
ATLAS_KINDS = ("cut", "pan")
ATLAS_VIGNETTE_KINDS = ("map", "backdrop")
PAN_DUR = 1.0


def vignette_error(problem, detail):
    raise SystemExit("vignettes.json %s: %s" % (problem, detail))


def theme_sources(theme):
    """Vignette modules, model modules in vignettes/<model>/, and the theme kit."""
    files = []
    for top in ("vignettes", os.path.join("assets", theme)):
        for root, _, names in sorted(os.walk(top)):
            files += [os.path.join(root, f) for f in sorted(names) if f.endswith(".js")]
    return files


# glTF extensions whose decoders are not vendored; a GLB that declares one fails to load at render time
GLB_UNSUPPORTED = ("KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu")


def check_glbs():
    for top in ("vignettes", "assets"):
        for root, _, names in sorted(os.walk(top)):
            for name in sorted(names):
                if not name.lower().endswith(".glb"):
                    continue
                f = os.path.join(root, name)
                with open(f, "rb") as fh:
                    head = fh.read(20)
                    magic, _, _, size, kind = struct.unpack("<4sIIII", head) if len(head) == 20 else (b"", 0, 0, 0, 0)
                    if magic != b"glTF" or kind != 0x4E4F534A:
                        vignette_error("invalid GLB", "%s is not a binary glTF file" % f)
                    used = json.loads(fh.read(size).decode("utf-8")).get("extensionsUsed", [])
                bad = [e for e in used if e in GLB_UNSUPPORTED]
                if bad:
                    vignette_error("unsupported GLB compression", "%s uses %s; export it without Draco, meshopt, or KTX2"
                                   % (f, ", ".join(bad)))


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


def resolve_regions(data):
    rows = data.get("regions", [])
    if not isinstance(rows, list):
        vignette_error("invalid regions", "regions must be a list")
    codes = json.load(io.open(os.path.join("assets", "atlas3d", "map", "index.json"), encoding="utf-8"))
    seen = set()
    for k, r in enumerate(rows):
        if not isinstance(r, dict) or not isinstance(r.get("id"), str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", r["id"]):
            vignette_error("invalid region id", "region %d needs an id of lowercase letters, digits, - or _" % k)
        rid = r["id"]
        if rid in seen:
            vignette_error("duplicate region id", rid)
        seen.add(rid)
        if "label" in r and not isinstance(r["label"], str):
            vignette_error("invalid region", "%r label must be a string" % rid)
        if ("countries" in r) == ("polygon" in r):
            vignette_error("invalid region", "%r needs exactly one of countries or polygon" % rid)
        if "countries" in r:
            if not isinstance(r["countries"], list) or not r["countries"]:
                vignette_error("invalid region", "%r countries must be a non-empty list" % rid)
            for code in r["countries"]:
                if not isinstance(code, str) or code not in codes:
                    vignette_error("unknown country code", "%r: %r is not in assets/atlas3d/map/index.json" % (rid, code))
        else:
            poly = r["polygon"]
            if not isinstance(poly, list) or len(poly) < 3:
                vignette_error("invalid polygon", "%r needs at least 3 [lon, lat] points" % rid)
            for point in poly:
                if not isinstance(point, list) or len(point) != 2 or any(
                        isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n) for n in point):
                    vignette_error("invalid polygon", "%r points must be [lon, lat] pairs of numbers" % rid)
                if not -180 <= point[0] <= 180 or not -90 <= point[1] <= 90:
                    vignette_error("invalid polygon", "%r point %s is out of range" % (rid, point))
            if not isinstance(r.get("source"), str) or not r["source"].strip():
                vignette_error("missing source", "%r polygon needs a non-empty source" % rid)
    return rows


def resolve_vignettes(theme):
    atlas = theme == "atlas3d"
    kinds = ATLAS_KINDS if atlas else NEON_KINDS if theme == "neon3d" else TERRA_KINDS
    dur_low = 0.3 if atlas else 0.2
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
        if not isinstance(tr, dict) or tr.get("kind") not in kinds:
            vignette_error("invalid transition", "%r in.kind must be one of %s" % (vid, ", ".join(kinds)))
        if "dur" in tr and (isinstance(tr["dur"], bool) or not isinstance(tr["dur"], (int, float))
                            or not dur_low <= tr["dur"] <= 2.0):
            vignette_error("invalid transition", "%r in.dur must be between %s and 2.0 seconds" % (vid, dur_low))
        if tr["kind"] == "pan" and k == 0:
            vignette_error("invalid transition", "%r is the first vignette; a pan needs a map vignette before it" % vid)
        default = FLY_DUR if tr["kind"] == "fly" else PAN_DUR if tr["kind"] == "pan" else 0.3
        v["in"] = dict(tr, dur=float(tr.get("dur", default)))
        if atlas:
            vkind = v.get("kind", "map")
            if vkind not in ATLAS_VIGNETTE_KINDS:
                vignette_error("invalid kind", "%r kind must be map or backdrop" % vid)
            if vkind == "backdrop":
                image = v.get("image")
                if not isinstance(image, str) or not image or os.path.isabs(image) or ".." in image.split("/") \
                        or not os.path.isfile(image):
                    vignette_error("invalid backdrop", "%r image %r must be an existing file inside the project" % (vid, image))
            sfx = v.get("sfx", {})
            if not isinstance(sfx, dict):
                vignette_error("invalid sfx", "%r sfx must be an object of beat -> sound" % vid)
            for name, sound in sfx.items():
                if not isinstance(sound, str) or not re.fullmatch(r"[a-z0-9-]+", sound):
                    vignette_error("invalid sfx", "%r sfx %r: sound must match [a-z0-9-]+" % (vid, name))
                if name not in beats:
                    vignette_error("invalid sfx", "%r sfx %r names no beat of this vignette" % (vid, name))
        if theme == "toon3d":
            sfx = v.get("sfx", {})
            if not isinstance(sfx, dict):
                vignette_error("invalid sfx", "%r sfx must be an object of beat -> sound" % vid)
            for name, sound in sfx.items():
                if sound not in TOON_SOUNDS:
                    vignette_error("invalid sfx", "%r sfx %r: sound must be one of %s" % (vid, name, ", ".join(TOON_SOUNDS)))
                if name not in beats:
                    vignette_error("invalid sfx", "%r sfx %r names no beat of this vignette" % (vid, name))
        if not os.path.isfile(os.path.join("vignettes", vid + ".js")):
            vignette_error("missing vignette module", "%r: vignettes/%s.js" % (vid, vid))
        amb = v.get("ambience")
        if amb is not None:
            if not isinstance(amb, dict) or not isinstance(amb.get("file"), str) or amb.get("gain") not in AMBIENCE_GAINS:
                vignette_error("invalid ambience", "%r ambience must be {\"file\": a project path, \"gain\": %s}"
                               % (vid, " | ".join(AMBIENCE_GAINS)))
            f = os.path.normpath(amb["file"])
            if os.path.isabs(f) or f.startswith("..") or not os.path.isfile(f):
                vignette_error("missing ambience file", "%r: %r is not a file in the project" % (vid, amb["file"]))
            v["ambience"] = {"file": amb["file"], "gain": amb["gain"]}

    regions = resolve_regions(data) if atlas else []
    for f in theme_sources(theme):
        text = io.open(f, encoding="utf-8").read()
        for pat in NEON_BANNED:
            m = re.search(pat, text)
            if m:
                line = text.count("\n", 0, m.start()) + 1
                vignette_error("banned API", "%s:%d uses %r; frames must depend on seek time only" % (f, line, m.group(0)))
    check_glbs()

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
    return rows, regions


def check_vignettes(rows, cta, theme):
    quiet = None
    flashes = []
    for k, v in enumerate(rows):
        v["end"] = rows[k + 1]["t"] if k + 1 < len(rows) else cta
        if theme in ("terra3d", "toon3d") and v["end"] - v["t"] < TERRA_MIN_LEN:
            vignette_error("vignette too short", "%r lasts %.2fs; a %s vignette needs at least %.1fs"
                           % (v["id"], v["end"] - v["t"], theme, TERRA_MIN_LEN))
        for name, t in v["beats"].items():
            if not v["t"] <= t < v["end"]:
                vignette_error("beat outside its vignette", "%r beat %r at %.3f is outside %.2f-%.2f"
                               % (v["id"], name, t, v["t"], v["end"]))
        if not k:
            continue
        prev = rows[k - 1]
        kind = v["in"]["kind"]
        if kind == "pan":
            if v.get("kind", "map") != "map" or prev.get("kind", "map") != "map":
                vignette_error("pan with backdrop", "%r pans between %r and %r; pan needs two map vignettes"
                               % (v["id"], prev["id"], v["id"]))
            if v["in"]["dur"] > (v["end"] - v["t"]) * 0.6:
                vignette_error("pan too long", "%r pan of %.2fs exceeds 60%% of its vignette (%.2fs)"
                               % (v["id"], v["in"]["dur"], v["end"] - v["t"]))
        elif kind == "fly":
            if not re.search(r"\bportal\s*[:(]", io.open(os.path.join("vignettes", prev["id"] + ".js"), encoding="utf-8").read()):
                vignette_error("fly without portal", "%r flies out of %r, whose build returns no portal()" % (v["id"], prev["id"]))
            if v["in"]["dur"] > (v["t"] - prev["t"]) * 0.6:
                vignette_error("fly too long", "%r fly of %.2fs exceeds 60%% of %r (%.2fs)"
                               % (v["id"], v["in"]["dur"], prev["id"], v["t"] - prev["t"]))
        elif kind == "cut":
            if theme in ("terra3d", "toon3d"):  # terra3d and toon3d cuts are hard cuts on a visual beat, with no silence rule
                continue
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
    print("%s vignette table:" % theme)
    print("  vignette | %sin    | anchor                    | start | end" % ("kind  | " if theme == "atlas3d" else ""))
    for v in rows:
        a = v.get("anchor")
        where = "sentence %d: %s" % (a["sentence"], a["word"]) if a else "(film start)"
        kind = "%-5s | " % v.get("kind", "map") if theme == "atlas3d" else ""
        print("  %-8s | %s%-5s | %-25s | %5.2f | %5.2f" % (v["id"], kind, v["in"]["kind"], where[:25], v["t"], v["end"]))


VIGNETTES, REGIONS = resolve_vignettes(THEME) if THEME in VIGNETTE_THEMES else (None, [])
if THEME in VIGNETTE_THEMES:
    # these scripts have no spoken CTA line, so the card waits for the last spoken syllable
    spoken_end = max((x["e"] for x in syl), default=VO - 9.45)
    cta_start = round(max(17.50, VIGNETTES[-1]["t"] + 2.50, spoken_end + 0.30), 2)
    SC = [(SC[0][0], 0.00), ("cta", cta_start), ("ec", round(cta_start + 6.70, 2))]
    START = dict(SC)
    END = round(SC[-1][1] + EC_DUR, 2)
    NEXT = {sid: (SC[k + 1][1] if k + 1 < len(SC) else END) for k, (sid, _) in enumerate(SC)}
    DUR = {sid: round(NEXT[sid] - START[sid], 2) for sid in START}
    check_vignettes(VIGNETTES, cta_start, THEME)

# cleanui: a 2D flow with no vignettes. cues.json lists the scenes in order; each scene after the first opens on the
# recorded time of its anchor word, with its `in` kind. A beat is a named anchor word the timeline reads as @@t:name@@;
# it is named <scene>-<what> and must sit inside its scene. Beat sounds go to the ledger as cues (add-sfx.py).
# in kind -> seam: a chapter opener slides up, a slide goes left (blurred), a cut is hard (type "hard": visibility only).
CLEANUI_IN = {
    "open": {"kind": "slide", "axis": "y", "dir": -1, "exit": 0.36, "dur": 0.50, "swoosh": True, "blur": 0},
    "slide": {"kind": "slide", "axis": "x", "dir": -1, "exit": 0.34, "dur": 0.42, "swoosh": False, "blur": 8},
    "cut": {"kind": "hard", "axis": "x", "dir": -1, "swoosh": True, "blur": 0},
}
CLEANUI_SOUNDS = ("pop", "laser", "click")


def cues_error(problem, detail):
    raise SystemExit("cues.json %s: %s" % (problem, detail))


def resolve_cleanui():
    data = json.load(io.open("cues.json", encoding="utf-8"))
    rows = data.get("scenes") if isinstance(data, dict) else None
    if not isinstance(rows, list) or not rows:
        cues_error("invalid scenes", "scenes must be a non-empty list")
    scenes, kinds, last = [], {}, 0.0
    for k, row in enumerate(rows):
        sid = row.get("id") if isinstance(row, dict) else None
        if not isinstance(sid, str) or not re.fullmatch(r"[a-z][a-z0-9]*", sid) or sid == "ec" or sid in kinds:
            cues_error("invalid scene id", "entry %d: %r needs a unique id of lowercase letters or digits, not ec" % (k, sid))
        if k == 0:
            if "in" in row or "at" in row:
                cues_error("invalid first scene", "%r starts at 0; remove its in and at" % sid)
            t = 0.0
        else:
            if row.get("in") not in CLEANUI_IN:
                cues_error("invalid in", "%r in must be one of %s" % (sid, ", ".join(CLEANUI_IN)))
            if not isinstance(row.get("at"), dict):
                cues_error("invalid at", "%r needs at = {sentence, word}" % sid)
            t = anchor_time(row["at"], "scene %r" % sid, cues_error)
            if t <= last:
                cues_error("scenes not in order", "%r at %.2f is not after %.2f" % (sid, t, last))
            kinds[sid] = row["in"]
        kinds.setdefault(sid, "open")
        scenes.append((sid, t))
        last = t
    spoken_end = max((x["e"] for x in syl), default=VO - 9.45)
    ec = round(max(last + 2.50, spoken_end + 0.30), 2)   # the end card waits for the last spoken syllable
    ids = [sid for sid, _ in scenes]
    beats = {}
    for name, anchor in (data.get("beats") or {}).items():
        if not re.fullmatch(r"[a-z][a-z0-9]*-[a-z0-9-]*", name) or name.split("-")[0] not in ids:
            cues_error("invalid beat", "%r must be <scene>-<what>, with a scene id from scenes" % name)
        if not isinstance(anchor, dict):
            cues_error("invalid beat", "%r must be {sentence, word}" % name)
        t = anchor_time(anchor, "beat %r" % name, cues_error)
        i = ids.index(name.split("-")[0])
        end = scenes[i + 1][1] if i + 1 < len(scenes) else ec
        if not scenes[i][1] <= t < end:
            cues_error("beat outside its scene", "%r at %.3f is outside %s %.2f-%.2f" % (name, t, ids[i], scenes[i][1], end))
        beats[name] = t
    sfx = []
    for row in data.get("sfx", []):
        if not isinstance(row, dict) or row.get("beat") not in beats or row.get("sound") not in CLEANUI_SOUNDS:
            cues_error("invalid sfx", "each sfx needs beat (a beat name) and sound (one of %s)" % ", ".join(CLEANUI_SOUNDS))
        sfx.append({"t": beats[row["beat"]], "sound": row["sound"]})
    kinds["ec"] = "cut"
    return {"scenes": scenes + [("ec", ec)], "in": kinds, "beats": beats,
            "sfx": sorted(sfx, key=lambda c: (c["t"], c["sound"]))}


CLEANUI = resolve_cleanui() if THEME == "cleanui" else {}
if THEME == "cleanui":
    SC = CLEANUI["scenes"]
    START = dict(SC)
    END = round(SC[-1][1] + EC_DUR, 2)
    NEXT = {sid: (SC[k + 1][1] if k + 1 < len(SC) else END) for k, (sid, _) in enumerate(SC)}
    DUR = {sid: round(NEXT[sid] - START[sid], 2) for sid in START}


def cleanui_seams():
    """One ledger row per cut. Slides are seam-stamp `cut` rows (x or y, dir -1) with a swoosh only on chapter
    openers; hard cuts are type "hard" rows with visibility only. Blurred slides also go to timeline.js."""
    seams, slides = [], []
    for k in range(1, len(SC)):
        a, b = SC[k - 1][0], SC[k][0]
        spec = CLEANUI_IN[CLEANUI["in"][b]]
        hard = spec["kind"] == "hard"
        exit_side = {"selector": "#w-" + a, "axis": spec["axis"], "dir": spec["dir"]}
        entry_side = {"selector": "#w-" + b, "axis": spec["axis"], "dir": spec["dir"]}
        row = {"id": "%s->%s" % (a, b), "cut": SC[k][1], "swoosh": spec["swoosh"],
               "technique": "hard cut" if hard else ("chapter slide up" if spec["axis"] == "y" else "slide left")}
        if hard:
            row["type"] = "hard"
        else:
            exit_side["dur"], entry_side["dur"] = spec["exit"], spec["dur"]
            if spec["blur"]:
                slides.append({"exit": exit_side["selector"], "entry": entry_side["selector"], "cut": SC[k][1],
                               "exDur": spec["exit"], "enDur": spec["dur"], "blur": spec["blur"]})
        row["exit"], row["entry"] = exit_side, entry_side
        seams.append(row)
    return seams, slides


if THEME == "cleanui":
    CLEANUI_SEAMS, CLEANUI_SLIDES = cleanui_seams()

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
if THEME in VIGNETTE_THEMES:
    assert html.count("@@vignettes@@") == 1
    vignette_data = [{"id": v["id"], "t": v["t"], "end": v["end"], "in": v["in"], "beats": v["beats"]} for v in VIGNETTES]
    if THEME == "atlas3d":
        vignette_data = [dict(d, kind=v.get("kind", "map"), image=v.get("image"), sfx=v.get("sfx", {}))
                         for d, v in zip(vignette_data, VIGNETTES)]
        assert html.count("@@regions@@") == 1
        html = html.replace("@@regions@@", json.dumps(REGIONS, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c"), 1)
    html = html.replace("@@vignettes@@", json.dumps(vignette_data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c"), 1)
for sid in START:
    html = html.replace("@@start:%s@@" % sid, "%.2f" % START[sid])
    html = html.replace("@@dur:%s@@" % sid, "%.2f" % DUR[sid])
html = html.replace("@@vo@@", "%.2f" % VO).replace("@@end@@", "%.2f" % END)
if THEME == "cleanui":
    for name, t in CLEANUI["beats"].items():
        html = html.replace("@@t:%s@@" % name, "%.3f" % t)
    assert html.count("@@slides@@") == 1
    html = html.replace("@@slides@@", json.dumps(CLEANUI_SLIDES, separators=(",", ":")))
assert "@@" not in html, "unfilled token: " + html[html.index("@@") - 40: html.index("@@") + 40]
assert "<!-- @" not in html and "/* @" not in html, "unfilled placeholder"
io.open("index.html", "w", encoding="utf-8").write(html)

# the seam ledger: every cut is a Z blur push, except cleanui's slides and hard cuts (cleanui_seams)
seams = []
if THEME == "cleanui":
    seams = CLEANUI_SEAMS
else:
    for k in range(1, len(SC)):
        a, b = SC[k - 1][0], SC[k][0]
        seams.append({"id": "%s->%s" % (a, b), "cut": SC[k][1], "technique": "blur push", "blur": 10,
                      "exit": {"selector": "#w-" + a, "axis": "z", "dir": 1},
                      "entry": {"selector": "#w-" + b, "axis": "z", "dir": 1}})
ledger = {"fps": 30, "seams": seams}
if THEME == "cleanui":  # add-sfx.py reads these: each beat sound, at its recorded time
    ledger["cues"] = CLEANUI["sfx"]
if THEME in VIGNETTE_THEMES:  # vignette transitions live inside the theme's 3D scene: not HyperFrames seams, no sound cue
    ledger["vignettes"] = [{k: v[k] for k in ("id", "t", "end", "in", "ambience") if k in v} for v in VIGNETTES]
if THEME in ("terra3d", "toon3d"):  # add-sfx.py reads this: terra3d and toon3d have no sound on cuts, so no swoosh on their seams
    ledger["theme"] = THEME
if THEME == "atlas3d":  # add-sfx.py reads these cues: each pan whooshes, each vignette sfx beat plays its sound
    ledger["vignettes"] = [dict(row, kind=v.get("kind", "map")) for row, v in zip(ledger["vignettes"], VIGNETTES)]
    cues = [{"t": v["t"], "sound": "swoosh"} for v in VIGNETTES if v["in"]["kind"] == "pan"]
    cues += [{"t": v["beats"][name], "sound": sound} for v in VIGNETTES for name, sound in v.get("sfx", {}).items()]
    ledger["cues"] = sorted(cues, key=lambda c: (c["t"], c["sound"]))
if THEME == "toon3d":  # add-sfx.py reads these cues: each vignettes.json sfx beat plays its sound at the beat
    cues = [{"t": v["beats"][name], "sound": sound} for v in VIGNETTES for name, sound in v.get("sfx", {}).items()]
    ledger["cues"] = sorted(cues, key=lambda c: (c["t"], c["sound"]))
io.open("ledger.json", "w", encoding="utf-8").write(json.dumps(ledger, ensure_ascii=False, indent=1))
print("index.html: %d scenes, %.2fs (voice %.2fs); ledger: %d seams" % (len(SC), END, VO, len(seams)))
