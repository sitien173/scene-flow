#!/usr/bin/env python3
# Tests for the legend2d branch of skills/scene-flow/scripts/build.py, karaoke.py and add-sfx.py. One fixture
# project is built once; the tests copy it and change one thing each.
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = tempfile.mkdtemp(prefix="legend2d-build-test-")
FIXTURE_RUN = subprocess.run(["bash", os.path.join(ROOT, "tests", "theme-fixture.sh"), TMP, "--theme", "legend2d"],
                             capture_output=True, text=True)
DEMO = os.path.join(TMP, "demo")


def run_build(project):
    return subprocess.run([sys.executable, os.path.join(project, "scripts", "build.py")], cwd=project,
                          capture_output=True, text=True)


def read(path):
    return io.open(path, encoding="utf-8").read()


def write_vignettes(project, data):
    io.open(os.path.join(project, "vignettes.json"), "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False))


class Legend2dBuild(unittest.TestCase):
    def copy(self, name):
        dst = os.path.join(TMP, name)
        shutil.rmtree(dst, ignore_errors=True)
        shutil.copytree(DEMO, dst)
        return dst

    def test_fixture_builds(self):
        self.assertEqual(FIXTURE_RUN.returncode, 0, "theme-fixture.sh --theme legend2d failed: " + FIXTURE_RUN.stderr[-400:])
        self.assertRegex(FIXTURE_RUN.stdout.strip().splitlines()[-1], r"^[0-9a-f]{64}$")

    def test_scenes_and_no_leftover_tokens(self):
        html = read(os.path.join(DEMO, "index.html"))
        for sid in ("sc-legend", "sc-cta", "sc-ec"):
            self.assertIn('id="%s"' % sid, html)
        self.assertNotIn("@@", html)
        self.assertIn('"#FFC247"', html)  # the active caption word, karaoke.py's lit_color

    def test_vignette_cuts_and_sfx_cues(self):
        ledger = json.load(io.open(os.path.join(DEMO, "ledger.json"), encoding="utf-8"))
        vignettes = ledger["vignettes"]
        cues = ledger["cues"]
        swoosh = [c["t"] for c in cues if c["sound"] == "swoosh"]
        self.assertEqual(swoosh, [v["t"] for v in vignettes[1:]], "one swoosh per vignette cut")
        pops = [c["t"] for c in cues if c["sound"] == "pop"]
        spec = json.load(io.open(os.path.join(DEMO, "vignettes.json"), encoding="utf-8"))["vignettes"]
        expected = [name for v in spec for name in v.get("sfx", {})]
        self.assertEqual(len(pops), len(expected), "one pop per vignettes.json sfx beat")

    def test_ambience_spans(self):
        ledger = json.load(io.open(os.path.join(DEMO, "ledger.json"), encoding="utf-8"))
        want = [(v["t"], v["ambience"]["file"]) for v in ledger["vignettes"] if "ambience" in v]
        self.assertEqual([f for _, f in want], ["assets/audio/amb-steps.mp3", "assets/audio/amb-dig.mp3",
                                                "assets/audio/amb-rain.mp3"])
        cues = json.load(io.open(os.path.join(DEMO, "sfx-cues.json"), encoding="utf-8"))
        cues = cues["cues"] if isinstance(cues, dict) else cues
        got = [(c["t"], c["sound"]) for c in cues if str(c["sound"]).startswith("assets/audio/amb-")]
        self.assertEqual(got, [(round(t, 3), f) for t, f in want], "one ambience span per vignette, mixed into the premix")

    def test_no_vignette_modules_needed(self):
        self.assertFalse(os.path.exists(os.path.join(DEMO, "vignettes")), "legend2d keeps its motion in stage.part")

    def test_hard_cut_on_non_silent_voice(self):
        # A tone has no quiet 20 ms window, so a neon3d cut would fail the silence rule. legend2d must build.
        project = self.copy("tone")
        voice_seconds = "81.00"  # the fixture's voice length for legend2d
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i",
                        "sine=frequency=220:sample_rate=44100:duration=" + voice_seconds,
                        "-c:a", "pcm_s16le", "-f", "wav", os.path.join(project, "assets", "audio", "voiceover.mp3")],
                       check=True)
        r = run_build(project)
        self.assertEqual(r.returncode, 0, "build failed on a tone voice: " + r.stderr[-400:])

    def test_sfx_beat_must_name_a_beat(self):
        project = self.copy("badsfx")
        spec = json.load(io.open(os.path.join(project, "vignettes.json"), encoding="utf-8"))
        spec["vignettes"][4]["sfx"] = {"nobeat": "pop"}
        write_vignettes(project, spec)
        r = run_build(project)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("names no beat", r.stderr)

    def test_caption_cues_fit_one_line(self):
        html = read(os.path.join(DEMO, "index.html"))
        cues = re.findall(r'<span class="kin" id="ki\d+">(.*?)</span></div>', html)
        self.assertTrue(cues, "no caption cues in the fixture")
        for cue in cues:
            text = re.sub(r"<[^>]+>", "", cue).strip()
            self.assertLessEqual(len(text), 16, "caption cue wider than one line at 76 px: %r" % text)

    def test_bed_is_the_ukulele(self):
        bed = re.search(r'<audio id="music-bed"[^>]*>', read(os.path.join(DEMO, "index.html"))).group(0)
        self.assertIn('src="assets/audio/bgm-ukulele.mp3"', bed)
        self.assertIn('data-volume="0.266"', bed)
        self.assertFalse(os.path.exists(os.path.join(DEMO, "assets", "audio", "bgm-ukulele-loop.mp3")))

    def test_bed_loops_with_a_crossfade_on_a_long_film(self):
        import numpy as np
        project = self.copy("longbed")
        p = os.path.join(project, "index.html")
        html = read(p)
        for el, seconds in (("root", "140.00"), ("vo", "130.00")):  # the end card follows the voice
            html = re.sub(r'(id="%s"[^>]*data-duration=")[\d.]+' % el, r"\g<1>" + seconds, html, count=1)
        io.open(p, "w", encoding="utf-8").write(html)
        r = subprocess.run([sys.executable, "scripts/add-sfx.py"], cwd=project, capture_output=True, text=True,
                           env={**os.environ, "PYTHONIOENCODING": "utf-8"})
        self.assertEqual(r.returncode, 0, r.stderr)
        loop = "assets/audio/bgm-ukulele-loop.mp3"
        self.assertIn('src="%s"' % loop, re.search(r'<audio id="music-bed"[^>]*>', read(p)).group(0))

        def decode(path):
            raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", "48000", "-"],
                                 check=True, capture_output=True).stdout
            return np.frombuffer(raw, dtype=np.float32)
        x = decode(os.path.join(project, loop))
        src = decode(os.path.join(project, "assets", "audio", "bgm-ukulele.mp3"))
        self.assertAlmostEqual(len(x) / 48000, 140.0, delta=0.1)
        # the seam keeps the bed's level: each 0.5 s window across the 2 s crossfade is within 6 dB of the source mean
        step = len(src) - 2 * 48000
        win = x[step - 48000:step + 3 * 48000].reshape(8, 24000)
        rms = 20 * np.log10(np.sqrt((win ** 2).mean(axis=1)))
        mean = 20 * np.log10(np.sqrt((src ** 2).mean()))
        self.assertLess(np.abs(rms - mean).max(), 6, rms)
        # no click: no sample step larger than the source's own
        self.assertLessEqual(np.abs(np.diff(x)).max(), np.abs(np.diff(src)).max() * 1.05)

    def test_new_project_copies_the_bed_for_legend2d_only(self):
        new_proj = os.path.join(ROOT, "skills", "scene-flow", "scripts", "new-project.py")
        for theme, want in (("legend2d", True), ("atlas3d", False), ("neon3d", False)):
            with self.subTest(theme=theme):
                out = tempfile.mkdtemp(dir=TMP)
                subprocess.run([sys.executable, new_proj, out, "--theme", theme], check=True, stdout=subprocess.DEVNULL)
                for f in ("bgm-ukulele.mp3", "amb-rain.mp3", "amb-steps.mp3", "amb-dig.mp3"):
                    self.assertEqual(os.path.isfile(os.path.join(out, "assets", "audio", f)), want, f)
                self.assertFalse(os.path.exists(os.path.join(out, "assets", "legend2d")))


if __name__ == "__main__":
    unittest.main()
