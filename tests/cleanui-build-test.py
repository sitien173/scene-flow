#!/usr/bin/env python3
# Tests for the cleanui branch of skills/scene-flow/scripts/build.py and add-sfx.py. One fixture project is
# built with tests/theme-fixture.sh; each case copies it, breaks one input in cues.json, and runs build.py.
import json
import os
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
    TMP = tempfile.mkdtemp(prefix="cleanui-build-test-")
    FIXTURE_RUN = subprocess.run(["bash", os.path.join(ROOT, "tests", "theme-fixture.sh"), TMP, "--theme", "cleanui"],
                                 capture_output=True, text=True)
    FIXTURE = os.path.join(TMP, "demo")


def tearDownModule():
    shutil.rmtree(TMP, ignore_errors=True)


class CleanuiBuild(unittest.TestCase):
    def project(self):
        self.assertEqual(FIXTURE_RUN.returncode, 0, "theme-fixture.sh --theme cleanui failed: " + FIXTURE_RUN.stderr[-400:])
        d = tempfile.mkdtemp(dir=TMP)
        shutil.rmtree(d)
        shutil.copytree(FIXTURE, d, ignore=shutil.ignore_patterns("snapshots"))
        return d

    def run_in(self, d, script):
        return subprocess.run([sys.executable, os.path.join("scripts", script)], cwd=d, capture_output=True, text=True,
                              env={**os.environ, "PYTHONIOENCODING": "utf-8"})

    def edit_cues(self, d, change):
        p = os.path.join(d, "cues.json")
        data = json.load(open(p, encoding="utf-8"))
        change(data)
        json.dump(data, open(p, "w", encoding="utf-8"), ensure_ascii=False)

    def rejects(self, d, detail):
        r = self.run_in(d, "build.py")
        self.assertNotEqual(r.returncode, 0, r.stdout)
        self.assertIn("cues.json", r.stderr)
        self.assertIn(detail, r.stderr)

    def test_valid_build_writes_seams_and_cues(self):
        d = self.project()
        r = self.run_in(d, "build.py")
        self.assertEqual(r.returncode, 0, r.stderr)
        ledger = json.load(open(os.path.join(d, "ledger.json"), encoding="utf-8"))
        seams = {s["id"]: s for s in ledger["seams"]}
        self.assertEqual(len(seams), 8)
        # swoosh only on chapter openers (open) and hard cuts (cut); never on slides
        self.assertTrue(seams["hook->ch1"]["swoosh"])
        self.assertTrue(seams["draft->ch2"]["swoosh"])
        self.assertTrue(seams["check->pick"]["swoosh"])
        self.assertTrue(seams["ask->ec"]["swoosh"])
        for slide in ("ch1->draft", "ch2->check", "pick->done", "done->ask"):
            self.assertFalse(seams[slide]["swoosh"], slide)
            self.assertNotIn("type", seams[slide], slide)
        self.assertEqual(seams["check->pick"]["type"], "hard")
        self.assertEqual(seams["ask->ec"]["type"], "hard")
        self.assertEqual(len(ledger["cues"]), 8)
        self.assertTrue(all(c["sound"] in ("pop", "laser", "click") for c in ledger["cues"]))

    def test_build_is_deterministic(self):
        d = self.project()
        self.assertEqual(self.run_in(d, "build.py").returncode, 0)
        first = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        self.assertEqual(self.run_in(d, "build.py").returncode, 0)
        self.assertEqual(first, open(os.path.join(d, "index.html"), encoding="utf-8").read())

    def test_rejects_beat_outside_its_scene(self):
        d = self.project()
        # ch1-mascot is a beat of ch1 (sentence 3); a word from sentence 1 falls in hook, not ch1
        self.edit_cues(d, lambda c: c["beats"].update({"ch1-mascot": {"sentence": 1, "word": "làm"}}))
        self.rejects(d, "beat outside its scene")

    def test_rejects_scenes_out_of_order(self):
        d = self.project()
        self.edit_cues(d, lambda c: c["scenes"][2].update({"at": {"sentence": 2, "word": "Mỗi"}}))
        self.rejects(d, "scenes not in order")

    def test_rejects_unknown_sound(self):
        d = self.project()
        self.edit_cues(d, lambda c: c["sfx"].append({"beat": "ch1-mascot", "sound": "whoosh"}))
        self.rejects(d, "each sfx needs beat")

    def test_rejects_anchor_word_not_in_sentence(self):
        d = self.project()
        self.edit_cues(d, lambda c: c["beats"].update({"ask-send": {"sentence": 9, "word": "zzz"}}))
        self.rejects(d, "anchor not found")

    def test_rejects_scene_id_ec(self):
        d = self.project()
        self.edit_cues(d, lambda c: c["scenes"][1].update({"id": "ec"}))
        self.rejects(d, "invalid scene id")

    def test_page_has_one_tail_pin_and_caption_container(self):
        d = self.project()
        self.assertEqual(self.run_in(d, "build.py").returncode, 0)
        self.assertEqual(self.run_in(d, "karaoke.py").returncode, 0)
        page = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        self.assertEqual(page.count('id="kara"'), 1)
        self.assertEqual(page.count("tl.set({}, {}, 38.85);"), 1)
        self.assertNotIn("@@", page)


if __name__ == "__main__":
    unittest.main()
