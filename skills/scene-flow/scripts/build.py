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
import random
import re
import subprocess
import unicodedata

THEME = json.load(io.open("meta.json", encoding="utf-8")).get("theme", "paper")
if THEME not in ("dark", "paper", "world3d", "neon3d", "terra3d"):
    raise SystemExit("unknown theme: " + THEME)

# ── PER-PROJECT ──────────────────────────────────────────────────────────────────────────
SC = [("world", 0.00), ("cta", 17.50), ("ec", 24.20)] if THEME == "world3d" else \
     [("neon", 0.00), ("cta", 17.50), ("ec", 24.20)] if THEME == "neon3d" else \
     [("terra", 0.00), ("cta", 17.50), ("ec", 24.20)] if THEME == "terra3d" else \
     [("h1", 0.00), ("s1", 4.60), ("p1", 9.90), ("cta", 17.50), ("ec", 24.20)]   # scene id, cut (s)
EC_DUR = 2.75                     # the house end card at 2x (5.5 s -> 2.75 s)
CHAPTERS = {"s1"}                 # cuts INTO these climb (UP); every other cut slides LEFT
STEPS = ["i-laptopdl", "i-code", "i-send"]       # the step tracker's icons (sprite ids); [] for none
PROMPTS = {} if THEME in ("world3d", "neon3d", "terra3d") else {4: "p1"}  # SCRIPT.md sentence -> prompt card id; its words light as they are said
CTA_WORD = "VIDEO"                # typed into the comment box on its word
BRAND_NAME = "Soi Repo"
BRAND_LOGO = "assets/logos/soi-repo-mark.svg" if THEME in ("dark", "world3d", "neon3d", "terra3d") else "assets/logos/brand-logo.svg"
SLOGAN = "Slogan của bạn"         # the end card's line (the author's: "AI Agent Agency Việt Nam")
PARTICLE_SEED = 2402
PARTICLE_COUNT = 28
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
if THEME in ("world3d", "neon3d", "terra3d"):
    SC = [(SC[0][0], 0.00), ("cta", round(VO, 2)), ("ec", round(VO + 6.70, 2))]
    START = dict(SC)
    END = round(SC[-1][1] + EC_DUR, 2)
    NEXT = {sid: (SC[k + 1][1] if k + 1 < len(SC) else END) for k, (sid, _) in enumerate(SC)}
    DUR = {sid: round(NEXT[sid] - START[sid], 2) for sid in START}
BG = probe("assets/video/paper-bg.mp4") if THEME == "paper" else None
if BG and BG < END:
    print("  WARNING: paper-bg.mp4 is %.1fs, the film %.1fs — extend it (see 'Paper background loop' in https://github.com/sitien173/scene-flow#readme)" % (BG, END))
TITLE = json.load(io.open("meta.json", encoding="utf-8")).get("name", "Video")


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def path_of(f):
    """The d of a brand file's single path — read from the file, never retyped."""
    txt = io.open(f, encoding="utf-8").read().strip()
    m = re.search(r'\bd="([^"]+)"', txt)
    return m.group(1) if m else txt


def particle_markup():
    rng = random.Random(PARTICLE_SEED)
    out = []
    for k in range(PARTICLE_COUNT):
        x, y = rng.uniform(2, 98), rng.uniform(180, 1870)
        size, dx, dy = rng.choice((3, 4, 5, 6)), rng.randint(-40, 40), rng.randint(-80, 80)
        opacity = rng.uniform(0.12, 0.34)
        mint = " mint" if k % 4 == 0 else ""
        out.append('<i class="particle%s" data-dx="%d" data-dy="%d" style="left:%.2f%%; top:%.1fpx; width:%dpx; height:%dpx; opacity:%.2f;"></i>'
                   % (mint, dx, dy, x, y, size, size, opacity))
    return "\n        ".join(out)


# the step tracker: 112 px tiles, 40 px apart, centred; top 92 -> centres (TK_X + 56, 148)
TK_X = [round((1080 - (len(STEPS) * 112 + (len(STEPS) - 1) * 40)) / 2) + k * 152 for k in range(len(STEPS))]


def trk():
    out = []
    for k, ic in enumerate(STEPS):
        out.append('<div class="tk" id="tk%d" style="left:%dpx;"><svg class="ic" viewBox="0 0 24 24"><use href="#%s" /></svg>'
                   '<span class="tn">%d</span><i class="tr" id="tk%d-r"></i>'
                   '<div class="dn" id="tk%d-dn"><svg class="ic" viewBox="0 0 24 24"><use href="#i-check" /></svg></div></div>'
                   % (k, TK_X[k], ic, k + 1, k, k))
    return "\n        ".join(out)


