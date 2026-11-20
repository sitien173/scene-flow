# Credentials and machine config for every scene-flow script, from ~/.config/scene-flow/.env only.
# Environment variables are never read. One NAME=value per line; "export " and quotes are optional.
#
# usage:
#   import settings; settings.get("ELEVENLABS_API_KEY")
#   python scripts/settings.py NAME      # print one value for a shell pipe; exit 1 if unset
#
# Names: VIBI_API_KEY, ELEVENLABS_API_KEY, POSTIZ_URL, POSTIZ_API_KEY, COLAB_URL, COLAB_TOKEN,
# IMAGE_API_URL, IMAGE_API_KEY, IMAGE_MODEL, HYPERFRAMES_WHISPER_PATH, CHROME_PATH, SCENE_FLOW_SKILL.
# The freesound skill reads its FREESOUND_* names from the same file.
import os
import sys
from pathlib import Path

DIR = Path.home() / ".config" / "scene-flow"
PATH = DIR / ".env"


def read():
    """Every NAME=value in PATH, or {} when the file is missing. Exit if other users can read it."""
    values = {}
    if PATH.is_file():
        if os.name == "posix" and PATH.stat().st_mode & 0o077:
            sys.exit(f"{PATH} is readable by other users. Run: chmod 600 {PATH}")
        for line in PATH.read_text(encoding="utf-8").splitlines():
            name, sep, value = line.strip().removeprefix("export ").partition("=")
            if sep and not name.startswith("#"):
                values[name.strip()] = value.strip().strip("\"'")
    return values


def get(name):
    """One value from PATH, or None when unset or empty."""
    return read().get(name) or None


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: settings.py NAME")
    value = get(sys.argv[1])
    if not value:
        sys.exit(f"{sys.argv[1]} is not set in {PATH}")
    print(value)
