#!/usr/bin/env python3
# Tests for skills/scene-flow/scripts/postiz.py. CLI tests run the script as a subprocess from a
# temp project directory against a fake Postiz server (http.server in a background thread).
import contextlib
import datetime
import email
import email.policy
import hashlib
import http.server
import importlib.util
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.parse
from unittest import mock

sys.dont_write_bytecode = True

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ROOT, "skills", "scene-flow", "scripts", "postiz.py")
TEMPLATE = os.path.join(ROOT, "skills", "scene-flow", "template", "postiz.json")
KEY = "sentinel-key-123"

_spec = importlib.util.spec_from_file_location("postiz", SCRIPT)
postiz = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(postiz)

# Verified facts. Each value must carry a source comment or an unverified mark in postiz.py.
EXPECTED_CONSTANTS = {
    "PLATFORM_IDENTIFIERS": {
        "tiktok": ("tiktok",),
        "instagram": ("instagram", "instagram-standalone"),
        "youtube": ("youtube",),
    },
    "TIKTOK_TITLE_LIMIT": 90,
    "YOUTUBE_TITLE_MIN": 2,
    "YOUTUBE_TITLE_LIMIT": 100,
    "CAPTION_LIMIT": 2200,
    "INSTAGRAM_HASHTAG_LIMIT": 5,
    "YOUTUBE_SHORTS_MAX_SECONDS": 180,
    "INSTAGRAM_WARN_SECONDS": 60,
    "YOUTUBE_VISIBILITY": "public",
    "INSTAGRAM_POST_TYPE": "post",
}

INTEGRATIONS = [
    {"id": "tt-1", "name": "Scene TikTok", "identifier": "tiktok", "disabled": False},
    {"id": "ig-1", "name": "Scene Reels", "identifier": "instagram", "disabled": False},
    {"id": "yt-1", "name": "Scene Channel", "identifier": "youtube", "disabled": False},
]

FAKE = None
# Empty config home so a real ~/.config/scene-flow/.env never leaks into the tests.
NO_CONFIG = tempfile.mkdtemp(prefix="postiz-config-")
FAKE_HOST = None
FIXTURE_DIR = None


class FakePostiz:
    """Serves GET /public/v1/integrations and records every request line. With redirect_to set, answers 302.

    queued maps a POST path to steps consumed in order: (status, body), ("sleep", seconds), or
    ("truncate", status, body). A sleep step writes no response, so the client times out. A truncate
    step declares a Content-Length larger than the body it sends. bodies keeps (path, headers, raw body)
    per POST.
    """

    def __init__(self, integrations, redirect_to=None):
        self.integrations = integrations
        self.redirect_to = redirect_to
        self.requests = []
        self.queued = {}
        self.bodies = []
        fake = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def _send(self, status, body):
                data = json.dumps(body).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self):
                fake.requests.append(("GET", self.path))
                if fake.redirect_to:
                    self.send_response(302)
                    self.send_header("Location", fake.redirect_to)
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
                if self.headers.get("Authorization") != KEY:
                    return self._send(401, {"message": "Unauthorized"})
                if self.path == "/public/v1/integrations":
                    return self._send(200, fake.integrations)
                self._send(404, {"message": "not found"})

            def do_POST(self):
                fake.requests.append(("POST", self.path))
                body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
                fake.bodies.append((self.path, self.headers, body))
                if self.headers.get("Authorization") != KEY:
                    return self._send(401, {"message": "Unauthorized"})
                queued = fake.queued.get(self.path)
                if queued:
                    step = queued.pop(0)
                    if step[0] == "sleep":
                        return time.sleep(step[1])
                    if step[0] == "truncate":
                        data = json.dumps(step[2]).encode("utf-8")
                        self.send_response(step[1])
                        self.send_header("Content-Type", "application/json")
                        self.send_header("Content-Length", str(len(data) + 100))
                        self.end_headers()
                        return self.wfile.write(data)
                    return self._send(*step)
                if self.path == "/public/v1/upload":
                    return self._send(200, {"id": "media-1", "path": "https://example.test/media-1.mp4"})
                if self.path == "/public/v1/posts":
                    return self._send(200, [{"postId": "post-1", "integration": "tt-1"}])
                self._send(404, {"message": "not found"})

        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def start(self):
        self.thread.start()
        return self

    def stop(self):
        self.server.shutdown()
        self.server.server_close()

    def sent_to(self, suffix):
        return [request for request in self.requests if request[1].endswith(suffix)]

    def queue(self, path, *steps):
        self.queued.setdefault(path, []).extend(steps)


def make_mp4(path, size="108x192", seconds=1, audio=True, video_codec="libx264"):
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=black:s={size}:d={seconds}:r=1"]
    if audio:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-shortest", "-c:a", "aac"]
    else:
        cmd += ["-an"]
    cmd += ["-c:v", video_codec, "-pix_fmt", "yuv420p", path]
    subprocess.run(cmd, check=True)