def typed(prefix, text):
    return "".join('<span class="ch" id="%s%d">%s</span>' % (prefix, k, "&nbsp;" if c == " " else esc(c))
                   for k, c in enumerate(text))


# the prompts: each word lights as it is said (syl-times.json)
syl = json.load(io.open("syl-times.json", encoding="utf-8")) if os.path.exists("syl-times.json") else []
p_html, p_js = {}, []
for sent, pre in PROMPTS.items():
    words = [x for x in syl if x["i"] == sent]
    if not words:
        print("  WARNING: no syllable times for prompt sentence %d (run the alignment chain)" % sent)
    p_html[sent] = " ".join('<span class="w" id="%s-%d">%s</span>' % (pre, k, esc(w["syl"])) for k, w in enumerate(words))
    for k, w in enumerate(words):
        p_js.append('      tl.to("#%s-%d", { opacity: 1, duration: 0.14, ease: "none" }, %.2f);' % (pre, k, max(0.0, w["s"] - 0.04)))


def world_error(problem, detail):
    raise SystemExit("world.json %s: %s" % (problem, detail))


def world_vector(value, where):
    if not isinstance(value, list) or len(value) != 3 or any(
            isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n) for n in value):
        world_error("invalid vector", "%s must be three finite numbers" % where)


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


