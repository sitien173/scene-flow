#!/usr/bin/env python3
"""Render a HyperFrames project locally or on a temporary Colab T4 session."""

import argparse
import glob
import math
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time


HYPERFRAMES = "hyperframes@0.8.140"
CHROME_HEADLESS_BUILD = "152.0.7977.30"
PLAYER_READY_TIMEOUT = "180000"
EXCLUDED_DIRS = {".git", ".hyperframes", "node_modules", "renders", "snapshots", "__pycache__"}


def find_root_tag(html):
    for match in re.finditer(r"<[^>]+>", html):
        tag = match.group(0)
        if re.search(r"\bid\s*=\s*(['\"])root\1", tag):
            return match.start(), match.end(), tag
    raise ValueError("project index.html has no root composition element (id=\"root\")")


def root_duration(html):
    _, _, tag = find_root_tag(html)
    match = re.search(r"\bdata-duration\s*=\s*(['\"])([^'\"]+)\1", tag)
    if not match:
        raise ValueError("root composition has no data-duration")
    duration = float(match.group(2))
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError("root composition data-duration must be positive and finite")
    return duration


def limit_duration(project_dir, seconds):
    index = project_dir / "index.html"
    html = index.read_text(encoding="utf-8")
    start, end, tag = find_root_tag(html)
    attr = re.search(r"\bdata-duration\s*=\s*(['\"])([^'\"]+)\1", tag)
    if not attr:
        raise ValueError("root composition has no data-duration")
    current = float(attr.group(2))
    if not math.isfinite(current) or current <= 0:
        raise ValueError("root composition data-duration must be positive and finite")
    duration = min(seconds, current)
    updated_tag = tag[:attr.start(2)] + ("%.3f" % duration).rstrip("0").rstrip(".") + tag[attr.end(2):]
    index.write_text(html[:start] + updated_tag + html[end:], encoding="utf-8")
    return duration


def project_copy(source, destination):
    def ignore(_directory, names):
        return [name for name in names if name in EXCLUDED_DIRS]

    shutil.copytree(source, destination, ignore=ignore, symlinks=True)


def make_archive(project, archive):
    def include(_tarinfo):
        return _tarinfo

    with tarfile.open(archive, "w:gz") as bundle:
        for child in sorted(project.iterdir()):
            if child.name in EXCLUDED_DIRS:
                continue
            bundle.add(child, arcname=str(Path("project") / child.name), filter=include)


def run(command, *, cwd=None):
    print("$ " + shlex.join(str(item) for item in command), flush=True)
    subprocess.run([str(item) for item in command], cwd=cwd, check=True)


def colab_binary():
    preferred = Path("/home/ngosi/.local/bin/colab")
    return str(preferred) if preferred.is_file() else (shutil.which("colab") or str(preferred))


def render_command(project, output, *, local):
    command = ["npx", "--yes", HYPERFRAMES, "render", str(project)]
    if local:
        command.append("--no-browser-gpu")
    else:
        command.extend(["--browser-gpu", "--gpu"])
    command.extend(["--player-ready-timeout", PLAYER_READY_TIMEOUT, "-o", str(output)])
    return command