def setUpModule():
    global FAKE, FAKE_HOST, FIXTURE_DIR
    FAKE = FakePostiz(INTEGRATIONS).start()
    FAKE_HOST = urllib.parse.urlparse(FAKE.url).netloc
    FIXTURE_DIR = tempfile.mkdtemp(prefix="postiz-fixtures-")
    make_mp4(os.path.join(FIXTURE_DIR, "portrait.mp4"))
    make_mp4(os.path.join(FIXTURE_DIR, "landscape.mp4"), size="192x108")
    make_mp4(os.path.join(FIXTURE_DIR, "silent.mp4"), audio=False)
    make_mp4(os.path.join(FIXTURE_DIR, "mpeg4.mp4"), video_codec="mpeg4")
    make_mp4(os.path.join(FIXTURE_DIR, "long61.mp4"), seconds=61)
    make_mp4(os.path.join(FIXTURE_DIR, "long181.mp4"), seconds=181)
    open(os.path.join(FIXTURE_DIR, "empty.mp4"), "wb").close()


def tearDownModule():
    FAKE.stop()
    shutil.rmtree(FIXTURE_DIR, ignore_errors=True)


def make_project(root, fixture=None, config=None, sources=None):
    """Write postiz.json, index.html, and assets/SOURCES.md, then copy the fixture to video.mp4."""
    os.makedirs(os.path.join(root, "assets"), exist_ok=True)
    data = {
        "caption": "A caption",
        "hashtags": ["scene", "#flow"],
        "ai_generated": False,
        "youtube_title": "A Short title",
        "channels": ["tiktok", "instagram", "youtube"],
    }
    data.update(config or {})
    with open(os.path.join(root, "postiz.json"), "w", encoding="utf-8") as out:
        json.dump(data, out)
    with open(os.path.join(root, "index.html"), "w", encoding="utf-8") as out:
        out.write("<html></html>\n")
    with open(os.path.join(root, "assets", "SOURCES.md"), "w", encoding="utf-8") as out:
        out.write(sources or "# Sources\n\n- hero.png: CC0\n")
    if fixture:
        shutil.copy(os.path.join(FIXTURE_DIR, fixture), os.path.join(root, "video.mp4"))
    return root


def run_cli(project, *args, **env):
    """Run postiz.py in project. Keyword arguments override environment variables; None removes one."""
    base = {k: v for k, v in os.environ.items() if not k.startswith("POSTIZ_")}
    base.update(POSTIZ_URL=FAKE.url, POSTIZ_API_KEY=KEY, XDG_CONFIG_HOME=NO_CONFIG)
    base.update(env)
    base = {k: v for k, v in base.items() if v is not None}
    return subprocess.run(
        [sys.executable, SCRIPT, *args], cwd=project, env=base, capture_output=True, text=True, timeout=120
    )


def env_with(**values):
    env = {k: v for k, v in os.environ.items() if not k.startswith("POSTIZ_")}
    env["XDG_CONFIG_HOME"] = NO_CONFIG
    env.update({k: v for k, v in values.items() if v is not None})
    return mock.patch.dict(os.environ, env, clear=True)


class ProjectTestCase(unittest.TestCase):
    """Each test gets a fresh project directory and an empty request log on the fake server."""

    def setUp(self):
        FAKE.requests.clear()
        FAKE.queued.clear()
        FAKE.bodies.clear()
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.project = os.path.join(tmp.name, "project")
        os.makedirs(self.project)


class ConstantsTests(unittest.TestCase):
    def test_values_match_verified_facts(self):
        for name, expected in EXPECTED_CONSTANTS.items():
            with self.subTest(name=name):
                self.assertEqual(getattr(postiz, name), expected)

    def test_every_constant_has_source_or_unverified_mark(self):
        with open(SCRIPT, encoding="utf-8") as script:
            lines = script.read().splitlines()
        for name in EXPECTED_CONSTANTS:
            with self.subTest(name=name):
                idx = next((i for i, line in enumerate(lines) if line.startswith(f"{name} = ")), None)
                self.assertIsNotNone(idx, f"{name} is not defined at module level")
                comment = []
                i = idx - 1
                while i >= 0 and lines[i].startswith("#"):
                    comment.append(lines[i])
                    i -= 1
                text = " ".join(comment).lower()
                self.assertTrue("source" in text or "unverified" in text, f"{name} has no source comment")


