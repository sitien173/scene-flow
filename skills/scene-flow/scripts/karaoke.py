# Karaoke captions: the whole cue is on screen, the word being spoken lights up.
#
# Dark capitals with the current word boxed in violet, built from syl-times.json — the
# time of every syllable in the recording — so each word lights exactly when it is said.
#
# Units: Vietnamese writes one syllable per token, but a word is often two ("tiết
# kiệm"). Lighting half a word reads as a stutter, so COMPOUNDS below are lit as one
# unit, and product names ("Claude Code") never split.
#
# Sole owner of #kara and the <kara:auto> block: clears both and regenerates, so it
# is safe to re-run after any retiming.
import io
import json
import re

# ── PER-PROJECT ──────────────────────────────────────────────────────────────────
# Cues inside these windows sit in a narrower band to the RIGHT of a lower-left mascot:
# (from, to, band class). "side hk" clears the big pointing mascot (its arm reaches x 600, see
# head.part .kc.side.hk); "side" suits the 576-px CTA mascot. End a window on a CUE boundary,
# or the last cue is cut short at the edge.
SIDES = []           # e.g. [(0.0, 4.77, "side hk"), (85.85, 90.90, "side")]

# Windows over dark footage: white capitals with a dark halo (head.part .kc.dk).
DARK = []            # e.g. [(4.77, 9.70)]

# Sentences shown on their own card (a prompt read aloud, lit word by word) get no caption.
SKIP = set()         # e.g. {11, 19}

# Two-syllable words lit as one unit (lighting half a word reads as a stutter). Product names never split.
COMPOUNDS = [
    "anh em", "có thể", "đơn giản", "chính xác", "cực kỳ", "đặc biệt", "Đầu tiên", "Tiếp theo", "Sau đó",
    "cuối cùng", "công cụ", "ứng dụng", "bình thường", "hướng dẫn", "đầy đủ", "từng bước", "dự án", "yêu cầu",
    "câu lệnh", "tài liệu", "nội dung", "trả lời", "câu hỏi", "kiểm tra", "liên quan", "tự động", "miễn phí",
    "chất lượng", "hình ảnh", "nhân viên", "khách hàng", "chăm sóc", "đào tạo", "nội bộ", "tài khoản",
    "đường link", "gửi cho", "chỉ cần", "AI Agent", "ChatGPT App", "Claude App", "Claude Code", "Google Vids",
    "video AI", "prompt mẫu", "quan trọng", "thư giãn", "bây giờ", "Ví dụ", "ở đây", "file PDF", "xem nguồn",
]
THEME = json.load(io.open("meta.json", encoding="utf-8")).get("theme", "neon3d")
if THEME in ("dark", "paper", "world3d"):
    raise SystemExit("theme %s was removed; only neon3d, terra3d, atlas3d and legend2d are supported" % THEME)
