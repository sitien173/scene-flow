# Gain for a new sound file (a Freesound download, the author's own) at a house target level:
#
#     gain = 10 ^ ((target dB - file mean dB) / 20)
#
# The file mean is ffmpeg volumedetect's mean_volume over the whole file, the same number
# add-sfx.py's level table quotes (sfx-thud.mp3 measures -11.7). Laser and riser targets are not
# set on the file mean (active span, peak), so pass --target for those.
#
# usage (from the project root):
#   python scripts/sfx-gain.py assets/audio/sfx-whoosh-2.mp3 --cue swoosh
#   python scripts/sfx-gain.py assets/audio/bgm-new.mp3 --cue bed --seconds 60   # mean over the film only
#   python scripts/sfx-gain.py assets/audio/x.mp3 --target -27
import argparse
import math
import re
import subprocess

# house targets in dB, from references/audio-mix.md
CUES = {"thud": -22, "swoosh": -28, "pop": -29, "pop-soft": -33, "click": -30, "bed": -33}

ap = argparse.ArgumentParser()
ap.add_argument("src")
g = ap.add_mutually_exclusive_group(required=True)
g.add_argument("--cue", choices=sorted(CUES))
g.add_argument("--target", type=float)
ap.add_argument("--seconds", type=float, help="measure only the first N seconds (a bed under a shorter film)")
a = ap.parse_args()

cmd = ["ffmpeg", "-hide_banner", "-nostats"] + (["-t", str(a.seconds)] if a.seconds else []) + \
      ["-i", a.src, "-af", "volumedetect", "-f", "null", "-"]
out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", out)
assert m, "could not measure " + a.src
mean = float(m.group(1))
target = CUES[a.cue] if a.cue else a.target
gain = 10 ** ((target - mean) / 20)
print("  %s  mean %.1f dB  target %.1f dB  ->  gain %.3f" % (a.src, mean, target, gain))
if gain > 3.98:
    print("  gain above 3.98 (+12 dB), the HyperFrames data-volume ceiling: pick a louder file")