class ConfigTests(unittest.TestCase):
    def config(self, url, key=KEY):
        with env_with(POSTIZ_URL=url, POSTIZ_API_KEY=key):
            return postiz.get_config()

    def test_missing_url_and_key_exit_naming_both(self):
        with env_with(POSTIZ_URL=None, POSTIZ_API_KEY=None):
            with self.assertRaises(SystemExit) as caught:
                postiz.get_config()
        self.assertIn("POSTIZ_URL", caught.exception.args[0])
        self.assertIn("POSTIZ_API_KEY", caught.exception.args[0])

    def test_missing_key_exits(self):
        with env_with(POSTIZ_URL="https://api.example.com", POSTIZ_API_KEY=None):
            with self.assertRaises(SystemExit) as caught:
                postiz.get_config()
        self.assertIn("POSTIZ_API_KEY", caught.exception.args[0])

    def test_missing_url_exits(self):
        with env_with(POSTIZ_URL=None, POSTIZ_API_KEY=KEY):
            with self.assertRaises(SystemExit) as caught:
                postiz.get_config()
        self.assertIn("POSTIZ_URL", caught.exception.args[0])

    def test_plain_http_rejected_for_remote_host(self):
        with self.assertRaises(SystemExit) as caught:
            self.config("http://postiz.example.com")
        self.assertIn("https", caught.exception.args[0])

    def test_scheme_missing_rejected(self):
        with self.assertRaises(SystemExit):
            self.config("api.example.com")

    def test_http_allowed_for_localhost_and_loopback(self):
        for url in ("http://localhost:5000", "http://127.0.0.1:5000"):
            with self.subTest(url=url):
                self.assertEqual(self.config(url)[0], url)

    def test_uppercase_https_accepted(self):
        self.assertEqual(self.config("HTTPS://Api.Example.com")[0], "HTTPS://Api.Example.com")

    def test_trailing_slash_stripped(self):
        self.assertEqual(self.config("https://api.example.com/")[0], "https://api.example.com")

    def test_key_returned_unchanged(self):
        self.assertEqual(self.config("https://api.example.com")[1], KEY)

    def test_userinfo_rejected_without_echoing_it(self):
        with self.assertRaises(SystemExit) as caught:
            self.config("https://user:hunter2@api.example.com")
        message = caught.exception.args[0]
        self.assertIn("POSTIZ_URL", message)
        self.assertNotIn("hunter2", message)
        self.assertNotIn("user:", message)


class ConfigFileTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.home = tmp.name
        os.makedirs(os.path.join(self.home, "scene-flow"))
        self.path = os.path.join(self.home, "scene-flow", ".env")

    def write(self, text, mode=0o600):
        with open(self.path, "w", encoding="utf-8") as out:
            out.write(text)
        os.chmod(self.path, mode)

    def config(self, **env):
        with env_with(XDG_CONFIG_HOME=self.home, **env):
            return postiz.get_config()

    def test_file_used_when_environment_is_empty(self):
        self.write(f'FREESOUND_API_KEY=other\n# Postiz\nPOSTIZ_URL="https://api.example.com/"\nexport POSTIZ_API_KEY={KEY}\n')
        self.assertEqual(self.config(), ("https://api.example.com", KEY))

    def test_environment_overrides_file(self):
        self.write(f"POSTIZ_URL=https://file.example.com\nPOSTIZ_API_KEY=file-key\n")
        self.assertEqual(self.config(POSTIZ_API_KEY=KEY), ("https://file.example.com", KEY))

    @unittest.skipUnless(os.name == "posix", "permission bits are POSIX only")
    def test_file_readable_by_others_refused(self):
        self.write(f"POSTIZ_URL=https://api.example.com\nPOSTIZ_API_KEY={KEY}\n", mode=0o644)
        with self.assertRaises(SystemExit) as caught:
            self.config()
        self.assertIn("chmod 600", caught.exception.args[0])
        self.assertNotIn(KEY, caught.exception.args[0])

    def test_missing_message_names_file(self):
        with self.assertRaises(SystemExit) as caught:
            self.config()
        self.assertIn(self.path, caught.exception.args[0])


class ResolutionTests(unittest.TestCase):
    def setUp(self):
        self.integrations = [
            {"id": "tt-1", "name": "Scene TikTok", "identifier": "tiktok", "disabled": False},
            {"id": "ig-1", "name": "Scene Reels", "identifier": "instagram-standalone", "disabled": False},
            {"id": "yt-1", "name": "Scene Channel", "identifier": "youtube", "disabled": False},
        ]

    def ids(self, names, integrations=None):
        return [c["id"] for c in postiz.resolve_channels(names, integrations or self.integrations)]

    def test_exact_id_matches(self):
        self.assertEqual(self.ids(["ig-1"]), ["ig-1"])

    def test_single_platform_match(self):
        self.assertEqual(self.ids(["tiktok"]), ["tt-1"])

    def test_instagram_matches_standalone_identifier(self):
        self.assertEqual(self.ids(["instagram"]), ["ig-1"])

    def test_result_keeps_entry_order(self):
        self.assertEqual(self.ids(["youtube", "tt-1"]), ["yt-1", "tt-1"])

    def test_ambiguous_platform_lists_matches(self):
        integrations = self.integrations + [
            {"id": "yt-2", "name": "Second Channel", "identifier": "youtube", "disabled": False},
        ]
        with self.assertRaises(SystemExit) as caught:
            self.ids(["youtube"], integrations)
        message = caught.exception.args[0]
        self.assertIn("yt-1", message)
        self.assertIn("yt-2", message)
        self.assertIn("Second Channel", message)

    def test_unknown_platform_exits(self):
        with self.assertRaises(SystemExit) as caught:
            self.ids(["facebook"])
        self.assertIn("no channel matches", caught.exception.args[0])

    def test_disabled_channels_skipped(self):
        self.integrations[2]["disabled"] = True
        self.integrations.append({"id": "yt-2", "name": "Second Channel", "identifier": "youtube", "disabled": False})
        self.assertEqual(self.ids(["youtube"]), ["yt-2"])

    def test_disabled_id_does_not_match(self):
        self.integrations[2]["disabled"] = True
        with self.assertRaises(SystemExit) as caught:
            self.ids(["yt-1"])
        self.assertIn("no channel matches", caught.exception.args[0])


class ProjectConfigTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.path = os.path.join(tmp.name, "postiz.json")

    def test_missing_file_exits_naming_it(self):
        with self.assertRaises(SystemExit) as caught:
            postiz.load_project_config(self.path)
        self.assertIn("postiz.json", caught.exception.args[0])

    def test_invalid_json_exits_naming_it(self):
        with open(self.path, "w", encoding="utf-8") as out:
            out.write("{")
        with self.assertRaises(SystemExit) as caught:
            postiz.load_project_config(self.path)
        self.assertIn("postiz.json", caught.exception.args[0])

    def test_valid_file_is_returned(self):
        with open(self.path, "w", encoding="utf-8") as out:
            json.dump({"caption": "hi", "channels": ["tiktok"]}, out)
        self.assertEqual(postiz.load_project_config(self.path), {"caption": "hi", "channels": ["tiktok"]})


class ChannelsCommandTests(ProjectTestCase):
    def test_prints_one_line_per_channel_without_key(self):
        result = run_cli(self.project, "channels")
        self.assertEqual(result.returncode, 0, result.stderr)
        lines = result.stdout.strip().splitlines()
        self.assertEqual(len(lines), len(INTEGRATIONS))
        for channel in INTEGRATIONS:
            with self.subTest(channel=channel["id"]):
                line = next(line for line in lines if channel["id"] in line)
                self.assertIn(channel["identifier"], line)
                self.assertIn(channel["name"], line)
        self.assertNotIn(KEY, result.stdout + result.stderr)


