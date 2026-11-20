#!/usr/bin/env python3
# Tests for the terra3d branch of skills/scene-flow/scripts/build.py and karaoke.py. One fixture project is
# built with tests/theme-fixture.sh; each case copies it, breaks one input, and runs build.py in the copy.
import ast
import html
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
FIXTURE_RUN = None
TMP = None


def setUpModule():
    global FIXTURE, FIXTURE_RUN, TMP
    TMP = tempfile.mkdtemp(prefix="terra3d-build-test-")
    FIXTURE_RUN = subprocess.run(["bash", os.path.join(ROOT, "tests", "theme-fixture.sh"), TMP, "--theme", "terra3d"],
                                 capture_output=True, text=True)
    FIXTURE = os.path.join(TMP, "demo")


def tearDownModule():
    shutil.rmtree(TMP, ignore_errors=True)


def karaoke_compounds():
    """The shared COMPOUNDS plus the terra3d list, read from karaoke.py's literals."""
    tree = ast.parse(open(os.path.join(ROOT, "skills", "scene-flow", "scripts", "karaoke.py"), encoding="utf-8").read())
    values = {t.id: ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign)
              for t in n.targets if isinstance(t, ast.Name) and t.id in ("COMPOUNDS", "THEME_SETTINGS")}
    return values["COMPOUNDS"] + values["THEME_SETTINGS"]["terra3d"].get("compounds", [])


