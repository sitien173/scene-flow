#!/usr/bin/env python3
# Tests for the toon3d branch of skills/scene-flow/scripts/build.py, karaoke.py and add-sfx.py. One fixture project is
# built with tests/theme-fixture.sh; each case copies it, breaks one input, and runs build.py in the copy.
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
FIXTURE_RUN = None
TMP = None


def setUpModule():
    global FIXTURE, FIXTURE_RUN, TMP
    TMP = tempfile.mkdtemp(prefix="toon3d-build-test-")
    FIXTURE_RUN = subprocess.run(["bash", os.path.join(ROOT, "tests", "theme-fixture.sh"), TMP, "--theme", "toon3d"],
                                 capture_output=True, text=True)
    FIXTURE = os.path.join(TMP, "demo")


def tearDownModule():
    shutil.rmtree(TMP, ignore_errors=True)


class Toon3dBuild(unittest.TestCase):
    def project(self):
        self.assertEqual(FIXTURE_RUN.returncode, 0, "theme-fixture.sh --theme toon3d failed: " + FIXTURE_RUN.stderr[-400:])
        d = tempfile.mkdtemp(dir=TMP)
        shutil.rmtree(d)
        shutil.copytree(FIXTURE, d, ignore=shutil.ignore_patterns("snapshots"))
        return d

    def run_in(self, d, script):
        return subprocess.run([sys.executable, os.path.join("scripts", script)], cwd=d, capture_output=True, text=True,
                              env={**os.environ, "PYTHONIOENCODING": "utf-8"})

    def build(self, d):
        return self.run_in(d, "build.py")

    def edit_vignettes(self, d, change):
        p = os.path.join(d, "vignettes.json")
        data = json.load(open(p, encoding="utf-8"))
        change(data["vignettes"])
        json.dump(data, open(p, "w", encoding="utf-8"), ensure_ascii=False)

    def rejects(self, d, problem, detail):
        r = self.build(d)
        self.assertNotEqual(r.returncode, 0, r.stdout)
        self.assertIn("vignettes.json " + problem, r.stderr)
        self.assertIn(detail, r.stderr)

    def test_valid_build_ledger_and_cues(self):
        d = self.project()
        r = self.build(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        ledger = json.load(open(os.path.join(d, "ledger.json"), encoding="utf-8"))
        self.assertEqual(ledger["theme"], "toon3d")
        self.assertEqual([v["id"] for v in ledger["vignettes"]], ["roof"])
        self.assertEqual([c["t"] for c in ledger["cues"]], [3.5, 7.07, 12.56, 15.49, 20.98, 21.3, 25.51, 29.4])  # one cue per roof sfx beat
        self.assertEqual([c["sound"] for c in ledger["cues"]], ["pop", "click", "pop", "laser", "pop", "click", "pop", "laser"])

    def test_keyword_emphasis_marks_only_listed_phrases(self):
        d = self.project()
        self.assertEqual(self.build(d).returncode, 0)
        self.assertEqual(self.run_in(d, "karaoke.py").returncode, 0)
        page = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        # toon3d reveals words in the timeline, so the red colour is a timeline set on each emphasised word
        text = dict(re.findall(r'<span class="kb" id="(kb\d+)">([^<]*)</span>', page))
        red = [text[k] for k in re.findall(r'tl\.set\("#(kb\d+)", \{ color: "#DF342C"', page)]
        self.assertEqual([re.sub(r"[.,!?]+$", "", w) for w in red], ["tấm pin", "nối", "tiếp", "gấp", "mười", "nước", "rơi", "nghiêng"])
        self.assertEqual(len(red), 8)  # 5 listed phrases, 8 words

    def test_caption_lines_hold_two_to_four_words(self):
        d = self.project()
        self.assertEqual(self.build(d).returncode, 0)
        self.assertEqual(self.run_in(d, "karaoke.py").returncode, 0)
        page = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        lines = re.findall(r'<div class="kc clip[^"]*" id="kc\d+"[^>]*><span class="kin"[^>]*>(.*?)</span></div>', page)
        counts = [len(re.findall(r'<span class="kb"', body)) for body in lines]
        self.assertTrue(counts)
        self.assertTrue(all(2 <= n <= 4 for n in counts), counts)

    def test_keyword_block_is_not_spoken(self):
        d = self.project()
        self.assertEqual(self.build(d).returncode, 0)
        self.assertEqual(self.run_in(d, "karaoke.py").returncode, 0)
        page = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        self.assertNotIn("Từ khóa", page)
        self.assertNotIn("Câu 1", page)

    def test_unknown_sound_rejected(self):
        d = self.project()
        self.edit_vignettes(d, lambda rows: rows[0].update(sfx={"panels": "whoosh"}))
        self.rejects(d, "invalid sfx", "sound must be one of pop, click, laser")

    def test_sfx_beat_must_exist(self):
        d = self.project()
        self.edit_vignettes(d, lambda rows: rows[0].update(sfx={"missing": "pop"}))
        self.rejects(d, "invalid sfx", "names no beat of this vignette")

    def test_first_vignette_anchor_rejected(self):
        d = self.project()
        # the roof vignette is the first and starts at 0; an anchor on it is an error
        self.edit_vignettes(d, lambda rows: rows[0].update(anchor={"sentence": 7, "word": "Vì"}))
        r = self.build(d)
        self.assertNotEqual(r.returncode, 0, r.stdout)
        self.assertIn("vignettes.json invalid anchor", r.stderr)
        self.assertIn("remove its anchor", r.stderr)

    def test_banned_api_rejected_in_vignette(self):
        d = self.project()
        p = os.path.join(d, "vignettes", "roof.js")
        with open(p, "a", encoding="utf-8") as f:
            f.write("\nconst seed = Math.random();\n")
        r = self.build(d)
        self.assertNotEqual(r.returncode, 0, r.stdout)
        self.assertIn("roof", r.stderr + r.stdout)

    def test_template_vignettes_pass_the_ban_scan(self):
        vdir = os.path.join(ROOT, "skills", "scene-flow", "template", "themes", "toon3d", "vignettes")
        banned = [r"\brandom\b", r"\bDate\b", r"\bperformance\b", r"requestAnimationFrame", r"setTimeout", r"setInterval",
                  r"\bfetch\b", r"\b(?:https?|wss?):"]
        for dirpath, _, files in os.walk(vdir):
            for f in files:
                if not f.endswith(".js"):
                    continue
                text = open(os.path.join(dirpath, f), encoding="utf-8").read()
                for pattern in banned:
                    self.assertIsNone(re.search(pattern, text), f"{f} matches {pattern}")


if __name__ == "__main__":
    unittest.main()
