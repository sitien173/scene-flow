#!/usr/bin/env python3
"""Check every skills/*/SKILL.md frontmatter against the Agent Skills spec."""
import glob
import re
import sys

import yaml

bad = 0
paths = sorted(glob.glob("skills/*/SKILL.md"))
for p in paths:
    fm = yaml.safe_load(open(p, encoding="utf-8").read().split("---")[1])
    d = p.split("/")[1]
    ok = (fm.get("name") == d and re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", d)
          and len(d) <= 64 and 0 < len(fm.get("description") or "") <= 1024)
    print(("OK  " if ok else "BAD ") + p)
    bad += not ok
sys.exit(1 if bad or not paths else 0)