THEME_SETTINGS = {
    "neon3d": {
        "maxu": 5, "maxc": 30, "maxc_side": 30,
        "lit_color": "#FFC247", "lit_shadow": "DHALO",
        "unlit_color": "#FFFFFF", "unlit_shadow": "DHALO",
        "dark_unlit_color": "#FFFFFF", "dark_unlit_shadow": "DHALO",
        "minu": 3,
    },
    # one word per cue, never boxed or scaled, shadow left to theme.css (LIT is transparent); "compounds" extend COMPOUNDS for this theme only
    "terra3d": {
        "maxu": 1, "maxc": 30, "maxc_side": 30,
        "lit_color": "#FFFFFF", "lit_shadow": "LIT",
        "unlit_color": "#FFFFFF", "unlit_shadow": "LIT",
        "dark_unlit_color": "#FFFFFF", "dark_unlit_shadow": "LIT",
        "minu": 1, "single": True,
        "compounds": ["kênh đào", "Trái Đất", "con tàu", "công trình", "đại dương", "con người", "kỹ sư", "mặt nước",
                      "cửa âu", "đường sắt"],
    },
    "atlas3d": {
        "maxu": 4, "maxc": 24, "maxc_side": 24,
        "lit_color": "#FFFFFF", "lit_shadow": "DHALO",
        "unlit_color": "#FFFFFF", "unlit_shadow": "DHALO",
        "dark_unlit_color": "#FFFFFF", "dark_unlit_shadow": "DHALO",
        "minu": 3, "highlight": False,  # whole phrases only: no per-word colour
    },
    # uppercase cues of 2 to 3 words, 16 characters at most so one line fits 936 px at 76 px; the active word is yellow
    "legend2d": {
        "maxu": 3, "maxc": 16, "maxc_side": 16,
        "lit_color": "#FFC247", "lit_shadow": "DHALO",
        "unlit_color": "#FFFFFF", "unlit_shadow": "DHALO",
        "dark_unlit_color": "#FFFFFF", "dark_unlit_shadow": "DHALO",
        "minu": 2,
    },
}
if THEME not in THEME_SETTINGS:
    raise SystemExit("unknown theme: " + THEME)
SETTINGS = THEME_SETTINGS[THEME]
MAXU = SETTINGS["maxu"]
MAXC = SETTINGS["maxc"]
MAXC_SIDE = SETTINGS["maxc_side"]
BOXED = SETTINGS["minu"] == 1 and not SETTINGS.get("single")     # the current word gets the violet box and 1.08 scale
LEAD = 0.03     # a word lights this much before its first syllable


def key(t):
    return re.sub(r"[^\w]", "", t).lower()


COMP = sorted(([key(w) for w in c.split()] for c in COMPOUNDS + SETTINGS.get("compounds", [])), key=len, reverse=True)
syl = json.load(io.open("syl-times.json", encoding="utf-8"))

by_sent = {}
for x in syl:
    by_sent.setdefault(x["i"], []).append(x)


def units_of(toks):
    out, k = [], 0
    while k < len(toks):
        for c in COMP:
            seg = toks[k:k + len(c)]
            if len(seg) == len(c) and [key(t["syl"]) for t in seg] == c:
                break
        else:
            seg = toks[k:k + 1]
        out.append({"text": " ".join(t["syl"] for t in seg), "s": seg[0]["s"], "e": seg[-1]["e"]})
        k += len(seg)
    return out


def text_of(us):
    return " ".join(u["text"] for u in us)


def sentence_end(u):
    return bool(re.search(r"[.!?]$", u["text"]))


def fits_cue(a, b, limit):
    return len(a) + len(b) <= MAXU and len(text_of(a + b)) <= limit


def in_side(t):
    return any(a <= t < b for a, b, _ in SIDES)


def side_cls(t):
    return next((c for a, b, c in SIDES if a <= t < b), "")


