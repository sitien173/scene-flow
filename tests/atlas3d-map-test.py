#!/usr/bin/env python3
# Tests for the atlas3d map module written by tools/atlas3d-map.py. The module is checked as built into
# skills/scene-flow/assets/atlas3d/map/. The rerun case reads the Natural Earth cache and is skipped when the
# cache is absent, so CI without network still runs the other cases.
import ast
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
MAP_DIR = os.path.join(ROOT, "skills", "scene-flow", "assets", "atlas3d", "map")
WORLD = os.path.join(MAP_DIR, "world.js")
INDEX = os.path.join(MAP_DIR, "index.json")
RELIEF = os.path.join(MAP_DIR, "relief.webp")
TOOL = os.path.join(ROOT, "tools", "atlas3d-map.py")
BUILD = os.path.join(ROOT, "skills", "scene-flow", "scripts", "build.py")
CACHE = os.path.expanduser("~/.cache/scene-flow/natural-earth/ne_50m_admin_0_countries.geojson")
WORLD_LIMIT = 1_572_864
PAIR_LIMIT = 2_097_152
CODE_RE = re.compile(r"^[A-Z]{3}$")


def neon_banned():
    # Read the list from build.py without importing it, because build.py runs code at import time.
    with open(BUILD, encoding="utf-8") as f:
        tree = ast.parse(f.read())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "NEON_BANNED" for t in node.targets):
            return ast.literal_eval(node.value)
    raise AssertionError("NEON_BANNED not found in build.py")


def exports(text):
    # Each export is one line of JSON, so the value after "=" parses as a JSON document.
    return {m.group(1): json.loads(m.group(2)) for m in re.finditer(r"^export const (\w+) = (.*);$", text, re.M)}


def arc_uses(country):
    # A reversed reference is ~k, the bitwise NOT of k, so the arc index is ~ref for negative refs.
    return [ref if ref >= 0 else ~ref for polygon in country["polygons"] for ring in polygon for ref in ring]


def decode_arcs(encoded):
    arcs = []
    for a in encoded:
        x, y = a[0]
        pts = [(x, y)]
        for dx, dy in a[1:]:
            x += dx
            y += dy
            pts.append((x, y))
        arcs.append(pts)
    return arcs


def orient(a, b, c):
    v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    return (v > 0) - (v < 0)


def strict_crossing(ring):
    # Sweep over x: only segments whose x ranges overlap are compared. Adjacent segments are skipped.
    n = len(ring)
    segs = sorted((min(ring[i][0], ring[(i + 1) % n][0]), max(ring[i][0], ring[(i + 1) % n][0]), i) for i in range(n))
    for p, (_, x1, i) in enumerate(segs):
        a, b = ring[i], ring[(i + 1) % n]
        for x0, _, j in segs[p + 1:]:
            if x0 > x1:
                break
            if (j - i) % n in (1, n - 1):
                continue
            c, d = ring[j], ring[(j + 1) % n]
            if orient(a, b, c) * orient(a, b, d) < 0 and orient(c, d, a) * orient(c, d, b) < 0:
                return True
    return False


def ring_problems(refs, arcs):
    # Decodes one ring from its arc references and reports every failed check.
    pts = []
    for ref in refs:
        seq = arcs[ref] if ref >= 0 else arcs[~ref][::-1]
        if pts and seq[0] != pts[-1]:
            return ["arc join mismatch"]
        pts.extend(seq if not pts else seq[1:])
    if pts[0] != pts[-1]:
        return ["not closed"]
    ring = pts[:-1]
    found = []
    if len(set(ring)) < 3:
        found.append("fewer than 3 distinct vertices")
    if sum(ax * by - bx * ay for (ax, ay), (bx, by) in zip(ring, ring[1:] + ring[:1])) == 0:
        found.append("zero area")
    if strict_crossing(ring):
        found.append("self-intersection")
    return found