def remote_program(seconds):
    seconds_literal = "None" if seconds is None else repr(float(seconds))
    return '''import glob
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile

ARCHIVE = "/content/world3d-project.tar.gz"
PROJECT = Path("/content/project")
OUTPUT = "/content/world3d-render.mp4"
SECONDS = __SECONDS__

def command_ok(command):
    try:
        return subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    except OSError:
        return False

def run(command):
    print("$ " + " ".join(command), flush=True)
    subprocess.run(command, check=True)

if not command_ok(["node", "--version"]) or not command_ok(["npm", "--version"]):
    run(["bash", "-lc", "apt-get update && apt-get install -y ca-certificates curl gnupg && "
         "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs"])
node_version = subprocess.check_output(["node", "--version"], text=True).strip()
node_match = re.match(r"v?(\\d+)", node_version)
if not node_match or int(node_match.group(1)) < 22:
    run(["bash", "-lc", "apt-get update && apt-get install -y ca-certificates curl gnupg && "
         "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs"])
if not command_ok(["ffmpeg", "-version"]):
    run(["bash", "-lc", "apt-get update && apt-get install -y ffmpeg"])

shells = glob.glob(os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/**/chrome-headless-shell"), recursive=True)
shells += glob.glob(os.path.expanduser("~/.cache/hyperframes/chrome/**/chrome-headless-shell"), recursive=True)
if not any(os.path.isfile(path) and os.access(path, os.X_OK) for path in shells):
    run(["npx", "--yes", "@puppeteer/browsers@3.2.2", "install",
         "chrome-headless-shell@__CHROME_HEADLESS_BUILD__", "--install-deps", "--path",
         os.path.expanduser("~/.cache/puppeteer")])
    shells = glob.glob(os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/**/chrome-headless-shell"), recursive=True)
    shells += glob.glob(os.path.expanduser("~/.cache/hyperframes/chrome/**/chrome-headless-shell"), recursive=True)
shell = next((path for path in shells if os.path.isfile(path) and os.access(path, os.X_OK)), None)
if not shell:
    raise RuntimeError("HyperFrames Chrome headless shell was not installed")
os.environ["HYPERFRAMES_BROWSER_PATH"] = shell

if PROJECT.exists():
    shutil.rmtree(PROJECT)
with tarfile.open(ARCHIVE, "r:gz") as bundle:
    members = bundle.getmembers()
    for member in members:
        relative = Path(member.name)
        if relative.is_absolute() or ".." in relative.parts or not relative.parts or relative.parts[0] != "project":
            raise RuntimeError("unsafe project archive entry: " + member.name)
    bundle.extractall("/content", members=members)
if not (PROJECT / "index.html").is_file():
    raise RuntimeError("uploaded project has no index.html")
if SECONDS is not None:
    index = PROJECT / "index.html"
    html = index.read_text(encoding="utf-8")
    tags = list(re.finditer(r"<[^>]+>", html))
    root = next((match for match in tags if re.search(r"\\bid\\s*=\\s*(['\\\"])root\\1", match.group(0))), None)
    if root is None:
        raise RuntimeError("project index.html has no root composition element")
    tag = root.group(0)
    duration_match = re.search(r"\\bdata-duration\\s*=\\s*(['\\\"])([^'\\\"]+)\\1", tag)
    if duration_match is None:
        raise RuntimeError("root composition has no data-duration")
    current = float(duration_match.group(2))
    if not math.isfinite(current) or current <= 0:
        raise RuntimeError("root composition data-duration must be positive and finite")
    duration = min(SECONDS, current)
    replacement = ("%.3f" % duration).rstrip("0").rstrip(".")
    changed_tag = tag[:duration_match.start(2)] + replacement + tag[duration_match.end(2):]
    index.write_text(html[:root.start()] + changed_tag + html[root.end():], encoding="utf-8")

base = ["npx", "--yes", "hyperframes@0.8.140", "render", str(PROJECT)]
common = ["--player-ready-timeout", "180000", "-o", OUTPUT]
gpu = base + ["--browser-gpu", "--gpu"] + common
fallback = base + common
try:
    if os.path.exists(OUTPUT):
        os.remove(OUTPUT)
    result = subprocess.run(gpu, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    print(result.stdout, end="", flush=True)
    if result.returncode:
        print("GPU render failed; retrying once without GPU flags.", flush=True)
        if os.path.exists(OUTPUT):
            os.remove(OUTPUT)
        result = subprocess.run(fallback, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        print(result.stdout, end="", flush=True)
        result.check_returncode()
except subprocess.CalledProcessError:
    raise
if not os.path.isfile(OUTPUT) or os.path.getsize(OUTPUT) == 0:
    raise RuntimeError("HyperFrames completed without producing an MP4")
print("REMOTE_RENDER=" + OUTPUT, flush=True)
'''.replace("SECONDS = __SECONDS__", "SECONDS = " + seconds_literal).replace(
    "__CHROME_HEADLESS_BUILD__", CHROME_HEADLESS_BUILD)


def dry_run(args, project, output, full_duration, limited_duration):
    print("DRY RUN: no Colab session or render command was started.")
    print("Mode: " + ("local software fallback" if args.local else "Colab T4"))
    print("Project: " + str(project))
    print("Duration: %.3fs" % limited_duration if args.seconds is not None else "Duration: full project (%.3fs)" % full_duration)
    if args.local:
        target = "<temporary-project-copy>" if args.seconds is not None else str(project)
        print("Render command: " + shlex.join(render_command(target, output, local=True)))
        return
    name = "w3d-%d" % os.getpid()
    colab = colab_binary()
    print("Session command: " + shlex.join([colab, "new", "--session", name, "--gpu", "T4"]))
    print("Upload: project-folder-only tar.gz -> /content/world3d-project.tar.gz")
    print("Remote render (first attempt): " + shlex.join(render_command("/content/project", "/content/world3d-render.mp4", local=False)))
    print("Remote retry: " + shlex.join(["npx", "--yes", HYPERFRAMES, "render", "/content/project",
                                        "--player-ready-timeout", PLAYER_READY_TIMEOUT, "-o", "/content/world3d-render.mp4"]))
    print("Download: /content/world3d-render.mp4 -> " + str(output))
    print("Cleanup in finally: " + shlex.join([colab, "stop", "--session", name]))