cues = []
for i in sorted(by_sent):
    if i in SKIP:
        continue
    us = units_of(by_sent[i])
    lim = MAXC_SIDE if in_side(us[0]["s"]) else MAXC
    group, cur = [], []
    for u in us:
        if cur and (len(cur) + 1 > MAXU or len(text_of(cur + [u])) > lim):
            group.append(cur)
            cur = []
        cur.append(u)
        if re.search(r"[,.:;?!]$", u["text"]):
            group.append(cur)
            cur = []
    if cur:
        group.append(cur)
    if SETTINGS["minu"] > 1:
        merged, k = [], 0
        while k < len(group):
            g = group[k]
            if merged and len(g) < SETTINGS["minu"] and not sentence_end(merged[-1][-1]) \
                    and fits_cue(merged[-1], g, lim):
                merged[-1] += g
            elif len(g) < SETTINGS["minu"] and k + 1 < len(group) and not sentence_end(g[-1]) \
                    and fits_cue(g, group[k + 1], lim):
                merged.append(g + group[k + 1])
                k += 1
            else:
                merged.append(g)
            k += 1
        for k, g in enumerate(merged):
            if len(g) >= SETTINGS["minu"]:
                continue
            if k and not sentence_end(merged[k - 1][-1]):
                prev = merged[k - 1]
                while len(g) < SETTINGS["minu"] and len(prev) > SETTINGS["minu"]:
                    unit = prev[-1]
                    candidate = [unit] + g
                    if len(text_of(prev[:-1])) > lim or len(text_of(candidate)) > lim:
                        break
                    prev.pop()
                    g.insert(0, unit)
            if k + 1 < len(merged) and not sentence_end(g[-1]):
                nxt = merged[k + 1]
                while len(g) < SETTINGS["minu"] and len(nxt) > SETTINGS["minu"]:
                    unit = nxt[0]
                    candidate = g + [unit]
                    if len(text_of(candidate)) > lim or len(text_of(nxt[1:])) > lim:
                        break
                    nxt.pop(0)
                    g.append(unit)
    elif SETTINGS.get("single"):
        merged = group
    else:
        # an orphan single word joins the cue before it when the pair still fits
        slack = 4 if lim == MAXC_SIDE else 8
        merged = []
        for g in group:
            if merged and len(g) == 1 and len(text_of(merged[-1] + g)) <= lim + slack \
                    and not re.search(r"[,.:;?!]$", merged[-1][-1]["text"]):
                merged[-1] = merged[-1] + g
            else:
                merged.append(g)
    for g in merged:
        cues.append({"sent": i, "units": g})

# times: a cue holds until the next one starts inside its sentence; at a sentence end
# it lingers briefly, never into the next cue, never across a layout window's edge
for n, c in enumerate(cues):
    c["s"] = round(max(0.0, c["units"][0]["s"] - LEAD), 3)
for n, c in enumerate(cues):
    nxt = cues[n + 1]["s"] if n + 1 < len(cues) else None
    last = c["units"][-1]["e"]
    if nxt is not None and cues[n + 1]["sent"] == c["sent"]:
        e = nxt - 0.02
    else:
        e = last + 0.45 if nxt is None else min(last + 0.45, nxt - 0.02)
    c["side"] = side_cls(c["s"])
    c["dark"] = any(x <= c["s"] < y for x, y in DARK)
    for a, b, _ in SIDES:
        if a <= c["s"] < b:
            e = min(e, b)
    c["e"] = round(max(e, c["s"] + 0.3), 3)
# the 0.3s minimum must never run a cue into the next one (two cues on screen at once)
for n in range(len(cues) - 1):
    cues[n]["e"] = round(min(cues[n]["e"], cues[n + 1]["s"] - 0.02), 3)


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


