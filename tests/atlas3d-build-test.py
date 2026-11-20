#!/usr/bin/env python3
# Tests for the atlas3d branch of skills/scene-flow/scripts/build.py. One fixture project is built with
# tests/theme-fixture.sh; each case copies it, breaks one input, and runs build.py in the copy.
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURE = None
TMP = None
BACKDROP = "assets/atlas3d/map/relief.webp"
STARTER = os.path.join(ROOT, "tests", "fixtures", "atlas3d-starter")
STARTER_FILES = ("SCRIPT.md", "vignettes.json", "vignettes/intro.js", "vignettes/outro.js", "vignettes/scene.js")
STARTER_VOICE_SECONDS = "26.95"


def install_starter(d):
    # the shipped sample uses other vignette ids; these tests rely on the old starter ids intro, outro and scene
    shutil.rmtree(os.path.join(d, "vignettes"), ignore_errors=True)
    os.makedirs(os.path.join(d, "vignettes"))
    for rel in STARTER_FILES:
        shutil.copyfile(os.path.join(STARTER, rel), os.path.join(d, rel))


def setUpModule():
    global FIXTURE, TMP
    TMP = tempfile.mkdtemp(prefix="atlas3d-build-test-")
    subprocess.run(["bash", os.path.join(ROOT, "tests", "theme-fixture.sh"), TMP, "--theme", "atlas3d"],
                   check=True, stdout=subprocess.DEVNULL)
    FIXTURE = os.path.join(TMP, "demo")
    # the starter fixture: the built sample project with the old starter files, timings and voice length
    install_starter(FIXTURE)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", STARTER_VOICE_SECONDS,
                    "-c:a", "pcm_s16le", "-f", "wav", os.path.join(FIXTURE, "assets", "audio", "voiceover.mp3")], check=True)
    out, time = [], 0.3
    for sentence, line in enumerate(open(os.path.join(FIXTURE, "SCRIPT.md"), encoding="utf-8"), 1):
        for word in line.split():
            out.append({"i": sentence, "syl": word, "s": round(time, 2), "e": round(time + 0.3, 2)})
            time += 0.4
    json.dump(out, open(os.path.join(FIXTURE, "syl-times.json"), "w", encoding="utf-8"), ensure_ascii=False)
    subprocess.run(["bash", "scripts/make.sh"], cwd=FIXTURE, check=True, stdout=subprocess.DEVNULL)


def tearDownModule():
    shutil.rmtree(TMP, ignore_errors=True)