class Atlas3dMap(unittest.TestCase):
    def read_world(self):
        self.assertTrue(os.path.exists(WORLD), "world.js is missing: %s" % WORLD)
        with open(WORLD, encoding="utf-8") as f:
            return f.read()

    def test_world_js_under_size_limit(self):
        self.assertTrue(os.path.exists(WORLD), "world.js is missing: %s" % WORLD)
        self.assertLess(os.path.getsize(WORLD), WORLD_LIMIT)

    def test_world_js_and_relief_under_size_limit(self):
        self.assertTrue(os.path.exists(WORLD), "world.js is missing: %s" % WORLD)
        self.assertTrue(os.path.exists(RELIEF), "relief.webp is missing: %s" % RELIEF)
        self.assertLess(os.path.getsize(WORLD) + os.path.getsize(RELIEF), PAIR_LIMIT)

    def test_index_lists_codes_with_name_and_bbox(self):
        self.assertTrue(os.path.exists(INDEX), "index.json is missing: %s" % INDEX)
        with open(INDEX, encoding="utf-8") as f:
            index = json.load(f)
        for code in ("FRA", "ESP", "USA", "GBR", "MEX", "CAN"):
            self.assertIn(code, index)
        for code, entry in index.items():
            self.assertRegex(code, CODE_RE)
            self.assertIsInstance(entry, dict, code)
            self.assertTrue(entry.get("name"), "%s has no name" % code)
            bbox = entry.get("bbox")
            self.assertTrue(isinstance(bbox, list) and len(bbox) == 4 and all(isinstance(v, (int, float)) for v in bbox),
                            "%s bbox is not [minLon, minLat, maxLon, maxLat]" % code)

    def test_shared_fra_esp_border_is_one_arc_referenced_by_both(self):
        data = exports(self.read_world())
        fra = arc_uses(data["countries"]["FRA"])
        esp = arc_uses(data["countries"]["ESP"])
        shared = set(fra) & set(esp)
        self.assertTrue(shared, "FRA and ESP share no arc")
        for arc in sorted(shared):
            self.assertEqual(fra.count(arc), 1, "FRA references arc %d more than once" % arc)
            self.assertEqual(esp.count(arc), 1, "ESP references arc %d more than once" % arc)

    def test_world_js_exports_arcs_countries_and_transform(self):
        data = exports(self.read_world())
        self.assertLessEqual({"transform", "arcs", "countries"}, set(data))
        self.assertEqual(set(data["transform"]), {"scale", "translate"})
        self.assertIsInstance(data["arcs"], list)
        self.assertIsInstance(data["countries"], dict)

    def test_world_js_imports_nothing_and_matches_no_banned_api(self):
        text = self.read_world()
        self.assertIsNone(re.search(r"\bimport\b", text), "world.js must not contain an import")
        for pattern in neon_banned():
            self.assertIsNone(re.search(pattern, text), "world.js matches banned pattern %s" % pattern)

    def test_every_ring_is_valid(self):
        data = exports(self.read_world())
        arcs = decode_arcs(data["arcs"])
        problems = []
        for code in sorted(data["countries"]):
            for p, polygon in enumerate(data["countries"][code]["polygons"]):
                for r, refs in enumerate(polygon):
                    found = ring_problems(refs, arcs)
                    if found:
                        problems.append("%s polygon %d ring %d: %s" % (code, p, r, ", ".join(found)))
        self.assertEqual(problems, [])

    def test_vat_outer_ring_is_valid(self):
        data = exports(self.read_world())
        arcs = decode_arcs(data["arcs"])
        self.assertEqual(ring_problems(data["countries"]["VAT"]["polygons"][0][0], arcs), [])

    def test_ita_holes_are_valid(self):
        data = exports(self.read_world())
        arcs = decode_arcs(data["arcs"])
        holes = [refs for polygon in data["countries"]["ITA"]["polygons"] for refs in polygon[1:]]
        self.assertGreaterEqual(len(holes), 2, "ITA should keep the Vatican and San Marino holes")
        for refs in holes:
            self.assertEqual(ring_problems(refs, arcs), [])

    def test_rerun_from_cache_writes_identical_world_and_index(self):
        if not os.path.exists(CACHE):
            self.skipTest("Natural Earth cache absent (%s); run tools/atlas3d-map.py once to fill it" % CACHE)
        self.assertTrue(os.path.exists(WORLD), "world.js is missing: %s" % WORLD)
        self.assertTrue(os.path.exists(INDEX), "index.json is missing: %s" % INDEX)
        out = tempfile.mkdtemp(prefix="atlas3d-map-test-")
        try:
            proc = subprocess.run([sys.executable, TOOL, "--out-dir", out], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            for name, repo_path in (("world.js", WORLD), ("index.json", INDEX)):
                with open(os.path.join(out, name), "rb") as a, open(repo_path, "rb") as b:
                    self.assertEqual(a.read(), b.read(), "%s differs on rerun" % name)
        finally:
            shutil.rmtree(out, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