class CliArgumentTests(ProjectTestCase):
    def test_schedule_and_now_rejected(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4", "--schedule", "2099-01-01T10:00:00+00:00", "--now")
        self.assertEqual(result.returncode, 2)
        self.assertIn("not allowed with", result.stderr)
        self.assertEqual(FAKE.requests, [])

    def test_file_without_mp4_extension_blocked(self):
        make_project(self.project, "portrait.mp4")
        os.rename(os.path.join(self.project, "video.mp4"), os.path.join(self.project, "clip.mkv"))
        result = run_cli(self.project, "clip.mkv", "--dry-run")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(".mp4", result.stderr)
        self.assertEqual(FAKE.requests, [])

    def test_mp4_required_for_non_channels_run(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "--dry-run")
        self.assertEqual(result.returncode, 2)
        self.assertIn("mp4", result.stderr)


class DryRunTests(ProjectTestCase):
    def test_prints_target_and_planned_post(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        first, _, body = result.stdout.partition("\n")
        self.assertEqual(first, f"uploads to {FAKE_HOST}")
        plan = json.loads(body)
        self.assertEqual(plan["type"], "draft")
        self.assertEqual(plan["shortLink"], False)
        self.assertEqual(plan["tags"], [])
        self.assertEqual([p["integration"]["id"] for p in plan["posts"]], ["tt-1", "ig-1", "yt-1"])
        self.assertEqual([p["settings"]["__type"] for p in plan["posts"]], ["tiktok", "instagram", "youtube"])
        self.assertEqual(plan["posts"][0]["value"][0]["content"], "A caption\n\n#scene #flow")
        self.assertEqual(plan["posts"][0]["settings"]["title"], "A caption")
        self.assertEqual(plan["posts"][0]["settings"]["content_posting_method"], "DIRECT_POST")
        self.assertEqual(plan["posts"][1]["settings"]["post_type"], "post")
        self.assertEqual(plan["posts"][2]["settings"]["title"], "A Short title")
        self.assertEqual(plan["posts"][2]["settings"]["type"], postiz.YOUTUBE_VISIBILITY)

    def test_sends_no_upload_or_post_request(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(FAKE.requests, [("GET", "/public/v1/integrations")])

    def test_schedule_sets_post_type(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4", "--dry-run", "--schedule", "2099-01-01T10:00:00+07:00")
        self.assertEqual(result.returncode, 0, result.stderr)
        plan = json.loads(result.stdout.partition("\n")[2])
        self.assertEqual(plan["type"], "schedule")
        self.assertTrue(plan["date"].startswith("2099-01-01T10:00:00"))

    def test_clean_run_has_no_warnings(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")


BLOCKS = [
    ("missing file", None, {}, None, [], "does not exist"),
    ("empty file", "empty.mp4", {}, None, [], "empty"),
    ("16:9 frame", "landscape.mp4", {}, None, [], "9:16"),
    ("non-h264 video", "mpeg4.mp4", {}, None, [], "h264"),
    ("no audio stream", "silent.mp4", {}, None, [], "audio"),
    ("ai_generated null", "portrait.mp4", {"ai_generated": None}, None, [], "ai_generated"),
    ("ai_generated string", "portrait.mp4", {"ai_generated": "false"}, None, [], "ai_generated"),
    ("ai false but sources say AI", "portrait.mp4", {}, "- scene.png: AI-generated (model X)\n", [], "SOURCES.md"),
    ("schedule without offset", "portrait.mp4", {}, None, ["--schedule", "2099-01-01T10:00:00"], "offset"),
    ("schedule in the past", "portrait.mp4", {}, None, ["--schedule", "2001-01-01T10:00:00+00:00"], "past"),
    ("schedule not ISO", "portrait.mp4", {}, None, ["--schedule", "tomorrow"], "ISO 8601"),
]

# Platform checks run after channel resolution, so each case has one read-only GET and nothing else.
PLATFORM_BLOCKS = [
    ("youtube title empty", "portrait.mp4", {"youtube_title": ""}, None, [], "youtube_title"),
    (
        "youtube title over limit",
        "portrait.mp4",
        {"youtube_title": "x" * (postiz.YOUTUBE_TITLE_LIMIT + 1)},
        None,
        [],
        "youtube_title",
    ),
    (
        "youtube title under minimum",
        "portrait.mp4",
        {"youtube_title": "x" * (postiz.YOUTUBE_TITLE_MIN - 1)},
        None,
        [],
        "youtube_title",
    ),
    ("caption over limit", "portrait.mp4", {"caption": "x" * (postiz.CAPTION_LIMIT + 1)}, None, [], "caption"),
    (
        "hashtags over Instagram limit",
        "portrait.mp4",
        {"hashtags": [f"t{i}" for i in range(postiz.INSTAGRAM_HASHTAG_LIMIT + 1)]},
        None,
        [],
        "hashtags",
    ),
]


class PreflightBlockTests(ProjectTestCase):
    def test_each_block_exits_non_zero_before_any_request(self):
        for name, fixture, config, sources, extra, fragment in BLOCKS:
            with self.subTest(case=name):
                FAKE.requests.clear()
                make_project(self.project, fixture, config=config, sources=sources)
                result = run_cli(self.project, "video.mp4", "--dry-run", *extra)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(fragment, result.stderr)
                self.assertEqual(FAKE.requests, [])
                shutil.rmtree(self.project)

    def test_each_platform_block_exits_non_zero_after_resolution_only(self):
        for name, fixture, config, sources, extra, fragment in PLATFORM_BLOCKS:
            with self.subTest(case=name):
                FAKE.requests.clear()
                make_project(self.project, fixture, config=config, sources=sources)
                result = run_cli(self.project, "video.mp4", "--dry-run", *extra)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(fragment, result.stderr)
                self.assertEqual(FAKE.requests, [("GET", "/public/v1/integrations")])
                shutil.rmtree(self.project)


class PlatformScopeTests(ProjectTestCase):
    def test_tiktok_only_ignores_empty_youtube_title(self):
        make_project(self.project, "portrait.mp4", config={"channels": ["tiktok"], "youtube_title": ""})
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        plan = json.loads(result.stdout.partition("\n")[2])
        self.assertEqual([p["integration"]["id"] for p in plan["posts"]], ["tt-1"])

    def test_tiktok_only_ignores_instagram_hashtag_limit(self):
        hashtags = [f"t{i}" for i in range(postiz.INSTAGRAM_HASHTAG_LIMIT + 1)]
        make_project(self.project, "portrait.mp4", config={"channels": ["tiktok"], "hashtags": hashtags})
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_instagram_only_ignores_empty_youtube_title(self):
        make_project(self.project, "portrait.mp4", config={"channels": ["instagram"], "youtube_title": ""})
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_youtube_only_ignores_instagram_hashtag_limit(self):
        hashtags = [f"t{i}" for i in range(postiz.INSTAGRAM_HASHTAG_LIMIT + 1)]
        make_project(self.project, "portrait.mp4", config={"channels": ["youtube"], "hashtags": hashtags})
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_youtube_only_empty_title_blocks(self):
        make_project(self.project, "portrait.mp4", config={"channels": ["youtube"], "youtube_title": ""})
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("youtube_title", result.stderr)
        self.assertEqual(FAKE.requests, [("GET", "/public/v1/integrations")])


class RedirectTests(ProjectTestCase):
    def test_redirect_is_refused_and_key_not_forwarded(self):
        target = FakePostiz(INTEGRATIONS).start()
        self.addCleanup(target.stop)
        origin = FakePostiz(INTEGRATIONS, redirect_to=f"{target.url}/public/v1/integrations").start()
        self.addCleanup(origin.stop)
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4", "--dry-run", POSTIZ_URL=origin.url)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("redirected", result.stderr)
        self.assertEqual(origin.requests, [("GET", "/public/v1/integrations")])
        self.assertEqual(target.requests, [])
        self.assertNotIn(KEY, result.stdout + result.stderr)


class PreflightWarningTests(ProjectTestCase):
    def assert_warns(self, fragment, **kwargs):
        make_project(self.project, **kwargs)
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("warning", result.stderr)
        self.assertIn(fragment, result.stderr)
        self.assertTrue(result.stdout.startswith(f"uploads to {FAKE_HOST}"))

    def test_instagram_duration_warning(self):
        self.assert_warns("Instagram", fixture="long61.mp4")

    def test_shorts_duration_warning(self):
        self.assert_warns("Shorts", fixture="long181.mp4")

    def test_ai_true_warns_about_manual_label(self):
        self.assert_warns("by hand", fixture="portrait.mp4", config={"ai_generated": True})

    def test_mp4_older_than_index_warns(self):
        make_project(self.project, "portrait.mp4")
        index_time = os.path.getmtime(os.path.join(self.project, "index.html"))
        os.utime(os.path.join(self.project, "video.mp4"), (index_time - 7200, index_time - 7200))
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("index.html", result.stderr)


class SecretHandlingTests(ProjectTestCase):
    def assert_no_key_in_project(self):
        for dirpath, _, files in os.walk(self.project):
            for name in files:
                with open(os.path.join(dirpath, name), "rb") as handle:
                    self.assertNotIn(KEY.encode(), handle.read(), name)

    def test_sentinel_absent_from_output_and_files(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("uploads to", result.stdout)
        self.assertNotIn(KEY, result.stdout + result.stderr)
        self.assert_no_key_in_project()

    def test_sentinel_absent_from_blocked_run(self):
        make_project(self.project, "portrait.mp4", config={"ai_generated": None})
        result = run_cli(self.project, "video.mp4", "--dry-run")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(KEY, result.stdout + result.stderr)
        self.assert_no_key_in_project()

    def run_with_key_in_filename(self, fixture):
        make_project(self.project, fixture)
        os.rename(os.path.join(self.project, "video.mp4"), os.path.join(self.project, f"{KEY}.mp4"))
        return run_cli(self.project, f"{KEY}.mp4", "--dry-run")

    def test_key_in_filename_redacted_from_warnings(self):
        result = self.run_with_key_in_filename("long61.mp4")
        self.assertIn("warning", result.stderr)
        self.assertNotIn(KEY, result.stdout + result.stderr)

    def test_key_in_filename_redacted_from_blocks(self):
        result = self.run_with_key_in_filename("landscape.mp4")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(KEY, result.stdout + result.stderr)


def sha_of(path):
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def write_receipt(project, digest, post_type="draft"):
    with open(os.path.join(project, "postiz-receipt.json"), "w", encoding="utf-8") as out:
        json.dump({"sha256": digest, "type": post_type, "postIds": ["post-0"]}, out)


def posted_json(suffix):
    """Decoded JSON bodies of every POST whose path ends with suffix."""
    return [json.loads(body) for path, _, body in FAKE.bodies if path.endswith(suffix)]


def run_main(project, argv, **env):
    """Call postiz.main in this process with cwd at project. Returns (exit code or message, stdout, stderr)."""
    out, err = io.StringIO(), io.StringIO()
    cwd = os.getcwd()
    os.chdir(project)
    try:
        values = {"POSTIZ_URL": FAKE.url, "POSTIZ_API_KEY": KEY, **env}
        with env_with(**values), contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            try:
                postiz.main(argv)
            except SystemExit as caught:
                if isinstance(caught.code, str):
                    err.write(caught.code + "\n")
                return caught.code, out.getvalue(), err.getvalue()
    finally:
        os.chdir(cwd)
    return 0, out.getvalue(), err.getvalue()


class RealRunPayloadTests(ProjectTestCase):
    def test_draft_posts_one_payload_to_all_channels(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4")
        self.assertEqual(result.returncode, 0, result.stderr)
        [plan] = posted_json("/public/v1/posts")
        self.assertEqual(plan["type"], "draft")
        self.assertIs(plan["shortLink"], False)
        self.assertEqual(plan["tags"], [])
        self.assertEqual([p["integration"]["id"] for p in plan["posts"]], ["tt-1", "ig-1", "yt-1"])
        for post in plan["posts"]:
            with self.subTest(channel=post["integration"]["id"]):
                media = [{"id": "media-1", "path": "https://example.test/media-1.mp4"}]
                self.assertEqual(post["value"][0]["image"], media)
        sent = datetime.datetime.fromisoformat(plan["date"])
        self.assertLess(abs((datetime.datetime.now(datetime.timezone.utc) - sent).total_seconds()), 300)

    def test_schedule_uses_given_date(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4", "--schedule", "2099-01-01T10:00:00+07:00")
        self.assertEqual(result.returncode, 0, result.stderr)
        [plan] = posted_json("/public/v1/posts")
        self.assertEqual(plan["type"], "schedule")
        self.assertTrue(plan["date"].startswith("2099-01-01T10:00:00"))

    def test_now_sets_type_now(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4", "--now")
        self.assertEqual(result.returncode, 0, result.stderr)
        [plan] = posted_json("/public/v1/posts")
        self.assertEqual(plan["type"], "now")
        self.assertEqual(len(plan["posts"]), 3)

    def test_multipart_upload_has_boundary_filename_and_mime(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4")
        self.assertEqual(result.returncode, 0, result.stderr)
        [(_, headers, body)] = [b for b in FAKE.bodies if b[0].endswith("/public/v1/upload")]
        self.assertEqual(headers["Authorization"], KEY)
        boundary = headers["Content-Type"].split("boundary=", 1)[1]
        self.assertTrue(headers["Content-Type"].startswith("multipart/form-data"))
        self.assertTrue(body.startswith(f"--{boundary}\r\n".encode()))
        self.assertTrue(body.endswith(f"\r\n--{boundary}--\r\n".encode()))
        self.assertIn(b'Content-Disposition: form-data; name="file"; filename="video.mp4"\r\n', body)
        self.assertIn(b"Content-Type: video/mp4\r\n\r\n", body)
        with open(os.path.join(FIXTURE_DIR, "portrait.mp4"), "rb") as handle:
            self.assertIn(handle.read(), body)


class RealRunRetryTests(ProjectTestCase):
    def test_upload_retried_once_then_succeeds(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/upload", (503, {"message": "busy"}))
        result = run_cli(self.project, "video.mp4")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/upload")), 2)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)

    def test_upload_fails_after_second_transient_error(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/upload", (500, {"message": "boom"}), (502, {"message": "bad gateway"}))
        result = run_cli(self.project, "video.mp4")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(len(FAKE.sent_to("/public/v1/upload")), 2)
        self.assertEqual(FAKE.sent_to("/public/v1/posts"), [])
        self.assertFalse(os.path.exists(os.path.join(self.project, "postiz-receipt.json")))

    def test_post_5xx_sends_one_request_and_reports_outcome_unknown(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/posts", (500, {"message": "boom"}))
        result = run_cli(self.project, "video.mp4")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("outcome unknown, check Postiz before re-running", result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)
        self.assertFalse(os.path.exists(os.path.join(self.project, "postiz-receipt.json")))

    def test_post_timeout_sends_one_request_and_reports_outcome_unknown(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/posts", ("sleep", 2))
        with mock.patch.object(postiz, "TIMEOUT_POST", 0.5):
            code, _, err = run_main(self.project, ["video.mp4"])
        self.assertNotEqual(code, 0)
        self.assertIn("outcome unknown, check Postiz before re-running", err)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)
        self.assertFalse(os.path.exists(os.path.join(self.project, "postiz-receipt.json")))


class RealRunErrorTests(ProjectTestCase):
    def test_post_400_prints_postiz_message_without_retry(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/posts", (400, {"message": "Video is too short for TikTok"}))
        result = run_cli(self.project, "video.mp4")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Video is too short for TikTok", result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)

    def test_post_401_names_key_variable_without_echoing_key(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/posts", (401, {"message": "Unauthorized"}))
        result = run_cli(self.project, "video.mp4")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("POSTIZ_API_KEY", result.stderr)
        self.assertNotIn(KEY, result.stdout + result.stderr)

    def test_upload_413_names_body_size_limit_and_is_not_retried(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/upload", (413, {"message": "Payload Too Large"}))
        result = run_cli(self.project, "video.mp4")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("client_max_body_size", result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/upload")), 1)
        self.assertEqual(FAKE.sent_to("/public/v1/posts"), [])

    def test_post_429_says_try_later_and_is_not_retried(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/posts", (429, {"message": "Too Many Requests"}))
        result = run_cli(self.project, "video.mp4")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("hourly create-post limit", result.stderr)
        self.assertIn("later", result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)


class TruncatedResponseTests(ProjectTestCase):
    def test_truncated_post_response_sends_one_request_and_reports_outcome_unknown(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/posts", ("truncate", 200, [{"postId": "post-1", "integration": "tt-1"}]))
        result = run_cli(self.project, "video.mp4")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("outcome unknown, check Postiz before re-running", result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)
        self.assertFalse(os.path.exists(os.path.join(self.project, "postiz-receipt.json")))

    def test_truncated_upload_response_is_retried_once(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/upload", ("truncate", 200, {"id": "media-1", "path": "https://example.test/x.mp4"}))
        result = run_cli(self.project, "video.mp4")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/upload")), 2)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)


class KeyRedactionTests(ProjectTestCase):
    def test_key_echoed_in_post_400_is_redacted(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/posts", (400, {"message": f"bad request, token {KEY} not accepted"}))
        result = run_cli(self.project, "video.mp4")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("<redacted>", result.stderr)
        self.assertNotIn(KEY, result.stdout + result.stderr)

    def test_key_echoed_in_upload_400_is_redacted(self):
        make_project(self.project, "portrait.mp4")
        FAKE.queue("/public/v1/upload", (400, {"message": [f"file rejected for {KEY}"]}))
        result = run_cli(self.project, "video.mp4")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("<redacted>", result.stderr)
        self.assertNotIn(KEY, result.stdout + result.stderr)


class MultipartFilenameTests(ProjectTestCase):
    def test_filename_with_quote_and_backslash_round_trips(self):
        make_project(self.project, "portrait.mp4")
        name = 'clip "one" \\ two.mp4'
        os.rename(os.path.join(self.project, "video.mp4"), os.path.join(self.project, name))
        result = run_cli(self.project, name)
        self.assertEqual(result.returncode, 0, result.stderr)
        [(_, headers, body)] = [b for b in FAKE.bodies if b[0].endswith("/public/v1/upload")]
        message = email.message_from_bytes(
            b"Content-Type: " + headers["Content-Type"].encode("utf-8") + b"\r\n\r\n" + body, policy=email.policy.HTTP
        )
        [part] = message.get_payload()
        self.assertEqual(part.get_filename(), name)

    def test_filename_newline_becomes_space(self):
        self.assertEqual(postiz.multipart_name("a\r\nb.mp4"), "a  b.mp4")


class ReceiptTests(ProjectTestCase):
    def test_receipt_holds_only_sha_type_and_post_ids(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4")
        self.assertEqual(result.returncode, 0, result.stderr)
        receipt_path = os.path.join(self.project, "postiz-receipt.json")
        with open(receipt_path, encoding="utf-8") as handle:
            text = handle.read()
            receipt = json.loads(text)
        self.assertEqual(set(receipt), {"sha256", "type", "postIds"})
        self.assertEqual(receipt["sha256"], sha_of(os.path.join(self.project, "video.mp4")))
        self.assertEqual(receipt["type"], "draft")
        self.assertEqual(receipt["postIds"], ["post-1"])
        for name in ("Scene TikTok", "Scene Reels", "Scene Channel", "tt-1", "ig-1", "yt-1"):
            self.assertNotIn(name, text)

    def test_schedule_refused_when_receipt_matches(self):
        make_project(self.project, "portrait.mp4")
        write_receipt(self.project, sha_of(os.path.join(self.project, "video.mp4")))
        result = run_cli(self.project, "video.mp4", "--schedule", "2099-01-01T10:00:00+00:00")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--again", result.stderr)
        self.assertEqual(FAKE.sent_to("/public/v1/upload"), [])
        self.assertEqual(FAKE.sent_to("/public/v1/posts"), [])

    def test_now_refused_when_receipt_matches(self):
        make_project(self.project, "portrait.mp4")
        write_receipt(self.project, sha_of(os.path.join(self.project, "video.mp4")))
        result = run_cli(self.project, "video.mp4", "--now")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--again", result.stderr)
        self.assertEqual(FAKE.sent_to("/public/v1/posts"), [])

    def test_again_allows_schedule_when_receipt_matches(self):
        make_project(self.project, "portrait.mp4")
        write_receipt(self.project, sha_of(os.path.join(self.project, "video.mp4")))
        result = run_cli(self.project, "video.mp4", "--schedule", "2099-01-01T10:00:00+00:00", "--again")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)

    def test_again_allows_now_when_receipt_matches(self):
        make_project(self.project, "portrait.mp4")
        write_receipt(self.project, sha_of(os.path.join(self.project, "video.mp4")))
        result = run_cli(self.project, "video.mp4", "--now", "--again")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)

    def test_draft_warns_and_continues_when_receipt_matches(self):
        make_project(self.project, "portrait.mp4")
        write_receipt(self.project, sha_of(os.path.join(self.project, "video.mp4")))
        result = run_cli(self.project, "video.mp4")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("warning", result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)

    def test_receipt_for_other_content_does_not_block(self):
        make_project(self.project, "portrait.mp4")
        write_receipt(self.project, "0" * 64)
        result = run_cli(self.project, "video.mp4", "--now")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(FAKE.sent_to("/public/v1/posts")), 1)

    def test_sentinel_absent_from_real_run_output_and_files(self):
        make_project(self.project, "portrait.mp4")
        result = run_cli(self.project, "video.mp4")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn(KEY, result.stdout + result.stderr)
        for dirpath, _, files in os.walk(self.project):
            for name in files:
                with open(os.path.join(dirpath, name), "rb") as handle:
                    self.assertNotIn(KEY.encode(), handle.read(), name)


class TemplateTests(unittest.TestCase):
    def test_template_matches_spec(self):
        with open(TEMPLATE, encoding="utf-8") as template:
            self.assertEqual(
                json.load(template),
                {
                    "caption": "",
                    "hashtags": [],
                    "ai_generated": None,
                    "youtube_title": "",
                    "channels": ["tiktok", "instagram", "youtube"],
                },
            )


if __name__ == "__main__":
    unittest.main()