class Terra3dBuild(unittest.TestCase):
    def project(self):
        self.assertEqual(FIXTURE_RUN.returncode, 0, "theme-fixture.sh --theme terra3d failed: " + FIXTURE_RUN.stderr[-400:])
        d = tempfile.mkdtemp(dir=TMP)
        shutil.rmtree(d)
        shutil.copytree(FIXTURE, d, ignore=shutil.ignore_patterns("snapshots"))
        return d

    def run_in(self, d, script):
        return subprocess.run([sys.executable, os.path.join("scripts", script)], cwd=d, capture_output=True, text=True,
                              env={**os.environ, "PYTHONIOENCODING": "utf-8"})

    def build(self, d):
        return self.run_in(d, "build.py")

    def edit_vignettes(self, d, change):
        p = os.path.join(d, "vignettes.json")
        data = json.load(open(p, encoding="utf-8"))
        change(data["vignettes"])
        json.dump(data, open(p, "w", encoding="utf-8"), ensure_ascii=False)

    def rejects(self, d, problem, detail):
        r = self.build(d)
        self.assertNotEqual(r.returncode, 0, r.stdout)
        self.assertIn("vignettes.json " + problem, r.stderr)
        self.assertIn(detail, r.stderr)

    def cues(self, d):
        """Every caption cue of the built page as a list of unit texts."""
        self.assertEqual(self.build(d).returncode, 0)
        r = self.run_in(d, "karaoke.py")
        self.assertEqual(r.returncode, 0, r.stderr)
        page = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        cues = [re.findall(r'<span class="kb" id="kb\d+">(.*?)</span>', c) for c in re.findall(r'<div class="kc [^>]*>(.*?)</div>', page)]
        return [[html.unescape(u) for u in cue] for cue in cues]

    def test_valid_build_prints_table_and_ledger(self):
        d = self.project()
        r = self.build(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("terra3d vignette table:", r.stdout)
        starts = dict(re.findall(r"^  (\w+)\s+\| \w+\s+\|.*\| +([\d.]+) \|", r.stdout, re.M))
        expected_ids = [
            "globe", "canal", "aerial", "cape_horn", "isthmus", "topography",
            "rain", "excavation", "dam", "lake_fleet", "elevation", "approach",
            "cutaway", "chamber_fill", "mules", "gate_close", "equalize", "convoy",
        ]
        self.assertEqual(list(starts), expected_ids)
        self.assertEqual(starts["globe"], "0.00")
        ledger = json.load(open(os.path.join(d, "ledger.json"), encoding="utf-8"))
        self.assertEqual([s["id"] for s in ledger["seams"]], ["terra->cta", "cta->ec"])
        self.assertEqual([v["id"] for v in ledger["vignettes"]], expected_ids)
        for v in ledger["vignettes"][1:]:
            self.assertEqual(v["in"]["kind"], "cut")

    def test_placeholder_vignettes_use_environment_kit_and_three_cameras(self):
        vdir = os.path.join(ROOT, "skills", "scene-flow", "template", "themes", "terra3d", "vignettes")
        sources = "\n".join(open(os.path.join(vdir, f), encoding="utf-8").read()
                            for f in sorted(os.listdir(vdir)) if f.endswith(".js"))
        for prim in ("kit.ocean", "kit.terrain", "kit.rain"):
            self.assertIn(prim, sources, f"missing placeholder vignette primitive: {prim}")
        used_cams = [m for m in ("drone", "orbit", "track", "topdown", "ground", "crane")
                     if re.search(rf"\bkit\.{m}\s*\(", sources)]
        self.assertGreaterEqual(len(used_cams), 3, f"need >= 3 camera moves, found {used_cams}")

    def test_fly_rejected(self):
        d = self.project()
        self.edit_vignettes(d, lambda rows: rows[1].update(**{"in": {"kind": "fly", "dur": 0.9}}))
        self.rejects(d, "invalid transition", "'canal'")

    def test_flash_rejected(self):
        d = self.project()
        self.edit_vignettes(d, lambda rows: rows[1].update(**{"in": {"kind": "flash", "dur": 0.3}}))
        self.rejects(d, "invalid transition", "'canal'")

    def test_vignette_under_one_second_rejected(self):
        d = self.project()

        def early(rows):
            rows[0]["beats"] = {}
            rows[1].update(anchor={"sentence": 1, "word": "đào"}, beats={})  # 0.7 s: the first vignette lasts 0.7 s
        self.edit_vignettes(d, early)
        self.rejects(d, "vignette too short", "'globe'")

    def test_cut_without_quiet_window_accepted(self):
        d = self.project()
        seconds = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                  os.path.join(d, "assets", "audio", "voiceover.mp3")],
                                 capture_output=True, text=True, check=True).stdout.strip()
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=44100",
                        "-t", seconds, "-c:a", "pcm_s16le", "-f", "wav", "assets/audio/voiceover.mp3"], cwd=d, check=True)
        r = self.build(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("terra3d vignette table:", r.stdout)

    def test_banned_api_in_kit_and_vignette(self):
        for rel in (("assets", "terra3d", "kit", "look.js"), ("vignettes", "aerial.js")):
            for code in ("const x = Math['random']();", "// Date.now() would make frames depend on wall time"):
                with self.subTest(file=rel[-1], code=code):
                    d = self.project()
                    with open(os.path.join(d, *rel), "a", encoding="utf-8") as f:
                        f.write("\n" + code + "\n")
                    self.rejects(d, "banned API", rel[-1])

    def test_every_caption_cue_holds_one_unit(self):
        d = self.project()
        compounds = {" ".join(re.sub(r"[^\w ]", "", c).lower().split()) for c in karaoke_compounds()}
        cues = self.cues(d)
        self.assertGreater(len(cues), 20)
        for units in cues:
            self.assertEqual(len(units), 1, units)
            text = re.sub(r"[^\w ]", "", units[0]).lower()
            self.assertTrue(" " not in text.strip() or text in compounds, "not a syllable or a terra3d compound: " + units[0])

    def test_compound_is_one_cue(self):
        d = self.project()
        texts = [units[0].strip(",.") for units in self.cues(d)]
        self.assertIn("Kênh đào", texts)
        self.assertIn("công trình", texts)
        self.assertNotIn("Kênh", texts)

    def run_node_kit(self, script):
        kit_dir = os.path.join(ROOT, "skills", "scene-flow", "assets", "terra3d", "kit")
        three_url = "file://" + os.path.join(ROOT, "skills", "scene-flow", "assets", "vendor", "three", "three.module.js")
        addons_url = "file://" + os.path.join(ROOT, "skills", "scene-flow", "assets", "vendor", "three", "addons") + "/"
        prelude = (
            'import { registerHooks } from "node:module";\n'
            f'registerHooks({{ resolve(specifier, ctx, next) {{ if (specifier === "three") return {{ shortCircuit: true, url: {json.dumps(three_url)} }}; if (specifier.startsWith("three/addons/")) return {{ shortCircuit: true, url: {json.dumps(addons_url)} + specifier.slice("three/addons/".length) }}; return next(specifier, ctx); }} }});\n'
            f'const KIT_URL = "file://{kit_dir}/index.js";\n'
            f'const KIT_DIR = "file://{kit_dir}";\n'
        )
        r = subprocess.run(["node", "--input-type=module", "-e", prelude + script],
                           capture_output=True, text=True, check=False)
        self.assertEqual(r.returncode, 0, f"node failed:\nSTDOUT: {r.stdout}\nSTDERR: {r.stderr}")
        return json.loads(r.stdout.strip().splitlines()[-1])

    def test_kit_exports_camera_moves_and_passes_banned_scan(self):
        out = self.run_node_kit("""
const { createKit } = await import(KIT_URL);
const kit = createKit({ id: "t1", beats: {} });
const moves = ["drone", "orbit", "track", "topdown", "ground", "crane"];
const missing = moves.filter(m => typeof kit[m] !== "function");
const lookMissing = ["stage", "loadTexture", "loadSky", "matte", "glow", "canvasTexture", "PALETTE"]
  .filter(k => kit[k] === undefined);
const results = {};
for (const m of moves) {
  if (typeof kit[m] !== "function") continue;
  const cam = kit.camera();
  kit[m](cam, 0, { dur: 4 });
  const p0 = cam.position.toArray();
  kit[m](cam, 4, { dur: 4 });
  const p4 = cam.position.toArray();
  kit[m](cam, 2, { dur: 4 });
  const p2a = cam.position.toArray();
  kit[m](cam, 2, { dur: 4 });
  const p2b = cam.position.toArray();
  results[m] = { p0, p4, p2a, p2b };
}
console.log(JSON.stringify({ missing, lookMissing, results }));
""")
        self.assertEqual(out["missing"], [], f"missing camera moves: {out['missing']}")
        self.assertEqual(out["lookMissing"], [], f"missing look helpers: {out['lookMissing']}")
        for m, poses in out["results"].items():
            self.assertEqual(poses["p2a"], poses["p2b"], f"{m} not deterministic")
            self.assertNotEqual(poses["p0"], poses["p4"], f"{m} did not move")
        d = self.project()
        r = self.build(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("terra3d vignette table:", r.stdout)

    def test_ocean_and_terrain_pure_height_functions(self):
        out = self.run_node_kit("""
const { createKit } = await import(KIT_URL);
const kit = createKit({ id: "t2", beats: {} });
const missing = ["ocean", "oceanMaterial", "WAVES", "heightAt", "terrain", "terrainHeight", "createHeightfield"]
  .filter(k => kit[k] === undefined);
if (missing.length) {
  console.log(JSON.stringify({ missing }));
} else {
  const h1 = kit.heightAt(3.5, -2.1, 1.75);
  const hOther = kit.heightAt(12.0, 8.4, 4.2);
  const h2 = kit.heightAt(3.5, -2.1, 1.75);
  const hT0 = kit.heightAt(3.5, -2.1, 0.0);
  const mat = kit.oceanMaterial();
  const f1 = kit.createHeightfield({ seed: 101 });
  const f2 = kit.createHeightfield({ seed: 202 });
  const th1a = f1.heightAt(18.5, 14.0);
  f1.heightAt(-11.0, 9.3);
  const th1b = f1.heightAt(18.5, 14.0);
  const th2 = f2.heightAt(18.5, 14.0);
  const thStatA = kit.terrainHeight(18.5, 14.0, { seed: 101 });
  const thStatB = kit.terrainHeight(18.5, 14.0, { seed: 202 });
  const lakeH = f1.heightAt(3.5, -5.0);
  console.log(JSON.stringify({
    missing,
    wavesLen: kit.WAVES.length,
    isShaderMaterial: Boolean(mat && mat.isShaderMaterial),
    h1, h2, hOther, hT0,
    th1a, th1b, th2, thStatA, thStatB, lakeH,
  }));
}
""")
        self.assertEqual(out["missing"], [], f"missing ocean/terrain exports: {out['missing']}")
        self.assertGreater(out["wavesLen"], 0)
        self.assertTrue(out["isShaderMaterial"])
        self.assertEqual(out["h1"], out["h2"])
        self.assertNotEqual(out["h1"], out["hT0"])
        self.assertEqual(out["th1a"], out["th1b"])
        self.assertEqual(out["th1a"], out["thStatA"])
        self.assertNotEqual(out["th1a"], out["th2"])
        self.assertNotEqual(out["thStatA"], out["thStatB"])
        self.assertLess(out["lakeH"], 0)

    def test_particles_closed_form_instanced_meshes(self):
        out = self.run_node_kit("""
const { createKit } = await import(KIT_URL);
const kit = createKit({ id: "t3", beats: {} });
const missing = ["rain", "swarm", "fleet"].filter(k => typeof kit[k] !== "function");
if (missing.length) {
  console.log(JSON.stringify({ missing }));
} else {
  const effects = {
    rain: kit.rain({ count: 16, seed: 11 }),
    swarm: kit.swarm({ count: 12, seed: 23 }),
    fleet: kit.fleet({ count: 6, seed: 37, heightAt: kit.heightAt }),
  };
  const summary = {};
  for (const [name, fx] of Object.entries(effects)) {
    fx.update(2.5);
    const m25a = Array.from(fx.object.instanceMatrix.array.slice(0, 32));
    fx.update(0.5);
    const m05 = Array.from(fx.object.instanceMatrix.array.slice(0, 32));
    fx.update(2.5);
    const m25b = Array.from(fx.object.instanceMatrix.array.slice(0, 32));
    summary[name] = {
      isInstancedMesh: Boolean(fx.object && fx.object.isInstancedMesh),
      count: fx.object.count,
      m25a, m05, m25b,
    };
  }
  console.log(JSON.stringify({ missing, summary }));
}
""")
        self.assertEqual(out["missing"], [], f"missing particle helpers: {out['missing']}")
        for name, info in out["summary"].items():
            self.assertTrue(info["isInstancedMesh"], f"{name} is not an InstancedMesh")
            self.assertGreater(info["count"], 0)
            self.assertEqual(info["m25a"], info["m25b"], f"{name} not closed-form deterministic")
            self.assertNotEqual(info["m25a"], info["m05"], f"{name} did not animate over t")

    def test_ocean_height_at_matches_displaced_world_surface(self):
        out = self.run_node_kit("""
const { createKit } = await import(KIT_URL);
const kit = createKit({ id: "t_ocean", beats: {} });
const points = [[0, 0], [3.5, -2.1], [-7.2, 5.4], [12.0, -9.5], [-1.8, -14.3]];
const times = [0.0, 0.7, 2.0, 4.5, 8.2];
const cases = [];
for (const [rx, rz] of points) {
  for (const t of times) {
    const disp = kit.gerstnerAt(rx, rz, t);
    const h = kit.heightAt(disp.x, disp.z, t);
    cases.push({ rx, rz, t, dispY: disp.y, h, err: Math.abs(h - disp.y) });
  }
}
const worst = cases.reduce((a, b) => (b.err > a.err ? b : a));
console.log(JSON.stringify({ worst, count: cases.length }));
""")
        self.assertEqual(out["count"], 25)
        self.assertLess(out["worst"]["err"], 0.01, f"heightAt world-coord mismatch: {out['worst']}")

    def test_rain_camera_keeps_terrain_clearance(self):
        rain_url = "file://" + os.path.join(ROOT, "skills", "scene-flow", "template", "themes", "terra3d", "vignettes", "rain.js")
        out = self.run_node_kit(f"""
const THREE = await import("three");
THREE.TextureLoader.prototype.loadAsync = async () => new THREE.Texture();
const {{ createKit }} = await import(KIT_URL);
const {{ build }} = await import({json.dumps(rain_url)});
let capturedField = null;
const baseKit = createKit({{ id: "rain", beats: {{ storm: 2.0 }} }});
const kit = {{
  ...baseKit,
  async terrain(opts) {{
    capturedField = baseKit.createHeightfield(opts);
    return baseKit.terrain(opts);
  }},
}};
const built = await build(kit);
const samples = [];
const n = 25;
const dur = 6.0;
for (let i = 0; i < n; i++) {{
  const t = (i / (n - 1)) * dur;
  built.update(t);
  const p = built.camera.position;
  const groundY = capturedField.heightAt(p.x, p.z);
  samples.push({{ t, x: p.x, y: p.y, z: p.z, groundY, clearance: p.y - groundY }});
}}
const minSample = samples.reduce((a, b) => (b.clearance < a.clearance ? b : a));
console.log(JSON.stringify({{ minSample, count: samples.length }}));
""")
        self.assertGreaterEqual(out["count"], 20)
        self.assertGreaterEqual(out["minSample"]["clearance"], 0.5, f"rain camera clearance too low: {out['minSample']}")

    def test_globe_arc_draw_range_is_pure_function_of_t(self):
        out = self.run_node_kit("""
const { createKit } = await import(KIT_URL);
const kit = createKit({ id: "t_globe", beats: {} });
const missing = ["globe", "routeArc", "globeZoom", "latLonToVec3"].filter(k => typeof kit[k] !== "function");
if (missing.length) {
  console.log(JSON.stringify({ missing }));
} else {
  const arc = kit.routeArc({ from: [9.0, -79.5], to: [10.8, 106.7], start: 0.2, dur: 2.0, segments: 80 });
  arc.update(0.0);
  const c0 = arc.object.geometry.drawRange.count;
  arc.update(2.5);
  const cEnd = arc.object.geometry.drawRange.count;
  arc.update(1.2);
  const cMidA = arc.object.geometry.drawRange.count;
  arc.update(0.1);
  const cBefore = arc.object.geometry.drawRange.count;
  arc.update(1.2);
  const cMidB = arc.object.geometry.drawRange.count;
  const cam = kit.camera();
  kit.globeZoom(cam, 1.0, { fromLatLon: [15, -30], toLatLon: [9.0, -79.5], dur: 2.0 });
  const z1a = cam.position.toArray();
  kit.globeZoom(cam, 2.0, { fromLatLon: [15, -30], toLatLon: [9.0, -79.5], dur: 2.0 });
  const z2 = cam.position.toArray();
  kit.globeZoom(cam, 1.0, { fromLatLon: [15, -30], toLatLon: [9.0, -79.5], dur: 2.0 });
  const z1b = cam.position.toArray();
  console.log(JSON.stringify({ missing, c0, cBefore, cMidA, cMidB, cEnd, z1a, z1b, z2 }));
}
""")
        self.assertEqual(out["missing"], [], f"missing globe exports: {out['missing']}")
        self.assertEqual(out["c0"], 0)
        self.assertEqual(out["cBefore"], 0)
        self.assertGreater(out["cMidA"], 0)
        self.assertGreater(out["cEnd"], out["cMidA"])
        self.assertEqual(out["cMidA"], out["cMidB"])
        self.assertEqual(out["z1a"], out["z1b"])
        self.assertNotEqual(out["z1a"], out["z2"])

    def test_globe_antipodal_zoom_preserves_distance_and_direction(self):
        out = self.run_node_kit("""
const THREE = await import("three");
const { createKit } = await import(KIT_URL);
const kit = createKit({ id: "t_globe_anti", beats: {} });
const cam = kit.camera();
const dir = new THREE.Vector3();
const samples = {};
for (const [label, t] of [["start", 0.0], ["mid", 1.0], ["end", 2.0]]) {
  kit.globeZoom(cam, t, {
    fromLatLon: [0, 0],
    toLatLon: [0, 180],
    fromDist: 10.0,
    toDist: 6.0,
    dur: 2.0,
    curve: "linear",
  });
  cam.updateMatrixWorld(true);
  cam.getWorldDirection(dir);
  samples[label] = {
    pos: cam.position.toArray(),
    dist: cam.position.length(),
    dir: dir.toArray(),
    dirLen: dir.length(),
  };
}
console.log(JSON.stringify(samples));
""")
        for label, expected_dist in (("start", 10.0), ("mid", 8.0), ("end", 6.0)):
            s = out[label]
            for v in s["pos"] + s["dir"]:
                self.assertTrue(v == v, f"NaN in {label}: {s}")
            self.assertAlmostEqual(s["dist"], expected_dist, places=4, msg=f"bad distance at {label}: {s}")
            self.assertAlmostEqual(s["dirLen"], 1.0, places=4, msg=f"bad direction at {label}: {s}")

    def test_cutaway_water_level_is_pure_function_of_t(self):
        out = self.run_node_kit("""
const { createKit } = await import(KIT_URL);
const kit = createKit({ id: "t_cutaway", beats: {} });
const missing = ["cutaway", "chamberLevel", "gateAngle"].filter(k => typeof kit[k] !== "function");
if (missing.length) {
  console.log(JSON.stringify({ missing }));
} else {
  const opts = { from: 0.4, to: 2.6, start: 0.5, dur: 2.0, curve: "inOut" };
  const gateOpts = { x: 1.8, height: 2.6, depth: 3.4, from: 0, to: 1.1, start: 0.2, dur: 1.0 };
  const l0 = kit.chamberLevel(0.0, opts);
  const lMid = kit.chamberLevel(1.5, opts);
  const lEnd = kit.chamberLevel(3.0, opts);
  const g0 = kit.gateAngle(0.0, gateOpts);
  const gEnd = kit.gateAngle(1.5, gateOpts);
  const block = await kit.cutaway({
    strata: [{ height: 1.2, color: "#9C4F36" }, { height: 0.8, color: "#7DB35A" }],
    chambers: [{ x: 0, width: 3.6, depth: 3.4, minY: 0.0, maxY: 2.8, ...opts }],
    gates: [gateOpts],
  });
  const snap = (t) => {
    block.update(t);
    const c = block.chambers[0];
    const g = block.gates[0];
    return {
      scaleY: c.mesh.scale.y,
      capY: c.cap.position.y,
      minY: c.minY,
      gateRots: g.pivots.map(p => ({ sign: p.sign, rotY: p.pivot.rotation.y })),
    };
  };
  const fwd0 = snap(0.0);
  const fwdMid = snap(1.5);
  const fwdEnd = snap(3.0);
  const revMid = snap(1.5);
  const rev0 = snap(0.0);
  console.log(JSON.stringify({ missing, l0, lMid, lEnd, g0, gEnd, fwd0, fwdMid, fwdEnd, revMid, rev0 }));
}
""")
        self.assertEqual(out["missing"], [], f"missing cutaway exports: {out['missing']}")
        self.assertGreater(out["lMid"], out["l0"])
        self.assertLess(out["lMid"], out["lEnd"])
        self.assertAlmostEqual(out["fwd0"]["scaleY"], out["l0"], places=5)
        self.assertAlmostEqual(out["fwd0"]["capY"], out["fwd0"]["minY"] + out["l0"], places=5)
        self.assertAlmostEqual(out["fwdMid"]["scaleY"], out["lMid"], places=5)
        self.assertAlmostEqual(out["fwdMid"]["capY"], out["fwdMid"]["minY"] + out["lMid"], places=5)
        self.assertAlmostEqual(out["fwdEnd"]["scaleY"], out["lEnd"], places=5)
        self.assertAlmostEqual(out["fwdEnd"]["capY"], out["fwdEnd"]["minY"] + out["lEnd"], places=5)
        self.assertEqual(out["revMid"], out["fwdMid"])
        self.assertEqual(out["rev0"], out["fwd0"])
        for r0, rMid in zip(out["fwd0"]["gateRots"], out["fwdMid"]["gateRots"]):
            self.assertAlmostEqual(r0["rotY"], r0["sign"] * out["g0"], places=5)
            self.assertAlmostEqual(rMid["rotY"], rMid["sign"] * out["gEnd"], places=5)

    def test_cutaway_vignette_gate_opening_is_unobstructed(self):
        cutaway_url = "file://" + os.path.join(ROOT, "skills", "scene-flow", "template", "themes", "terra3d", "vignettes", "cutaway.js")
        out = self.run_node_kit(f"""
const THREE = await import("three");
const {{ createKit }} = await import(KIT_URL);
const {{ build }} = await import({json.dumps(cutaway_url)});
const makeEl = (tag) => ({{
  tagName: tag, className: "", textContent: "", style: {{}}, children: [],
  append(...kids) {{ this.children.push(...kids); }},
}});
globalThis.document = {{ createElement: (tag) => makeEl(tag) }};
const baseKit = createKit({{ id: "cutaway", beats: {{ gate: 1.5 }}, layer: makeEl("div") }});
let capturedCut = null;
const kit = {{
  ...baseKit,
  async stage() {{ return new THREE.Scene(); }},
  async cutaway(opts) {{
    capturedCut = await baseKit.cutaway(opts);
    return capturedCut;
  }},
}};
const built = await build(kit);
built.update(3.5);
capturedCut.object.updateMatrixWorld(true);
const gate = capturedCut.gates[0];
const hingeZs = gate.pivots.map(p => p.pivot.position.z);
const minHz = Math.min(...hingeZs);
const maxHz = Math.max(...hingeZs);
const gx = gate.spec.x ?? 0;
const openingBox = new THREE.Box3(
  new THREE.Vector3(gx - 0.1, capturedCut.deckY + 0.05, minHz + 0.05),
  new THREE.Vector3(gx + 0.1, capturedCut.deckY + 2.4, maxHz - 0.05),
);
const excluded = new Set();
for (const c of capturedCut.chambers) {{ excluded.add(c.mesh); excluded.add(c.cap); }}
for (const g of capturedCut.gates) {{
  for (const p of g.pivots) p.pivot.traverse(n => excluded.add(n));
}}
const blockers = [];
capturedCut.object.traverse(n => {{
  if (!n.isMesh || excluded.has(n)) return;
  const b = new THREE.Box3().setFromObject(n);
  if (b.max.y <= capturedCut.deckY + 0.01) return;
  if (openingBox.intersectsBox(b)) {{
    blockers.push({{ min: b.min.toArray(), max: b.max.toArray() }});
  }}
}});
console.log(JSON.stringify({{ hingeZs, blockers }}));
""")
        self.assertEqual(len(out["hingeZs"]), 2)
        self.assertEqual(out["blockers"], [], f"wall meshes intersect open gate opening: {out['blockers']}")

    def test_actors_exports_and_unknown_clip_rejection(self):
        assets_json = os.path.join(ROOT, "skills", "scene-flow", "assets", "terra3d", "assets.json")
        out = self.run_node_kit(f"""
import fs from "node:fs";
const assets = JSON.parse(fs.readFileSync({json.dumps(assets_json)}, "utf8"));
const {{ createKit }} = await import(KIT_URL);
const kit = createKit({{ id: "canal_workers", beats: {{}} }});
const missing = ["shipGlb", "containerShip", "locomotive", "human", "validateClip"].filter(k => typeof kit[k] !== "function");
if (missing.length) {{
  console.log(JSON.stringify({{ missing }}));
}} else {{
  const cship = kit.containerShip({{ seed: 71, from: [0, 0, -4], to: [0, 0, 4], dur: 4 }});
  cship.update(2.0);
  const cs2a = cship.object.position.toArray();
  cship.update(0.5);
  cship.update(2.0);
  const cs2b = cship.object.position.toArray();
  const hasInstanced = Boolean(cship.containers && cship.containers.isInstancedMesh && cship.containers.count > 0);

  const loco = kit.locomotive({{ from: [-8, 0, 0], to: [8, 0, 0], dur: 4 }});
  loco.update(1.5);
  const l15a = loco.object.position.toArray();
  loco.update(3.5);
  const l35 = loco.object.position.toArray();
  loco.update(1.5);
  const l15b = loco.object.position.toArray();

  const knightClips = assets.models["Knight.glb"].clips.map(c => c.name);
  kit.validateClip("Knight.glb", "Idle", kit.id, knightClips);
  let badClipError = "";
  try {{
    await kit.human({{ model: "Knight.glb", clip: "Fantasy_Backflip", vignetteId: kit.id, clipNames: knightClips }});
  }} catch (err) {{
    badClipError = err.message;
  }}
  console.log(JSON.stringify({{ missing, cs2a, cs2b, hasInstanced, l15a, l15b, l35, badClipError }}));
}}
""")
        self.assertEqual(out["missing"], [], f"missing actors exports: {out['missing']}")
        self.assertTrue(out["hasInstanced"], "containerShip must use InstancedMesh for containers")
        self.assertEqual(out["cs2a"], out["cs2b"])
        self.assertEqual(out["l15a"], out["l15b"])
        self.assertNotEqual(out["l15a"], out["l35"])
        self.assertIn("canal_workers", out["badClipError"])
        self.assertIn("Fantasy_Backflip", out["badClipError"])
        self.assertIn("Knight.glb", out["badClipError"])

    def test_overlay_helpers_are_pure_functions_of_t(self):
        out = self.run_node_kit("""
const { createKit } = await import(KIT_URL);
const makeEl = (tag) => ({
  tagName: tag, className: "", textContent: "", style: {}, children: [],
  append(...kids) { this.children.push(...kids); },
});
globalThis.document = { createElement: (tag) => makeEl(tag) };
const layer = makeEl("div");
const kit = createKit({ id: "t_overlay", beats: {}, layer });
const missing = ["callout", "pill", "ibar", "span", "countValue", "projectPoint"].filter(k => typeof kit[k] !== "function");
if (missing.length) {
  console.log(JSON.stringify({ missing }));
} else {
  const c = kit.callout({ from: 0, to: 200, unit: " triệu lít", start: 0.2, dur: 2.0 });
  const p = kit.pill({ text: "Panama", at: [1, 1, 0], start: 0.1 });
  const ib = kit.ibar({ text: "26 m", a: [-2, 0, 0], b: [-2, 2.6, 0] });
  const sp = kit.span({ text: "60 m", a: [-3, 2, 0], b: [3, 2, 0] });
  const cam = kit.camera(40);
  cam.position.set(0, 2, 12);
  cam.lookAt(0, 1, 0);
  cam.updateMatrixWorld(true);
  const v0 = kit.countValue(0.0, { from: 0, to: 200, start: 0.2, dur: 2.0 });
  const vMidA = kit.countValue(1.2, { from: 0, to: 200, start: 0.2, dur: 2.0 });
  const vEnd = kit.countValue(2.5, { from: 0, to: 200, start: 0.2, dur: 2.0 });
  const vMidB = kit.countValue(1.2, { from: 0, to: 200, start: 0.2, dur: 2.0 });
  c.update(1.2, cam);
  const textMid = c.numEl.textContent;
  p.update(1.2, cam);
  ib.update(1.2, cam);
  sp.update(1.2, cam);
  const proj = kit.projectPoint([0, 1, 0], cam);
  console.log(JSON.stringify({
    missing, v0, vMidA, vMidB, vEnd, textMid, proj,
    pillLeft: p.element.style.left, ibDisplay: ib.element.style.display, spDisplay: sp.element.style.display,
  }));
}
""")
        self.assertEqual(out["missing"], [], f"missing overlay exports: {out['missing']}")
        self.assertEqual(out["v0"], 0)
        self.assertEqual(out["vEnd"], 200)
        self.assertEqual(out["vMidA"], out["vMidB"])
        self.assertGreater(out["vMidA"], 0)
        self.assertLess(out["vMidA"], 200)
        self.assertTrue(out["proj"]["visible"])
        self.assertIn("triệu lít", out["textMid"])
        self.assertEqual(out["ibDisplay"], "block")
        self.assertEqual(out["spDisplay"], "block")

    def test_phase4_vignettes_cover_all_required_primitives_and_table(self):
        vdir = os.path.join(ROOT, "skills", "scene-flow", "template", "themes", "terra3d", "vignettes")
        sources = "\n".join(open(os.path.join(vdir, f), encoding="utf-8").read()
                            for f in sorted(os.listdir(vdir)) if f.endswith(".js"))
        for prim in ("kit.globe", "kit.cutaway", "kit.human", "kit.callout", "kit.pill"):
            self.assertIn(prim, sources, f"missing Phase 4 vignette primitive: {prim}")
        self.assertTrue("kit.ibar" in sources or "kit.span" in sources, "missing dimension marker (kit.ibar or kit.span)")

    def test_all_kit_exports_used_by_sample_vignettes(self):
        out = self.run_node_kit("""
const { createKit } = await import(KIT_URL);
const kit = createKit({ id: "cov", beats: {} });
console.log(JSON.stringify({ keys: Object.keys(kit) }));
""")
        plumbing = {"id", "layer", "updateOverlays"}
        exports = [k for k in out["keys"] if k not in plumbing]
        vdir = os.path.join(ROOT, "skills", "scene-flow", "template", "themes", "terra3d", "vignettes")
        raw_sources = []
        for f in sorted(os.listdir(vdir)):
            if f.endswith(".js"):
                with open(os.path.join(vdir, f), encoding="utf-8") as fh:
                    raw_sources.append(fh.read())
        code = re.sub(r"//.*", "", "\n".join(raw_sources))
        destructured = set()
        for m in re.finditer(r"const\s*\{([^}]+)\}\s*=\s*kit\b", code):
            for part in m.group(1).split(","):
                name = part.split(":")[0].strip()
                if name:
                    destructured.add(name)
        missing = [k for k in exports if not re.search(rf"\bkit\.{re.escape(k)}\b", code) and k not in destructured]
        self.assertEqual(missing, [], f"unused createKit exports in sample vignettes: {missing}")

    def test_sample_vignette_count_and_median_length(self):
        import statistics
        d = self.project()
        r = self.build(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        with open(os.path.join(d, "ledger.json"), encoding="utf-8") as fh:
            ledger = json.load(fh)
        vignettes = ledger["vignettes"]
        self.assertGreaterEqual(len(vignettes), 15, f"expected 15..25 vignettes, got {len(vignettes)}")
        self.assertLessEqual(len(vignettes), 25, f"expected 15..25 vignettes, got {len(vignettes)}")
        lengths = [v["end"] - v["t"] for v in vignettes]
        median_len = statistics.median(lengths)
        self.assertGreaterEqual(median_len, 2.0, f"median length {median_len:.2f}s < 2.0s")
        self.assertLessEqual(median_len, 4.0, f"median length {median_len:.2f}s > 4.0s")
        for v in vignettes:
            self.assertGreaterEqual(v["end"] - v["t"], 1.0, f"{v['id']} shorter than 1.0s")
            self.assertEqual(v["in"]["kind"], "cut", f"{v['id']} must use cut transition")

    def test_fix_cycle_1_content_and_arc_width(self):
        tdir = os.path.join(ROOT, "skills", "scene-flow", "template", "themes", "terra3d")
        def read_rel(*parts):
            with open(os.path.join(tdir, *parts), encoding="utf-8") as fh:
                return fh.read()
        script = read_rel("SCRIPT.md")
        self.assertNotIn("hai sáu mét", script)
        self.assertIn("hai mươi sáu mét", script)

        cape_horn = read_rel("vignettes", "cape_horn.js")
        self.assertNotIn("Hành trình vòng cực nam", cape_horn)
        self.assertIn("Quãng đường rút ngắn", cape_horn)

        chamber_fill = read_rel("vignettes", "chamber_fill.js")
        self.assertNotIn("Thể tích buồng âu", chamber_fill)
        self.assertNotIn("triệu lít", chamber_fill)

        topography = read_rel("vignettes", "topography.js")
        self.assertNotIn("sans-serif", topography)
        self.assertNotIn("EO ĐẤT 80 KM", topography)
        self.assertIn("Kênh dài 80 km", topography)
        self.assertIn("kit.pill(", topography)
        self.assertIn("kit.canvasTexture(", topography)

        out = self.run_node_kit("""
const { createKit } = await import(KIT_URL);
const kit = createKit({ id: "t_arc_scale", beats: {} });
const arcWide = kit.routeArc({ from: [40.7, -74.0], to: [9.1, -79.7], radius: 1.9, radiusTube: 0.014 });
const camWide = kit.camera(38);
kit.globeZoom(camWide, 1.0, { fromLatLon: [22, -62], toLatLon: [16, -82], radius: 1.9, fromDist: 23.0, toDist: 21.0, dur: 2.0 });
arcWide.update(1.0, camWide);

const arcClose = kit.routeArc({ from: [11.5, -77.5], to: [7.2, -81.8], radius: 3.2, radiusTube: 0.008 });
const camClose = kit.camera(38);
kit.globeZoom(camClose, 1.0, { fromLatLon: [4.0, -76.0], toLatLon: [0.8, -80.5], radius: 3.2, fromDist: 10.2, toDist: 8.2, dur: 2.0 });
arcClose.update(1.0, camClose);

console.log(JSON.stringify({
  wideScale: arcWide.object.material.uniforms.uWidthScale.value,
  closeScale: arcClose.object.material.uniforms.uWidthScale.value,
}));
""")
        self.assertLess(out["closeScale"], out["wideScale"] * 0.5, f"close-zoom arc scale too thick: {out}")


    def ambience_file(self, d, name="ocean.mp3", seconds=8):
        """Write a pink-noise file as the project's ambience and return its project-relative path."""
        rel = os.path.join("assets", "audio", "freesound", name)
        os.makedirs(os.path.join(d, os.path.dirname(rel)), exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anoisesrc=d=%d:c=pink:a=0.3:r=44100" % seconds,
                        "-c:a", "libmp3lame", os.path.join(d, rel)], check=True)
        return rel

    def set_ambience(self, d, ambience):
        """Set `ambience` on vignette rows by index: {1: {"file": ..., "gain": ...}, ...}."""
        self.edit_vignettes(d, lambda rows: [rows[k].update(ambience=a) for k, a in ambience.items()])

    def mean_db(self, d, start, length):
        out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", str(start), "-t", str(length), "-i",
                              os.path.join(d, "assets", "audio", "sfx-mix.mp3"), "-af", "volumedetect", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
        return float(re.search(r"mean_volume:\s*(-?[\d.]+) dB", out).group(1))

    def test_ambience_copied_to_ledger(self):
        d = self.project()
        rel = self.ambience_file(d)
        self.set_ambience(d, {2: {"file": rel, "gain": "medium"}})
        r = self.build(d)
        self.assertEqual(r.returncode, 0, r.stderr)
        ledger = json.load(open(os.path.join(d, "ledger.json"), encoding="utf-8"))
        self.assertEqual(ledger["theme"], "terra3d")
        self.assertEqual({v["id"]: v["ambience"] for v in ledger["vignettes"] if "ambience" in v},
                         {"aerial": {"file": rel, "gain": "medium"}})

    def test_ambience_missing_file_rejected(self):
        d = self.project()
        self.set_ambience(d, {1: {"file": "assets/audio/freesound/ocean.mp3", "gain": "soft"}})
        self.rejects(d, "missing ambience file", "'canal'")

    def test_ambience_unknown_category_rejected(self):
        d = self.project()
        rel = self.ambience_file(d)
        self.set_ambience(d, {1: {"file": rel, "gain": "loud"}})
        self.rejects(d, "invalid ambience", "'canal'")

    def test_no_sound_on_terra3d_seams(self):
        d = self.project()
        self.assertEqual(self.build(d).returncode, 0)
        r = self.run_in(d, "add-sfx.py")
        self.assertEqual(r.returncode, 0, r.stderr)
        cues = json.load(open(os.path.join(d, "sfx-cues.json"), encoding="utf-8"))
        self.assertEqual([c["sound"] for c in cues], ["thud"])

    def test_ambience_mixed_under_voice_and_bed_and_merged(self):
        d = self.project()
        rel = self.ambience_file(d)
        self.set_ambience(d, {1: {"file": rel, "gain": "medium"}, 2: {"file": rel, "gain": "medium"}})
        self.assertEqual(self.build(d).returncode, 0)
        r = self.run_in(d, "add-sfx.py")
        self.assertEqual(r.returncode, 0, r.stderr)
        ledger = json.load(open(os.path.join(d, "ledger.json"), encoding="utf-8"))
        start, end = ledger["vignettes"][1]["t"], ledger["vignettes"][2]["end"]
        cues = json.load(open(os.path.join(d, "sfx-cues.json"), encoding="utf-8"))
        amb = [c for c in cues if c["sound"] == rel]
        self.assertEqual(len(amb), 1, "consecutive vignettes with one file are one span")
        self.assertEqual((amb[0]["t"], amb[0]["dur"]), (start, round(end - start, 3)))
        # the level model of audio-mix.md: medium targets -39 dB, which is under the bed at -33 dB
        self.assertAlmostEqual(self.mean_db(d, start + 0.5, end - start - 1.0), -39.0, delta=1.5)
        self.assertLess(self.mean_db(d, start + 0.5, end - start - 1.0), -33.0)
        self.assertLess(self.mean_db(d, end + 0.5, 3.0), -60.0)


if __name__ == "__main__":
    unittest.main()