class Atlas3dBuild(unittest.TestCase):
    def project(self):
        d = tempfile.mkdtemp(dir=TMP)
        shutil.rmtree(d)
        shutil.copytree(FIXTURE, d, ignore=shutil.ignore_patterns("snapshots"))
        install_starter(d)
        return d

    def build(self, d):
        return subprocess.run([sys.executable, "scripts/build.py"], cwd=d, capture_output=True, text=True,
                              env={**os.environ, "PYTHONIOENCODING": "utf-8"})

    def edit(self, d, change):
        p = os.path.join(d, "vignettes.json")
        data = json.load(open(p, encoding="utf-8"))
        change(data)
        json.dump(data, open(p, "w", encoding="utf-8"), ensure_ascii=False)

    def rejects(self, d, *needles):
        r = self.build(d)
        self.assertNotEqual(r.returncode, 0, r.stdout)
        self.assertIn("vignettes.json", r.stderr)
        for needle in needles:
            self.assertIn(needle, r.stderr)

    def test_valid_build_prints_table_and_ledger(self):
        d = self.project()
        r = self.build(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("atlas3d vignette table:", r.stdout)
        ledger = json.load(open(os.path.join(d, "ledger.json"), encoding="utf-8"))
        self.assertEqual([s["id"] for s in ledger["seams"]], ["atlas->cta", "cta->ec"])
        self.assertEqual([v["id"] for v in ledger["vignettes"]], ["intro", "outro", "scene"])
        self.assertEqual(ledger["vignettes"][1]["in"], {"kind": "pan", "dur": 1.0})
        self.assertEqual(ledger["vignettes"][1]["kind"], "map")
        self.assertEqual(ledger["vignettes"][2]["kind"], "backdrop")
        self.assertEqual(ledger["vignettes"][2]["kind"], "backdrop")
        html = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        self.assertIn("backdrops/sample.webp", html)
        cues = [(round(c["t"], 2), c["sound"]) for c in ledger["cues"]]
        self.assertEqual(cues, [(0.7, "pen"), (5.5, "swoosh")])

    def test_captions_have_no_word_color_tl_set(self):
        html = open(os.path.join(FIXTURE, "index.html"), encoding="utf-8").read()
        self.assertIn('id="kc000"', html)
        self.assertIsNone(re.search(r'tl\.set\("#kb\d+"', html))

    def test_unknown_country_code(self):
        d = self.project()
        self.edit(d, lambda data: data["regions"][0].update(countries=["ZZZ"]))
        self.rejects(d, "'fra'", "ZZZ")

    def test_polygon_with_fewer_than_three_points(self):
        d = self.project()
        self.edit(d, lambda data: data["regions"][1].update(polygon=[[-94.0, 33.0], [-89.6, 29.1]]))
        self.rejects(d, "'sample-triangle'")

    def test_polygon_coordinate_out_of_range(self):
        d = self.project()
        self.edit(d, lambda data: data["regions"][1]["polygon"].__setitem__(0, [200.0, 33.0]))
        self.rejects(d, "'sample-triangle'")

    def test_polygon_without_source(self):
        d = self.project()
        self.edit(d, lambda data: data["regions"][1].pop("source"))
        self.rejects(d, "'sample-triangle'")

    def test_duplicate_region_id(self):
        d = self.project()
        self.edit(d, lambda data: data["regions"].append(dict(data["regions"][0])))
        self.rejects(d, "duplicate region id", "fra")

    def test_duplicate_vignette_id(self):
        d = self.project()
        self.edit(d, lambda data: data["vignettes"][1].update(id="intro"))
        self.rejects(d, "duplicate vignette id", "intro")

    def test_pan_out_of_backdrop(self):
        d = self.project()
        self.edit(d, lambda data: data["vignettes"][0].update(kind="backdrop", image=BACKDROP))
        self.rejects(d, "'outro'", "backdrop")

    def test_pan_into_backdrop(self):
        d = self.project()
        self.edit(d, lambda data: data["vignettes"][1].update(kind="backdrop", image=BACKDROP))
        self.rejects(d, "'outro'", "backdrop")

    def test_pan_as_first_vignette(self):
        d = self.project()
        self.edit(d, lambda data: data["vignettes"][0].update(**{"in": {"kind": "pan", "dur": 1.0}}))
        self.rejects(d, "'intro'", "first vignette")

    def test_pan_dur_outside_range(self):
        for dur in (0.2, 2.5):
            with self.subTest(dur=dur):
                d = self.project()
                self.edit(d, lambda data: data["vignettes"][1].update(**{"in": {"kind": "pan", "dur": dur}}))
                self.rejects(d, "'outro'", "0.3 and 2.0")

    def test_pan_dur_above_sixty_percent_of_incoming(self):
        d = self.project()

        def late_outro(data):
            data["vignettes"] = data["vignettes"][:2]
            data["vignettes"][1].update(anchor={"sentence": 4, "word": "tiếp"}, beats={},
                                        **{"in": {"kind": "pan", "dur": 2.0}})
        self.edit(d, late_outro)
        self.rejects(d, "'outro'", "60%")

    def test_missing_backdrop_image(self):
        d = self.project()
        self.edit(d, lambda data: data["vignettes"][0].update(kind="backdrop", image="backdrops/none.webp"))
        self.edit(d, lambda data: data["vignettes"][1].update(**{"in": {"kind": "cut"}}))
        self.rejects(d, "'intro'", "backdrops/none.webp")

    def test_anchor_not_found(self):
        d = self.project()
        self.edit(d, lambda data: data["vignettes"][1].update(anchor={"sentence": 2, "word": "khôngcótừnày"}))
        self.rejects(d, "'outro'", "khôngcótừnày")

    def test_beat_outside_vignette(self):
        d = self.project()
        self.edit(d, lambda data: data["vignettes"][0]["beats"].update(fill={"sentence": 4, "word": "tiếp"}))
        self.rejects(d, "'intro'", "'fill'", "beat outside its vignette")

    def test_beat_phrase_not_found(self):
        d = self.project()
        self.edit(d, lambda data: data["vignettes"][0]["beats"].update(fill={"sentence": 1, "word": "khôngcótừnày"}))
        self.rejects(d, "'intro'", "'fill'", "anchor not found")

    def test_missing_vignette_module(self):
        d = self.project()
        os.remove(os.path.join(d, "vignettes", "outro.js"))
        self.rejects(d, "outro")

    def test_banned_api_in_vignette(self):
        for code in ("const x = Math['random']();", "// Date.now() would make frames depend on wall time",
                     "requestAnimationFrame(update);"):
            with self.subTest(code=code):
                d = self.project()
                with open(os.path.join(d, "vignettes", "intro.js"), "a", encoding="utf-8") as f:
                    f.write("\n" + code + "\n")
                self.rejects(d, "banned API", "intro.js")

    def test_banned_api_in_kit_module(self):
        d = self.project()
        with open(os.path.join(d, "assets", "atlas3d", "kit", "motion.js"), "a", encoding="utf-8") as f:
            f.write("\nconst x = Math['random']();\n")
        self.rejects(d, "banned API", "motion.js")

    def test_sfx_names_missing_beat(self):
        d = self.project()
        self.edit(d, lambda data: data["vignettes"][0].update(sfx={"nothing": "pop"}))
        self.rejects(d, "'intro'", "nothing")

    def test_valid_backdrop_vignette(self):
        d = self.project()
        backdrop_path = os.path.join(d, "backdrops", "sample.webp")
        self.assertTrue(os.path.isfile(backdrop_path), "expected backdrops/sample.webp in atlas3d project")
        if not any(v.get("kind") == "backdrop" for v in json.load(open(os.path.join(d, "vignettes.json"), encoding="utf-8"))["vignettes"]):
            self.edit(d, lambda data: data["vignettes"].append(
                {"id": "scene", "kind": "backdrop", "image": "backdrops/sample.webp",
                 "anchor": {"sentence": 3, "word": "Hãy"}, "in": {"kind": "cut"}}))
        r = self.build(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertRegex(r.stdout, r"backdrop\s*\|\s*cut")
        ledger = json.load(open(os.path.join(d, "ledger.json"), encoding="utf-8"))
        backdrops = [v for v in ledger["vignettes"] if v.get("kind") == "backdrop"]
        self.assertTrue(backdrops)
        self.assertEqual(backdrops[0]["kind"], "backdrop")
        html = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        self.assertIn("backdrops/sample.webp", html)

    def test_new_project_copies_backdrops_for_atlas3d_only(self):
        new_proj = os.path.join(ROOT, "skills", "scene-flow", "scripts", "new-project.py")
        for theme, want in (("atlas3d", True), ("dark", False), ("neon3d", False)):
            with self.subTest(theme=theme):
                out = tempfile.mkdtemp(dir=TMP)
                subprocess.run([sys.executable, new_proj, out, "--theme", theme], check=True, stdout=subprocess.DEVNULL)
                sample = os.path.join(out, "backdrops", "sample.webp")
                self.assertEqual(os.path.isfile(sample), want, f"theme={theme} sample={sample}")
                self.assertFalse(os.path.exists(os.path.join(out, "parts", "backdrops")))

    def add_sfx(self, d):
        return subprocess.run([sys.executable, "scripts/add-sfx.py"], cwd=d, capture_output=True, text=True,
                              env={**os.environ, "PYTHONIOENCODING": "utf-8"})

    def sfx_cues(self, d):
        return json.load(open(os.path.join(d, "sfx-cues.json"), encoding="utf-8"))

    def test_add_sfx_writes_pan_and_beat_cues(self):
        d = self.project()
        r = self.add_sfx(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        cues = self.sfx_cues(d)
        # thud once, the beat sound at its resolved time, a swoosh on the pan and on each seam
        self.assertEqual([(c["t"], c["sound"]) for c in cues],
                         [(0.0, "thud"), (0.7, "pen"), (5.5, "swoosh"), (17.5, "swoosh"), (24.2, "swoosh")])
        pen = [c for c in cues if c["sound"] == "pen"][0]
        self.assertGreater(pen["gain"], 0)
        self.assertAlmostEqual(pen["dur"], 1.19, places=2)
        self.assertLess(float(re.search(r"peak (\d+\.\d+)", r.stdout).group(1)), 1.0)

    def test_add_sfx_one_swoosh_when_pan_lands_on_a_seam(self):
        d = self.project()
        p = os.path.join(d, "ledger.json")
        ledger = json.load(open(p, encoding="utf-8"))
        ledger["seams"][0]["cut"] = 5.5
        json.dump(ledger, open(p, "w", encoding="utf-8"))
        r = self.add_sfx(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual([c["t"] for c in self.sfx_cues(d) if c["sound"] == "swoosh"], [5.5, 24.2])

    def test_add_sfx_rejects_unknown_ledger_sound(self):
        d = self.project()
        p = os.path.join(d, "ledger.json")
        ledger = json.load(open(p, encoding="utf-8"))
        ledger["cues"].append({"t": 3.0, "sound": "kazoo"})
        json.dump(ledger, open(p, "w", encoding="utf-8"))
        r = self.add_sfx(d)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("kazoo", r.stderr)

    def test_add_sfx_two_coincident_pen_cues_stay_below_clipping(self):
        # pen gain 6.5 leaves little overlap headroom; this pins two on one moment, see the pen row in add-sfx.py
        d = self.project()
        p = os.path.join(d, "ledger.json")
        ledger = json.load(open(p, encoding="utf-8"))
        ledger["cues"] += [{"t": 10.0, "sound": "pen"}, {"t": 10.0, "sound": "pen"}]
        json.dump(ledger, open(p, "w", encoding="utf-8"))
        r = self.add_sfx(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual([c["t"] for c in self.sfx_cues(d) if c["sound"] == "pen"], [0.7, 10.0, 10.0])
        self.assertLess(float(re.search(r"peak (\d+\.\d+)", r.stdout).group(1)), 1.0)

    def test_add_sfx_uses_the_atlas3d_bed(self):
        d = self.project()
        r = self.add_sfx(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        html = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        bed = re.search(r'<audio id="music-bed"[^>]*>', html).group(0)
        self.assertIn('src="assets/audio/bgm-pizzicato.mp3"', bed)
        self.assertFalse(os.path.exists(os.path.join(d, "assets", "audio", "bgm-pizzicato-loop.mp3")))

    def test_add_sfx_bed_covers_a_film_longer_than_the_file(self):
        import numpy as np
        d = self.project()
        p = os.path.join(d, "index.html")
        html = open(p, encoding="utf-8").read()
        for el, seconds in (("root", "140.00"), ("vo", "130.00")):  # the end card follows the voice
            html = re.sub(r'(id="%s"[^>]*data-duration=")[\d.]+' % el, r"\g<1>" + seconds, html, count=1)
        open(p, "w", encoding="utf-8").write(html)
        r = self.add_sfx(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        html = open(p, encoding="utf-8").read()
        loop = "assets/audio/bgm-pizzicato-loop.mp3"
        self.assertIn('src="%s"' % loop, re.search(r'<audio id="music-bed"[^>]*>', html).group(0))

        def decode(path):
            raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", "48000", "-"],
                                 check=True, capture_output=True).stdout
            return np.frombuffer(raw, dtype=np.float32)
        x = decode(os.path.join(d, loop))
        src = decode(os.path.join(d, "assets", "audio", "bgm-pizzicato.mp3"))
        self.assertAlmostEqual(len(x) / 48000, 140.0, delta=0.1)
        # no silent gap: the four seconds after a repeat starts carry music (the file's tail is silent)
        step = len(src) - 5 * 48000
        win = x[step:step + 4 * 48000].reshape(4, 48000)
        self.assertGreater(20 * np.log10(np.sqrt((win ** 2).mean(axis=1)).min()), -40)
        # no click: no sample step larger than the source's own
        self.assertLessEqual(np.abs(np.diff(x)).max(), np.abs(np.diff(src)).max() * 1.05)

    def test_new_project_copies_atlas3d_audio_for_atlas3d_only(self):
        new_proj = os.path.join(ROOT, "skills", "scene-flow", "scripts", "new-project.py")
        names = ("bgm-pizzicato.mp3", "sfx-pen.mp3", "sfx-coins.mp3", "sfx-drum.mp3")
        for theme, want in (("atlas3d", True), ("dark", False), ("neon3d", False)):
            with self.subTest(theme=theme):
                out = tempfile.mkdtemp(dir=TMP)
                subprocess.run([sys.executable, new_proj, out, "--theme", theme], check=True, stdout=subprocess.DEVNULL)
                for name in names:
                    self.assertEqual(os.path.isfile(os.path.join(out, "assets", "audio", name)), want, f"{theme} {name}")
                self.assertFalse(os.path.exists(os.path.join(out, "assets", "atlas3d", "audio")))


    def test_long_voice_anchor_after_initial_cta(self):
        d = self.project()
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "60",
                        "-c:a", "pcm_s16le", "-f", "wav", os.path.join(d, "assets", "audio", "voiceover.mp3")], check=True)
        syl = json.load(open(os.path.join(d, "syl-times.json"), encoding="utf-8"))
        syl.append({"i": 2, "syl": "mốc", "s": 25.5, "e": 25.8})
        json.dump(syl, open(os.path.join(d, "syl-times.json"), "w", encoding="utf-8"), ensure_ascii=False)
        self.edit(d, lambda data: (data["vignettes"].__setitem__(slice(None), data["vignettes"][:2]),
                                   data["vignettes"][1].update(anchor={"sentence": 2, "word": "mốc"})))
        r = self.build(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        ledger = json.load(open(os.path.join(d, "ledger.json"), encoding="utf-8"))
        self.assertEqual(ledger["vignettes"][1]["t"], 25.5)


class LedgerCuesAreAtlas3dOnly(unittest.TestCase):
    # a ledger `cues` entry is read only for atlas3d; the other themes ignore it, as they did at base 18db0ca
    THEMES = ("dark", "neon3d")

    def run_add_sfx(self, d):
        r = subprocess.run([sys.executable, "scripts/add-sfx.py"], cwd=d, capture_output=True, text=True,
                           env={**os.environ, "PYTHONIOENCODING": "utf-8"})
        self.assertEqual(r.returncode, 0, r.stderr)
        files = {n: open(os.path.join(d, n), "rb").read()
                 for n in ("sfx-cues.json", "index.html", os.path.join("assets", "audio", "sfx-mix.mp3"))}
        return r.stdout, files

    def test_injected_cue_changes_nothing(self):
        for theme in self.THEMES:
            out = tempfile.mkdtemp(dir=TMP)
            subprocess.run(["bash", os.path.join(ROOT, "tests", "theme-fixture.sh"), out, "--theme", theme],
                           check=True, stdout=subprocess.DEVNULL)
            fixture = os.path.join(out, "demo")
            # add-sfx.py rewrites index.html, so every run starts from its own copy of the built project
            plain = os.path.join(out, "plain")
            shutil.copytree(fixture, plain, ignore=shutil.ignore_patterns("snapshots"))
            want = self.run_add_sfx(plain)
            for cue in ({"t": 2.0, "sound": "pop"}, {"t": 3.0, "sound": "kazoo"}):
                with self.subTest(theme=theme, cue=cue["sound"]):
                    d = os.path.join(out, "with-" + cue["sound"])
                    shutil.copytree(fixture, d, ignore=shutil.ignore_patterns("snapshots"))
                    p = os.path.join(d, "ledger.json")
                    ledger = json.load(open(p, encoding="utf-8"))
                    ledger["cues"] = ledger.get("cues", []) + [cue]
                    json.dump(ledger, open(p, "w", encoding="utf-8"))
                    self.assertEqual(self.run_add_sfx(d), want)


class Neon3dSfx(unittest.TestCase):
    # add-sfx.py on a neon3d project must keep writing exactly what it wrote at base 18db0ca
    BASE_CUES_SHA256 = "ca3da7f834ce151a1c31378afbcdb0b522371a349b6606c1e8e8e4f22a628c7d"

    def test_sfx_cues_unchanged(self):
        out = tempfile.mkdtemp(dir=TMP)
        subprocess.run(["bash", os.path.join(ROOT, "tests", "theme-fixture.sh"), out, "--theme", "neon3d"],
                       check=True, stdout=subprocess.DEVNULL)
        d = os.path.join(out, "demo")
        r = subprocess.run([sys.executable, "scripts/add-sfx.py"], cwd=d, capture_output=True, text=True,
                           env={**os.environ, "PYTHONIOENCODING": "utf-8"})
        self.assertEqual(r.returncode, 0, r.stderr)
        cues = open(os.path.join(d, "sfx-cues.json"), "rb").read()
        self.assertEqual(hashlib.sha256(cues).hexdigest(), self.BASE_CUES_SHA256)
        self.assertEqual([(c["t"], c["sound"]) for c in json.loads(cues)],
                         [(0.0, "thud"), (71.7, "swoosh"), (78.4, "swoosh")])
        html = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        self.assertIn('src="assets/audio/bgm-little-things.mp3"', re.search(r'<audio id="music-bed"[^>]*>', html).group(0))


if __name__ == "__main__":
    unittest.main()