def resolve_world():
    try:
        world = json.load(io.open("world.json", encoding="utf-8"))
        kit = json.load(io.open("assets/world3d/kit.json", encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        world_error("load failed", str(exc))
    if not isinstance(world, dict):
        world_error("invalid schema", "root must be an object")
    if not isinstance(kit, list) or any(not isinstance(piece, dict) or not isinstance(piece.get("name"), str)
                                        for piece in kit):
        world_error("invalid kit manifest", "assets/world3d/kit.json must be a list of named pieces")
    kit_names = [piece["name"] for piece in kit]
    if len(kit_names) != len(set(kit_names)):
        duplicate = next(name for index, name in enumerate(kit_names) if name in kit_names[:index])
        world_error("duplicate kit piece name", repr(duplicate))
    kit_set = set(kit_names)
    piece_by_name = {piece["name"]: piece for piece in kit}
    for piece in kit:
        if piece.get("type") == "glb":
            if not isinstance(piece.get("file"), str) or not piece["file"].endswith(".glb"):
                world_error("invalid GLB kit entry", "%r needs a .glb file" % piece["name"])
            model_path = os.path.join("assets", "world3d", "models", piece["file"])
            if not os.path.isfile(model_path):
                world_error("missing GLB model", "%r: %s" % (piece["name"], model_path))
            if isinstance(piece.get("scale"), bool) or not isinstance(piece.get("scale"), (int, float)) \
                    or not math.isfinite(piece["scale"]) or piece["scale"] <= 0:
                world_error("invalid GLB kit entry", "%r scale must be positive and finite" % piece["name"])
            world_vector(piece.get("rot"), "kit piece %r rot" % piece["name"])
            world_vector(piece.get("offset"), "kit piece %r offset" % piece["name"])
            if "clips" in piece and (not isinstance(piece["clips"], list)
                                      or any(not isinstance(clip, str) for clip in piece["clips"])):
                world_error("invalid GLB kit entry", "%r clips must be a list of names" % piece["name"])
        elif piece.get("type") != "code":
            world_error("invalid kit type", "%r type must be 'code' or 'glb'" % piece["name"])

    objects = world.get("objects")
    paths = world.get("paths")
    stops = world.get("stops")
    if not isinstance(objects, list):
        world_error("invalid schema", "objects must be a list")
    if not isinstance(paths, list):
        world_error("invalid schema", "paths must be a list")
    if not isinstance(stops, list) or not stops:
        world_error("invalid schema", "stops must be a non-empty list")

    def indexed(rows, kind):
        out = {}
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get("id"), str) or not row["id"].strip():
                world_error("invalid schema", "%s entries need a non-empty id" % kind)
            if row["id"] in out:
                world_error("duplicate %s id" % kind, row["id"])
            out[row["id"]] = row
        return out

    object_by_id = indexed(objects, "object")
    path_by_id = indexed(paths, "path")
    indexed(stops, "stop")

    for obj in objects:
        if not isinstance(obj.get("kit"), str) or obj["kit"] not in kit_set:
            world_error("unknown kit name", "%r; valid names: %s" % (obj.get("kit"), ", ".join(kit_names)))
        world_vector(obj.get("pos"), "object %r pos" % obj["id"])
        if "rot" in obj:
            world_vector(obj["rot"], "object %r rot" % obj["id"])
        if "scale" in obj and (isinstance(obj["scale"], bool) or not isinstance(obj["scale"], (int, float))
                                or not math.isfinite(obj["scale"]) or obj["scale"] <= 0):
            world_error("invalid scale", "object %r scale must be a positive finite number" % obj["id"])
        if "color" in obj and (not isinstance(obj["color"], str)
                               or not re.fullmatch(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})", obj["color"])):
            world_error("invalid color", "object %r color must be a hex color" % obj["id"])
        if "animation" in obj:
            piece = piece_by_name[obj["kit"]]
            if not isinstance(obj["animation"], str) or obj["animation"] not in (piece.get("clips") or []):
                world_error("invalid animation", "object %r animation %r is not listed for kit piece %r"
                            % (obj["id"], obj["animation"], obj["kit"]))

    for path in paths:
        points = path.get("points")
        if not isinstance(points, list) or len(points) < 2:
            world_error("invalid path", "path %r needs at least two points" % path["id"])
        for i, point in enumerate(points):
            world_vector(point, "path %r point %d" % (path["id"], i))

    for stop in stops:
        anchor = stop.get("anchor")
        camera = stop.get("camera")
        if not isinstance(anchor, dict) or isinstance(anchor.get("sentence"), bool) \
                or not isinstance(anchor.get("sentence"), int) or anchor["sentence"] < 1 \
                or not isinstance(anchor.get("word"), str) or not anchor["word"].strip():
            world_error("invalid anchor", "stop %r needs a positive sentence and word" % stop["id"])
        if not isinstance(camera, dict):
            world_error("invalid camera", "stop %r needs camera pos and look" % stop["id"])
        world_vector(camera.get("pos"), "stop %r camera pos" % stop["id"])
        world_vector(camera.get("look"), "stop %r camera look" % stop["id"])
        if "fov" in camera and (isinstance(camera["fov"], bool)
                                 or not isinstance(camera["fov"], (int, float))
                                 or not math.isfinite(camera["fov"]) or not 0 < camera["fov"] < 180):
            world_error("invalid camera fov", "stop %r fov must be between 0 and 180 degrees" % stop["id"])

        label = stop.get("label")
        if label is not None:
            if not isinstance(label, dict) or not isinstance(label.get("text"), str) or not label["text"].strip():
                world_error("invalid label", "stop %r needs non-empty label text" % stop["id"])
            if len(label["text"].split()) > 2:
                world_error("label text longer than two words", "stop %r: %r" % (stop["id"], label["text"]))
            at = label.get("at")
            if isinstance(at, str):
                if at not in object_by_id:
                    world_error("unknown object id", "label on stop %r refers to %r" % (stop["id"], at))
            else:
                world_vector(at, "stop %r label at" % stop["id"])

        actions = stop.get("actions", [])
        if not isinstance(actions, list):
            world_error("invalid actions", "stop %r actions must be a list" % stop["id"])
        for action in actions:
            if not isinstance(action, dict):
                world_error("invalid action", "stop %r action must be an object" % stop["id"])
            if action.get("type") == "send":
                if not isinstance(action.get("path"), str) or action["path"] not in path_by_id:
                    world_error("unknown path id", "send action on stop %r refers to %r" % (stop["id"], action.get("path")))
                if not isinstance(action.get("kit"), str) or action["kit"] not in kit_set:
                    world_error("unknown kit name", "%r; valid names: %s" % (action.get("kit"), ", ".join(kit_names)))
                count, duration = action.get("count"), action.get("duration")
                if isinstance(count, bool) or not isinstance(count, int) or count < 1:
                    world_error("invalid send count", "stop %r count must be a positive integer" % stop["id"])
                if isinstance(duration, bool) or not isinstance(duration, (int, float)) \
                        or not math.isfinite(duration) or duration <= 0:
                    world_error("invalid send duration", "stop %r duration must be positive and finite" % stop["id"])
            elif action.get("type") == "tokens":
                if not isinstance(action.get("at"), str) or action["at"] not in object_by_id:
                    world_error("unknown object id", "tokens action on stop %r refers to %r" % (stop["id"], action.get("at")))
                if not isinstance(action.get("text"), list) or not action["text"] \
                        or any(not isinstance(word, str) or not word.strip() for word in action["text"]):
                    world_error("invalid tokens action", "stop %r text must be a non-empty list of strings" % stop["id"])
            else:
                world_error("unknown action type", "stop %r: %r" % (stop["id"], action.get("type")))

    previous_time = None
    for stop in stops:
        time = anchor_time(stop["anchor"], "stop %r" % stop["id"], world_error)
        if previous_time is not None and time <= previous_time:
            world_error("stops not strictly increasing in time", "%r at %.3f is not after %.3f"
                        % (stop["id"], time, previous_time))
        if time >= START["cta"]:
            world_error("stop at or after cta scene start", "%r resolves to %.3f; cta starts at %.2f"
                        % (stop["id"], time, START["cta"]))
        stop["t"] = float(time)
        previous_time = time

    print("world3d stop table:")
    print("  stop id | anchor                  | seconds")
    for stop in stops:
        anchor = stop["anchor"]
        print("  %-8s | sentence %d: %-14s | %.2f" % (stop["id"], anchor["sentence"], anchor["word"], stop["t"]))
    return world, kit


WORLD, WORLD_KIT = resolve_world() if THEME == "world3d" else (None, None)
if THEME == "world3d":
    last_stop = max(stop["t"] for stop in WORLD["stops"])
    cta_start = round(max(17.50, last_stop + 2.50, VO - 9.45), 2)
    SC = [("world", 0.00), ("cta", cta_start), ("ec", round(cta_start + 6.70, 2))]
    START = dict(SC)
    END = round(SC[-1][1] + EC_DUR, 2)
    NEXT = {sid: (SC[k + 1][1] if k + 1 < len(SC) else END) for k, (sid, _) in enumerate(SC)}
    DUR = {sid: round(NEXT[sid] - START[sid], 2) for sid in START}

# neon3d and terra3d: banned in vignette and kit code, so every frame is a function of seek time (comments included)
VIGNETTE_THEMES = ("neon3d", "terra3d")
NEON_BANNED = [r"\brandom\b", r"\bDate\b", r"\bperformance\b", r"requestAnimationFrame", r"setAnimationLoop",
               r"setTimeout", r"setInterval", r"\bClock\b", r"\bTimer\b", r"getDelta", r"GlitchPass", r"FilmPass",
               r"\bfetch\b", r"XMLHttpRequest", r"WebSocket", r"\b(?:https?|wss?):"]
NEON_KINDS = ("cut", "fly", "flash")
FLY_DUR = 0.9
TERRA_KINDS = ("cut",)            # terra3d is hard cuts only
TERRA_MIN_LEN = 1.0               # s: a terra3d vignette shorter than this is a flicker, not a shot
AMBIENCE_GAINS = ("soft", "medium", "strong")   # categories; add-sfx.py owns their dB targets


def vignette_error(problem, detail):
    raise SystemExit("vignettes.json %s: %s" % (problem, detail))


def theme_sources(theme):
    files = [os.path.join("vignettes", f) for f in sorted(os.listdir("vignettes")) if f.endswith(".js")] \
        if os.path.isdir("vignettes") else []
    for root, _, names in sorted(os.walk(os.path.join("assets", theme))):
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


def resolve_vignettes(theme):
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
        kinds = NEON_KINDS if theme == "neon3d" else TERRA_KINDS
        if not isinstance(tr, dict) or tr.get("kind") not in kinds:
            vignette_error("invalid transition", "%r in.kind must be one of %s" % (vid, ", ".join(kinds)))
        if "dur" in tr and (isinstance(tr["dur"], bool) or not isinstance(tr["dur"], (int, float))
                            or not 0.2 <= tr["dur"] <= 2.0):
            vignette_error("invalid transition", "%r in.dur must be between 0.2 and 2.0 seconds" % vid)
        v["in"] = dict(tr, dur=float(tr.get("dur", FLY_DUR if tr["kind"] == "fly" else 0.3)))
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

    for f in theme_sources(theme):
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


def check_vignettes(rows, cta, theme):
    quiet = None
    flashes = []
    for k, v in enumerate(rows):
        v["end"] = rows[k + 1]["t"] if k + 1 < len(rows) else cta
        if theme == "terra3d" and v["end"] - v["t"] < TERRA_MIN_LEN:
            vignette_error("vignette too short", "%r lasts %.2fs; a terra3d vignette needs at least %.1fs"
                           % (v["id"], v["end"] - v["t"], TERRA_MIN_LEN))
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
            if theme == "terra3d":  # terra3d cuts are hard cuts on a visual beat, with no silence rule
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
    print("  vignette | in    | anchor                    | start | end")
    for v in rows:
        a = v.get("anchor")
        where = "sentence %d: %s" % (a["sentence"], a["word"]) if a else "(film start)"
        print("  %-8s | %-5s | %-25s | %5.2f | %5.2f" % (v["id"], v["in"]["kind"], where[:25], v["t"], v["end"]))


VIGNETTES = resolve_vignettes(THEME) if THEME in VIGNETTE_THEMES else None
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

html = "".join(io.open("parts/" + f, encoding="utf-8").read() for f in PARTS)
ff = io.open("parts/fontfaces.txt", encoding="utf-8").read().rstrip("\n")
assert html.count("      /* @fontfaces */") == 1
html = html.replace("      /* @fontfaces */", ff, 1)
for ph, f in (("      /* @theme */", "parts/theme.css"), ("      <!-- @stage -->", "parts/stage.part"),
              ("      /* @timeline */", "parts/timeline.js")):
    assert html.count(ph) == 1, ph
    html = html.replace(ph, io.open(f, encoding="utf-8").read().rstrip("\n"), 1)
if THEME == "dark":
    assert html.count("@@particles@@") == 1
    html = html.replace("@@particles@@", particle_markup(), 1)
    for f in ("h1-page.json", "assets/img/h1-page.webp"):
        if not os.path.exists(f):
            raise SystemExit("missing walkthrough asset: %s (new-project.py copies it from assets/walkthrough)" % f)
    assert html.count("@@walkthrough@@") == 1, "dark needs one @@walkthrough@@ token"
    walk_data = json.dumps(json.load(io.open("h1-page.json", encoding="utf-8")), ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    html = html.replace("@@walkthrough@@", walk_data, 1)
for name, f in (("openai", "assets/logos/openai-path.txt"), ("claude", "assets/logos/claude.svg"),
                ("github", "assets/logos/github-mark.svg")):
    html = html.replace("@@path:%s@@" % name, path_of(f))
blocks = {"@@trk@@": trk(), "@@ctaq@@": typed("cta-c", CTA_WORD), "@@title@@": esc(TITLE),
          "@@brand@@": esc(BRAND_NAME), "@@slogan@@": esc(SLOGAN), "@@logo@@": BRAND_LOGO}
for tok, val in blocks.items():
    html = html.replace(tok, val)
for sent, h in p_html.items():
    html = html.replace("@@p:%d@@" % sent, h)
html = html.replace("/* @pwords */", "/* the prompts light word by word */\n" + "\n".join(p_js), 1)
html = html.replace("/* @geo */", "var GEO = %s;" % json.dumps({"tk": TK_X, "cta": len(CTA_WORD)}), 1)
if THEME == "world3d":
    assert html.count("@@world@@") == 1
    assert html.count("@@kit@@") == 1
    world_data = json.dumps(WORLD, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    html = html.replace("@@world@@", world_data, 1)
    kit_data = json.dumps(WORLD_KIT, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    html = html.replace("@@kit@@", kit_data, 1)
if THEME in VIGNETTE_THEMES:
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

# the seam ledger: dark uses Z blur pushes; paper climbs into chapters (UP), else slides LEFT
seams = []
for k in range(1, len(SC)):
    a, b = SC[k - 1][0], SC[k][0]
    if THEME in ("dark", "world3d", "neon3d", "terra3d"):
        seams.append({"id": "%s->%s" % (a, b), "cut": SC[k][1], "technique": "blur push", "blur": 10,
                      "exit": {"selector": "#w-" + a, "axis": "z", "dir": 1},
                      "entry": {"selector": "#w-" + b, "axis": "z", "dir": 1}})
    elif THEME == "paper":
        up = b in CHAPTERS
        ax, tech = ("y", "cut-the-curve UP") if up else ("x", "cut-the-curve LEFT")
        seams.append({"id": "%s->%s" % (a, b), "cut": SC[k][1], "technique": tech,
                      "exit": {"selector": "#w-" + a, "axis": ax, "dir": -1},
                      "entry": {"selector": "#w-" + b, "axis": ax, "dir": -1}})
ledger = {"fps": 30, "seams": seams}
if THEME in VIGNETTE_THEMES:  # vignette transitions live inside the theme's 3D scene: not HyperFrames seams, no sound cue
    ledger["vignettes"] = [{k: v[k] for k in ("id", "t", "end", "in", "ambience") if k in v} for v in VIGNETTES]
if THEME == "terra3d":  # add-sfx.py reads this: terra3d has no sound on cuts, so no swoosh on its seams
    ledger["theme"] = THEME
io.open("ledger.json", "w", encoding="utf-8").write(json.dumps(ledger, ensure_ascii=False, indent=1))
print("index.html: %d scenes, %.2fs (voice %.2fs); ledger: %d seams" % (len(SC), END, VO, len(seams)))