html, anim = [], []
w = 0
for n, c in enumerate(cues):
    spans = []
    for k, u in enumerate(c["units"]):
        u["id"] = w
        highlight = '<span class="ka" id="ka%03d"></span>' % w if BOXED else ""
        spans.append('<span class="kw" id="kw%03d">%s'
                     '<span class="kb" id="kb%03d">%s</span></span>'
                     % (w, highlight, w, esc(u["text"])))
        w += 1
    html.append('        <div class="kc clip%s%s" id="kc%03d" data-start="%.3f" data-duration="%.3f"'
                ' data-track-index="6" data-layout-allow-overlap="true">'
                '<span class="kin" id="ki%03d">%s</span></div>'
                % (" " + c["side"] if c["side"] else "", " dk" if c["dark"] else "", n, c["s"], c["e"] - c["s"], n, " ".join(spans)))
    anim.append('      tl.fromTo("#ki%03d", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.12,'
                ' ease: "power2.out" }, %.3f);' % (n, c["s"]))
    us = c["units"]
    for k, u in enumerate(us if SETTINGS.get("highlight", True) else []):
        on = max(c["s"], u["s"] - LEAD)
        off = (max(c["s"], us[k + 1]["s"] - LEAD) if k + 1 < len(us) else c["e"]) - 0.01
        if BOXED:
            anim.append('      tl.set("#ka%03d", { autoAlpha: 1 }, %.3f); tl.set("#kb%03d", { color: "%s", textShadow: %s }, %.3f);'
                        ' tl.set("#kw%03d", { scale: 1.08 }, %.3f);'
                        % (u["id"], on, u["id"], SETTINGS["lit_color"], SETTINGS["lit_shadow"], on, u["id"], on))
        else:
            anim.append('      tl.set("#kb%03d", { color: "%s", textShadow: %s }, %.3f);'
                        % (u["id"], SETTINGS["lit_color"], SETTINGS["lit_shadow"], on))
        if BOXED:
            anim.append('      tl.set("#ka%03d", { autoAlpha: 0 }, %.3f); tl.set("#kb%03d", { color: "%s", textShadow: %s }, %.3f);'
                        ' tl.set("#kw%03d", { scale: 1 }, %.3f);'
                        % (u["id"], off, u["id"], SETTINGS["dark_unlit_color"] if c["dark"] else SETTINGS["unlit_color"],
                           SETTINGS["dark_unlit_shadow"] if c["dark"] else SETTINGS["unlit_shadow"], off, u["id"], off))
        else:
            anim.append('      tl.set("#kb%03d", { color: "%s", textShadow: %s }, %.3f);'
                        % (u["id"], SETTINGS["dark_unlit_color"] if c["dark"] else SETTINGS["unlit_color"],
                           SETTINGS["dark_unlit_shadow"] if c["dark"] else SETTINGS["unlit_shadow"], off))

P = "index.html"
s = io.open(P, encoding="utf-8").read()
lines = s.split("\n")
opener = re.compile(r'<div\b[^>]*(?<![-\w])id="kara"')
opens = [k for k, ln in enumerate(lines) if opener.search(ln)]
assert len(opens) == 1, "expected one #kara container, found %d" % len(opens)
k = opens[0]
end = k if "</div>" in lines[k] and lines[k].count("<div") == 1 else \
    next(j for j in range(k + 1, len(lines)) if lines[j].strip() == "</div>")
s = "\n".join(lines[:k] + ['      <div id="kara" data-layout-allow-overlap="true">'] + html
              + ["      </div>"] + lines[end + 1:])

s = re.sub(r"[ \t]*/\* <kara:auto> \*/.*?/\* </kara:auto> \*/\n", "", s, flags=re.S)
tails = re.findall(r"[ \t]*tl\.set\(\{\}, \{\}, [0-9.]+\);", s)
assert len(tails) == 1, "expected one tail pin, found %d" % len(tails)
HEAD = ("      /* <kara:auto> */\n"
        "      var HALO = \"0 0 3px #FFFFFF, 0 0 6px #FFFFFF, 0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.7)\";\n"
        "      var DHALO = \"0 0 3px #000000, 0 0 6px #000000, 0 0 12px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.75)\";\n"
        "      var LIT = \"0 0 0 rgba(255,255,255,0), 0 0 0 rgba(255,255,255,0), 0 0 0 rgba(255,255,255,0), 0 0 0 rgba(255,255,255,0)\";\n")
s = s.replace(tails[0], HEAD + "\n".join(anim)
              + "\n      /* </kara:auto> */\n\n" + tails[0], 1)
io.open(P, "w", encoding="utf-8").write(s)

print("  %d cue, %d tu, %.2fs -> %.2fs" % (len(cues), w, cues[0]["s"], cues[-1]["e"]))
longest = max(cues, key=lambda c: len(text_of(c["units"])))
print("  cue dai nhat: %d ky tu — %s" % (len(text_of(longest["units"])), text_of(longest["units"])))
for c in cues[:8]:
    print("   %6.2f-%6.2f %s %s" % (c["s"], c["e"], "S" if c["side"] else " ", text_of(c["units"])))
