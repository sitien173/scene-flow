#!/usr/bin/env python3
# Tests for install-agy-ide.py. CLI tests run the script as a subprocess with HOME and USERPROFILE
# pointed at a temp directory, so the real home directory is never touched.
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ROOT, "install-agy-ide.py")
MARKER = ".scene-flow-agy-ide.json"

_spec = importlib.util.spec_from_file_location("install_agy_ide", SCRIPT)
installer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(installer)


def snapshot(path):
    """Map every file under path to its bytes, so a refused run can be checked as a no-op."""
    out = {}
    for dirpath, dirnames, filenames in os.walk(path):
        for name in dirnames + filenames:
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, path)
            if os.path.isdir(full):
                out[rel] = None
            else:
                with open(full, "rb") as f:
                    out[rel] = f.read()
    return out


class InstallerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = os.path.realpath(tempfile.mkdtemp(prefix="sf-agy-ide-"))
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.home = os.path.join(self.tmp, "home")
        os.mkdir(self.home)
        self.user_dst = os.path.join(self.home, ".gemini", "config", "plugins", "scene-flow")

    def run_script(self, *args, script=SCRIPT):
        env = dict(os.environ, HOME=self.home, USERPROFILE=self.home, PYTHONDONTWRITEBYTECODE="1")
        return subprocess.run([sys.executable, script, *args], env=env, capture_output=True, text=True)

    def assert_refused(self, result, reason):
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("refused:", result.stderr)
        self.assertIn(reason, result.stderr)

    def test_user_install(self):
        r = self.run_script()
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.strip(), f"installed {self.user_dst}")
        self.assertTrue(os.path.isfile(os.path.join(self.user_dst, "plugin.json")))
        self.assertTrue(os.path.isfile(os.path.join(self.user_dst, "skills", "scene-flow", "SKILL.md")))
        self.assertTrue(os.path.isfile(os.path.join(self.user_dst, MARKER)))
        for absent in ("tests", ".git", "docs", "install-agy-ide.py", "package.json"):
            self.assertFalse(os.path.lexists(os.path.join(self.user_dst, absent)), absent)
        self.assertFalse(os.path.lexists(self.user_dst + ".staging"))

    def test_reinstall_replaces_marked_install(self):
        self.assertEqual(self.run_script().returncode, 0)
        stray = os.path.join(self.user_dst, "skills", "stray.txt")
        open(stray, "w").close()
        r = self.run_script()
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.strip(), f"updated {self.user_dst}")
        self.assertFalse(os.path.exists(stray))
        self.assertTrue(os.path.isfile(os.path.join(self.user_dst, "plugin.json")))
        self.assertFalse(os.path.lexists(self.user_dst + ".staging"))
        self.assertFalse(os.path.lexists(self.user_dst + ".old"))

    def test_unmarked_destination_unchanged(self):
        os.makedirs(os.path.join(self.user_dst, "skills"))
        with open(os.path.join(self.user_dst, "plugin.json"), "w") as f:
            f.write('{"name": "scene-flow"}')
        before = snapshot(self.user_dst)
        self.assert_refused(self.run_script(), "no scene-flow marker")
        self.assertEqual(snapshot(self.user_dst), before)
        self.assert_refused(self.run_script("--uninstall"), "no scene-flow marker")
        self.assertEqual(snapshot(self.user_dst), before)

    @unittest.skipIf(os.name == "nt", "symlinks need extra privileges on Windows")
    def test_symlinked_destination_refused(self):
        target = os.path.join(self.tmp, "elsewhere")
        os.mkdir(target)
        with open(os.path.join(target, MARKER), "w") as f:
            json.dump({"owner": "scene-flow"}, f)
        os.makedirs(os.path.dirname(self.user_dst))
        os.symlink(target, self.user_dst)
        before = snapshot(target)
        self.assert_refused(self.run_script(), "link")
        self.assert_refused(self.run_script("--uninstall"), "link")
        self.assertTrue(os.path.islink(self.user_dst))
        self.assertEqual(snapshot(target), before)

    def test_project_install_and_uninstall(self):
        project = os.path.join(self.tmp, "proj")
        os.mkdir(project)
        dst = os.path.join(project, ".agents", "plugins", "scene-flow")
        r = self.run_script("--project", project)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.strip(), f"installed {dst}")
        self.assertTrue(os.path.isfile(os.path.join(dst, "skills", "scene-flow", "SKILL.md")))
        self.assertFalse(os.path.lexists(self.user_dst))
        r = self.run_script("--uninstall", "--project", project)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.strip(), f"removed {dst}")
        self.assertFalse(os.path.lexists(dst))
        self.assertFalse(os.path.lexists(dst + ".old"))

    def test_second_uninstall_not_installed(self):
        self.assertEqual(self.run_script().returncode, 0)
        self.assertEqual(self.run_script("--uninstall").returncode, 0)
        r = self.run_script("--uninstall")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.strip(), "not installed")

    def test_unmarked_leftover_staging_refused(self):
        staging = self.user_dst + ".staging"
        os.makedirs(staging)
        with open(os.path.join(staging, "keep.txt"), "w") as f:
            f.write("user data")
        before = snapshot(staging)
        self.assert_refused(self.run_script(), staging)
        self.assertEqual(snapshot(staging), before)
        self.assertFalse(os.path.lexists(self.user_dst))

    def test_marked_leftover_staging_removed(self):
        staging = self.user_dst + ".staging"
        os.makedirs(staging)
        with open(os.path.join(staging, MARKER), "w") as f:
            json.dump({"owner": "scene-flow"}, f)
        r = self.run_script()
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertFalse(os.path.lexists(staging))
        self.assertTrue(os.path.isfile(os.path.join(self.user_dst, "plugin.json")))

    def test_source_inside_destination_refused(self):
        project = os.path.join(self.tmp, "proj")
        clone = os.path.join(project, ".agents", "plugins", "scene-flow")
        os.makedirs(clone)
        script = os.path.join(clone, "install-agy-ide.py")
        shutil.copy2(SCRIPT, script)
        before = snapshot(clone)
        self.assert_refused(self.run_script("--project", project, script=script), "source")
        self.assertEqual(snapshot(clone), before)

    def test_project_requires_dir(self):
        r = self.run_script("--project")
        self.assertEqual(r.returncode, 2)


class MarkerTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="sf-agy-marker-")
        self.addCleanup(shutil.rmtree, self.dir, ignore_errors=True)
        self.path = os.path.join(self.dir, MARKER)

    def write(self, text):
        with open(self.path, "w") as f:
            f.write(text)

    def test_valid(self):
        self.write('{"owner": "scene-flow"}')
        self.assertTrue(installer.has_marker(installer.Path(self.dir)))

    def test_rejects_invalid(self):
        for text in ("not json", '{"owner": "other"}', '["scene-flow"]', ""):
            with self.subTest(text=text):
                self.write(text)
                self.assertFalse(installer.has_marker(installer.Path(self.dir)))

    @unittest.skipIf(os.name == "nt", "symlinks need extra privileges on Windows")
    def test_rejects_symlinked_marker(self):
        real = os.path.join(self.dir, "real.json")
        with open(real, "w") as f:
            f.write('{"owner": "scene-flow"}')
        os.symlink(real, self.path)
        self.assertFalse(installer.has_marker(installer.Path(self.dir)))

    def test_missing(self):
        self.assertFalse(installer.has_marker(installer.Path(self.dir)))


class IgnoreTest(unittest.TestCase):
    def test_ignore_patterns(self):
        names = ["__pycache__", "a.pyc", ".DS_Store", "Thumbs.db", "keep.py", "videos"]
        refs = os.path.join(str(installer.SRC), "skills", "scene-flow", "references")
        self.assertEqual(installer.ignore(refs, names), {"__pycache__", "a.pyc", ".DS_Store", "Thumbs.db", "videos"})
        other = os.path.join(str(installer.SRC), "skills", "scene-flow")
        self.assertEqual(installer.ignore(other, ["videos", "keep.py"]), set())


if __name__ == "__main__":
    unittest.main(verbosity=2)
