#!/usr/bin/env python3
"""Install scene-flow into the Antigravity IDE plugin folder from this clone.

  python install-agy-ide.py                      ~/.gemini/config/plugins/scene-flow
  python install-agy-ide.py --project DIR        DIR/.agents/plugins/scene-flow
  python install-agy-ide.py --uninstall [--project DIR]

A folder is replaced or removed only when it carries the marker this script writes.
"""
import argparse
import json
import os
import shutil
import stat
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent
MARKER = ".scene-flow-agy-ide.json"
OWNER = "scene-flow"
# plugin.json is copied separately, last, so a crashed staging folder never looks like a plugin.
ALLOWLIST = ["skills", "LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md", "README.md"]
IGNORE_NAMES = {"__pycache__", ".DS_Store", "Thumbs.db"}
IGNORE_DIRS = {SRC / "skills" / "scene-flow" / "references" / "videos"}


class Refused(Exception):
    pass


def is_link(path):
    if path.is_symlink():
        return True
    if os.name == "nt":  # Python 3.10 has no os.path.isjunction
        try:
            return bool(os.lstat(path).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT)
        except FileNotFoundError:
            return False
    return False


def has_marker(folder):
    marker = folder / MARKER
    if marker.is_symlink() or not marker.is_file():
        return False
    try:
        return json.loads(marker.read_text(encoding="utf-8")).get("owner") == OWNER
    except (OSError, ValueError, AttributeError):
        return False


def ignore(dirpath, names):
    d = Path(dirpath)
    return {n for n in names if n in IGNORE_NAMES or n.endswith(".pyc") or d / n in IGNORE_DIRS}


def _clear_readonly(func, path, _):
    os.chmod(path, stat.S_IWRITE)
    func(path)


def remove(folder):
    (folder / "plugin.json").unlink(missing_ok=True)
    if sys.version_info >= (3, 12):
        shutil.rmtree(folder, onexc=_clear_readonly)
    else:
        shutil.rmtree(folder, onerror=_clear_readonly)


def clear_leftover(folder):
    if not os.path.lexists(folder):
        return
    if is_link(folder) or not has_marker(folder):
        raise Refused(f"{folder} exists without a scene-flow marker; remove it by hand")
    remove(folder)


def check_destination(dst):
    if is_link(dst):
        raise Refused(f"{dst} is a link")
    if dst.exists() and not has_marker(dst):
        raise Refused(f"{dst} has no scene-flow marker; it was not installed by this script")


def install(dst):
    if SRC == dst or dst in SRC.parents:
        raise Refused(f"source {SRC} is inside {dst}")
    check_destination(dst)
    staging = dst.with_name(dst.name + ".staging")
    old = dst.with_name(dst.name + ".old")
    clear_leftover(staging)
    clear_leftover(old)

    existed = dst.exists()
    staging.mkdir(parents=True)
    (staging / MARKER).write_text(json.dumps({"owner": OWNER}) + "\n", encoding="utf-8")
    for name in ALLOWLIST:
        if (SRC / name).is_dir():
            shutil.copytree(SRC / name, staging / name, ignore=ignore)
        else:
            shutil.copy2(SRC / name, staging / name)
    shutil.copy2(SRC / "plugin.json", staging / "plugin.json")

    if existed:
        dst.rename(old)
    try:
        staging.rename(dst)
    except OSError:
        if existed:
            old.rename(dst)
        raise
    if existed:
        remove(old)
    return f"{'updated' if existed else 'installed'} {dst}"


def uninstall(dst):
    check_destination(dst)
    if not dst.exists():
        return "not installed"
    old = dst.with_name(dst.name + ".old")
    clear_leftover(old)
    dst.rename(old)
    remove(old)
    return f"removed {dst}"


def main():
    parser = argparse.ArgumentParser(description="Install scene-flow for the Antigravity IDE.")
    parser.add_argument("--project", metavar="DIR", help="install into DIR/.agents/plugins instead of the user folder")
    parser.add_argument("--uninstall", action="store_true", help="remove an install made by this script")
    args = parser.parse_args()

    if args.project is not None:
        parent = Path(args.project).resolve() / ".agents" / "plugins"
    else:
        parent = (Path.home() / ".gemini" / "config" / "plugins").resolve()
    dst = parent / "scene-flow"

    try:
        print(uninstall(dst) if args.uninstall else install(dst))
    except Refused as e:
        print(f"refused: {e}", file=sys.stderr)
        return 1
    except OSError as e:
        print(f"error: {e}; close Antigravity and rerun if it is open", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