def render_local(project, output, seconds):
    with tempfile.TemporaryDirectory(prefix="world3d-local-render-") as scratch:
        source = project
        if seconds is not None:
            source = Path(scratch) / "project"
            project_copy(project, source)
            duration = limit_duration(source, seconds)
            print("Staged render duration: %.3fs" % duration)
        output.parent.mkdir(parents=True, exist_ok=True)
        started = time.monotonic()
        try:
            run(render_command(source, output, local=True))
            if not output.is_file() or output.stat().st_size == 0:
                raise RuntimeError("HyperFrames completed without producing an MP4")
        finally:
            print("Elapsed: %.1fs" % (time.monotonic() - started), flush=True)


def render_colab(project, output, seconds):
    colab = colab_binary()
    if not Path(colab).is_file() and not shutil.which(colab):
        raise FileNotFoundError("Colab CLI not found: " + colab)
    session = "w3d-%d" % os.getpid()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="world3d-colab-render-") as scratch_dir:
        scratch = Path(scratch_dir)
        staged = scratch / "project"
        project_copy(project, staged)
        if seconds is not None:
            duration = limit_duration(staged, seconds)
            print("Staged render duration: %.3fs" % duration)
        archive = scratch / "world3d-project.tar.gz"
        make_archive(staged, archive)
        remote = scratch / "remote-render.py"
        remote.write_text(remote_program(seconds), encoding="utf-8")
        started = time.monotonic()
        session_attempted = False
        primary_error = None
        try:
            session_attempted = True
            run([colab, "new", "--session", session, "--gpu", "T4"])
            run([colab, "upload", "--session", session, str(archive), "/content/world3d-project.tar.gz"])
            run([colab, "exec", "--session", session, "--file", str(remote), "--timeout", "0"])
            run([colab, "download", "--session", session, "/content/world3d-render.mp4", str(output)])
            if not output.is_file() or output.stat().st_size == 0:
                raise RuntimeError("Colab download completed without producing an MP4")
        except BaseException as error:
            primary_error = error
            raise
        finally:
            if session_attempted:
                try:
                    stop = subprocess.run([colab, "stop", "--session", session], check=False)
                    if stop.returncode:
                        message = "Colab session cleanup failed for " + session
                        if primary_error is None:
                            raise subprocess.CalledProcessError(stop.returncode, [colab, "stop", "--session", session])
                        print("WARNING: " + message, file=sys.stderr, flush=True)
                except BaseException as cleanup_error:
                    if primary_error is None:
                        raise
                    print("WARNING: Colab cleanup failed: " + str(cleanup_error), file=sys.stderr, flush=True)
                finally:
                    print("Elapsed: %.1fs" % (time.monotonic() - started), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path, help="built HyperFrames project directory")
    parser.add_argument("--seconds", type=float, help="limit the render to this many seconds")
    parser.add_argument("-o", "--output", type=Path, help="MP4 output path")
    parser.add_argument("--local", action="store_true")
    parser.add_argument("--dry-run", action="store_true", help="print the plan without rendering or starting a session")
    args = parser.parse_args()
    project = args.project.expanduser().resolve()
    if not project.is_dir():
        parser.error("project directory not found: " + str(project))
    if not (project / "index.html").is_file():
        parser.error("project index.html not found: " + str(project))
    if args.seconds is not None and (not math.isfinite(args.seconds) or args.seconds <= 0):
        parser.error("--seconds must be a positive finite number")
    output = (args.output.expanduser().resolve() if args.output else project.parent / (project.name + ".mp4"))
    try:
        full_duration = root_duration((project / "index.html").read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        parser.error(str(error))
    limited_duration = min(args.seconds, full_duration) if args.seconds is not None else full_duration
    if args.dry_run:
        dry_run(args, project, output, full_duration, limited_duration)
        return
    if args.local:
        render_local(project, output, args.seconds)
    else:
        render_colab(project, output, args.seconds)


if __name__ == "__main__":
    main()
