#!/usr/bin/env python3
# Tests for the neon3d branch of skills/scene-flow/scripts/build.py. One fixture project is built with
# tests/theme-fixture.sh; each case copies it, breaks one input, and runs build.py in the copy.
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


def setUpModule():
    global FIXTURE, TMP
    TMP = tempfile.mkdtemp(prefix="neon3d-build-test-")
    subprocess.run(["bash", os.path.join(ROOT, "tests", "theme-fixture.sh"), TMP, "--theme", "neon3d"],
                   check=True, stdout=subprocess.DEVNULL)
    FIXTURE = os.path.join(TMP, "demo")


def tearDownModule():
    shutil.rmtree(TMP, ignore_errors=True)


class Neon3dBuild(unittest.TestCase):
    def project(self):
        d = tempfile.mkdtemp(dir=TMP)
        shutil.rmtree(d)
        shutil.copytree(FIXTURE, d, ignore=shutil.ignore_patterns("snapshots"))
        return d

    def build(self, d):
        return subprocess.run([sys.executable, "scripts/build.py"], cwd=d, capture_output=True, text=True,
                              env={**os.environ, "PYTHONIOENCODING": "utf-8"})

    def edit_vignettes(self, d, change):
        p = os.path.join(d, "vignettes.json")
        data = json.load(open(p, encoding="utf-8"))
        change(data["vignettes"])
        json.dump(data, open(p, "w", encoding="utf-8"), ensure_ascii=False)

    def edit_words(self, d, change):
        p = os.path.join(d, "syl-times.json")
        words = json.load(open(p, encoding="utf-8"))
        change(words)
        json.dump(words, open(p, "w", encoding="utf-8"), ensure_ascii=False)

    def rejects(self, d, problem, detail):
        r = self.build(d)
        self.assertNotEqual(r.returncode, 0, r.stdout)
        self.assertIn("vignettes.json " + problem, r.stderr)
        self.assertIn(detail, r.stderr)

    def test_valid_build_prints_table_and_ledger(self):
        d = self.project()
        r = self.build(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("neon3d vignette table:", r.stdout)
        starts = dict(re.findall(r"^  (\w+)\s+\| \w+\s+\|.*\| +([\d.]+) \|", r.stdout, re.M))
        self.assertEqual(starts, {"intro": "0.00", "metr": "9.10", "hack": "17.90", "reward": "26.70", "o3": "32.30",
                                  "aware": "42.30", "monitor": "50.30", "hide": "56.70", "watch": "63.10"})
        ledger = json.load(open(os.path.join(d, "ledger.json"), encoding="utf-8"))
        self.assertEqual([s["id"] for s in ledger["seams"]], ["neon->cta", "cta->ec"])
        self.assertEqual([v["id"] for v in ledger["vignettes"]],
                         ["intro", "metr", "hack", "reward", "o3", "aware", "monitor", "hide", "watch"])
        self.assertEqual(ledger["vignettes"][3]["in"], {"kind": "fly", "dur": 0.9})

    def test_missing_anchor(self):
        d = self.project()
        self.edit_vignettes(d, lambda rows: rows[1]["anchor"].update(word="khôngcótừnày"))
        r = self.build(d)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("'metr'", r.stderr)
        self.assertIn("khôngcótừnày", r.stderr)

    def test_anchors_not_increasing(self):
        d = self.project()
        self.edit_vignettes(d, lambda rows: rows[4].update(anchor={"sentence": 2, "word": "Năm"}, beats={}))
        self.rejects(d, "anchors not strictly increasing", "'o3'")

    def test_anchor_at_or_after_cta(self):
        d = self.project()

        def late(words):
            for w in words:
                if w["i"] == 9:
                    w["s"] += 20.0  # sentence 9 then starts after the 81 s voice ends
                    w["e"] += 20.0
        self.edit_words(d, late)
        self.edit_vignettes(d, lambda rows: rows[8].update(beats={}))
        self.rejects(d, "anchor at or after cta scene start", "'watch'")

    def test_missing_module(self):
        d = self.project()
        os.remove(os.path.join(d, "vignettes", "o3.js"))
        r = self.build(d)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("o3", r.stderr)
        self.assertIn("vignettes.json", r.stderr)

    def test_banned_api(self):
        for code in ("const x = Math['random']();", "// Date.now() would make frames depend on wall time",
                     "requestAnimationFrame(update);"):
            with self.subTest(code=code):
                d = self.project()
                with open(os.path.join(d, "vignettes", "o3.js"), "a", encoding="utf-8") as f:
                    f.write("\n" + code + "\n")
                self.rejects(d, "banned API", "o3.js")

    def test_banned_api_in_model_module(self):
        d = self.project()
        os.makedirs(os.path.join(d, "vignettes", "probe"))
        with open(os.path.join(d, "vignettes", "probe", "probe.js"), "w", encoding="utf-8") as f:
            f.write("export function probe(kit) { return { t: Date.now() }; }\n")
        self.rejects(d, "banned API", os.path.join("vignettes", "probe", "probe.js"))

    def test_compressed_glb(self):
        import struct
        d = self.project()
        os.makedirs(os.path.join(d, "vignettes", "ship"))
        doc = json.dumps({"asset": {"version": "2.0"}, "extensionsUsed": ["KHR_draco_mesh_compression"]}).encode()
        doc += b" " * (-len(doc) % 4)
        with open(os.path.join(d, "vignettes", "ship", "ship.glb"), "wb") as f:
            f.write(struct.pack("<4sII", b"glTF", 2, 20 + len(doc)) + struct.pack("<II", len(doc), 0x4E4F534A) + doc)
        self.rejects(d, "unsupported GLB compression", "KHR_draco_mesh_compression")

    def test_fly_without_portal(self):
        d = self.project()
        p = os.path.join(d, "vignettes", "hack.js")
        src = open(p, encoding="utf-8").read().replace(", portal: () => board.exit", "")
        open(p, "w", encoding="utf-8").write(src)
        self.rejects(d, "fly without portal", "'reward' flies out of 'hack'")

    def test_cut_without_quiet(self):
        d = self.project()
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=44100",
                        "-t", "81", "-c:a", "pcm_s16le", "-f", "wav", "assets/audio/voiceover.mp3"], cwd=d, check=True)
        self.rejects(d, "cut outside silence", "'metr'")

    def test_more_than_three_flashes_per_second(self):
        d = self.project()

        def tight(words):
            for w in words:
                if w["i"] == 2:
                    w["s"] = round(9.1 + (w["s"] - 9.1) / 2, 2)
                    w["e"] = round(w["s"] + 0.15, 2)
        self.edit_words(d, tight)

        def flashes(rows):
            words = [w["syl"] for w in json.load(open(os.path.join(d, "syl-times.json"), encoding="utf-8")) if w["i"] == 2]
            del rows[5:]
            for k, row in enumerate(rows[1:], 0):
                row.update(anchor={"sentence": 2, "word": words[k]}, beats={}, **{"in": {"kind": "flash", "dur": 0.2}})
        self.edit_vignettes(d, flashes)
        self.rejects(d, "too many flashes", "WCAG 2.3.1")


if __name__ == "__main__":
    unittest.main()
