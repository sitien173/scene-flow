// The toon3d look: flat cel shading with a violet shade, black ink on silhouettes and creases, and deterministic shadow maps on a pastel daylight stage.
import * as THREE from "three";
import { mergeVertices, mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rand } from "./motion.js";

// Sampled from the reference frames (research/theme-toon3d/SPEC.md, section 1). Wall #EEC8AE is the facade at 0.0 s and
// sky #B9D7EB is the sky at 26.0 s, both measured from the reference frames.
// Roof grey, lawn, and trunk were re-sampled from the reference frames at 7.5 s and 19.8 s.
export const PALETTE = {
  wall: "#EEC8AE", roof: "#DDD9CF", floor: "#D5D1C8", lawn: "#9CD16B", panel: "#4564C2",
  shadow: "#7E72B4", softShadow: "#AFAEBF", ink: "#1B1B1F", white: "#FFFFFF", sky: "#B9D7EB",
  skin: "#E8B88E", teal: "#1F8A8A", navy: "#2E3A4A", metal: "#B8BEC6", red: "#DF342C",
  trunk: "#805A3F", canopy: "#6DB24A", door: "#8A5A3B", glass: "#A9C7DA",
  // Measured from the reference frames (SHOTS.md and the 1 fps contact sheets): caption yellow, rooftop concrete, street grey, flash violet.
  yellow: "#F7D33F", concrete: "#DDDAD0", road: "#888C91", flash: "#8686A8",
};

// Rough concrete: near-white noise that the concrete colour tints. Seeded, so every build draws the same pixels.
let CONCRETE_MAP = null;
// A concrete map for a face of width x depth metres, one tile every `tile` metres, so the mottling reads at street framing.
export function concreteTexture(width = 240, depth = 240, tile = 2.5) {
  if (!CONCRETE_MAP) CONCRETE_MAP = makeConcrete();
  const map = CONCRETE_MAP.clone();
  map.repeat.set(width / tile, depth / tile);
  return map;
}

function makeConcrete() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext("2d");
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, 256, 256);
  const rnd = rand(11);
  // Mottling: soft grey blotches of 3 to 9 canvas px, the scale of the reference's concrete at street framing.
  for (let i = 0; i < 260; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 3 + rnd() * 6;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(120,115,105,0.14)");
    grd.addColorStop(1, "rgba(120,115,105,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // Specks: dark pinholes and light grit.
  for (let i = 0; i < 900; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 0.7 + rnd() * 1.1;
    g.fillStyle = rnd() < 0.6 ? "rgba(90,86,80,0.35)" : "rgba(255,255,255,0.6)";
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

// Street-level road for exterior framing: a flat grey strip with a white dashed centre line, from z0 to z0 + depth.
export function road({ z0 = 12, depth = 60, width = 240 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const g = canvas.getContext("2d");
  g.fillStyle = PALETTE.road;
  g.fillRect(0, 0, 64, 256);
  g.fillStyle = PALETTE.white;
  g.fillRect(30, 0, 4, 128);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, depth / 4);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), toon(PALETTE.road, map));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.02, z0 + depth / 2);
  return mesh;
}

// Lawn at ground level behind the house, the green band at the top of the reference's exterior frames. A flat plane.
export function lawn({ z0 = -10, depth = 30, width = 240 } = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), toon(PALETTE.lawn));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.03, z0 - depth / 2);
  return mesh;
}

// Three flat bands: the violet shade, the midtone, and the lit side. The shade band tints every shadow violet.
const BANDS = new THREE.DataTexture(new Uint8Array([140, 130, 168, 255, 200, 194, 214, 255, 255, 255, 255, 255]), 3, 1);
BANDS.minFilter = THREE.NearestFilter;
BANDS.magFilter = THREE.NearestFilter;
BANDS.needsUpdate = true;

export function toon(color = PALETTE.wall, map = null) {
  return new THREE.MeshToonMaterial({ color, map, gradientMap: BANDS });
}

// A solar panel face: blue cells with thin white seams, drawn once on a canvas. No image file.
let PANEL_MAP = null;
export function panelTexture() {
  if (PANEL_MAP) return PANEL_MAP;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext("2d");
  g.fillStyle = PALETTE.panel;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = PALETTE.white;
  g.lineWidth = 5;
  for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(i * 256 / 6, 0); g.lineTo(i * 256 / 6, 256); g.stroke(); }
  for (let i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(0, i * 256 / 10); g.lineTo(256, i * 256 / 10); g.stroke(); }
  PANEL_MAP = new THREE.CanvasTexture(canvas);
  PANEL_MAP.colorSpace = THREE.SRGBColorSpace;
  return PANEL_MAP;
}

const INK = new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide });
const INK_FACE = new THREE.MeshBasicMaterial({ color: PALETTE.ink });

// Crease strokes: every edge sharper than 35 degrees becomes a thin prism of the given radius, merged into one mesh.
function creases(mesh, radius) {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 35);
  const pos = edges.attributes.position;
  const parts = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  for (let i = 0; i + 1 < pos.count; i += 2) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    const len = a.distanceTo(b);
    if (len < 1e-6) continue;
    const prism = new THREE.CylinderGeometry(radius, radius, len, 4, 1);
    q.setFromUnitVectors(up, b.clone().sub(a).normalize());
    prism.applyQuaternion(q);
    prism.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    parts.push(prism);
  }
  edges.dispose();
  if (!parts.length) return null;
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}

// Ink under `object`: an inverted hull on every silhouette, and a prism on every crease. `width` is the stroke in world units.
export function ink(object, width = 0.03) {
  const meshes = [];
  object.traverse(o => { if (o.isMesh && !o.userData.inkHull) meshes.push(o); });
  for (const mesh of meshes) {
    const geometry = mesh.geometry.clone();
    geometry.deleteAttribute("normal");
    geometry.deleteAttribute("uv");
    const hull = mergeVertices(geometry);
    hull.computeVertexNormals();
    const pos = hull.attributes.position;
    const nor = hull.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) + nor.getX(i) * width, pos.getY(i) + nor.getY(i) * width, pos.getZ(i) + nor.getZ(i) * width);
    }
    const outline = new THREE.Mesh(hull, INK);
    outline.userData.inkHull = true;
    mesh.add(outline);
    const crease = creases(mesh, width / 2);
    if (crease) {
      const line = new THREE.Mesh(crease, INK_FACE);
      line.userData.inkHull = true;
      mesh.add(line);
    }
  }
  return object;
}

// Cast and receive shadows on every mesh except the ink strokes. Shadow maps depend only on the scene and the sun.
export function shadows(object) {
  object.traverse(o => { if (o.isMesh && !o.userData.inkHull) { o.castShadow = true; o.receiveShadow = true; } });
  return object;
}

// A pastel daylight stage: a flat sky colour, a white sky light with a violet ground light, one sun with a shadow map, and a concrete roof plane.
export async function stage({
  sky = PALETTE.sky,
  ground = PALETTE.concrete,
  sunPos = [-9, 16, 10],
  sunIntensity = 2.4,
  hemiIntensity = 1.0,
} = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(sky);
  scene.add(new THREE.HemisphereLight(PALETTE.white, PALETTE.shadow, hemiIntensity));
  const sun = new THREE.DirectionalLight(PALETTE.white, sunIntensity);
  sun.position.set(sunPos[0], sunPos[1], sunPos[2]);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 60 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), toon(ground, concreteTexture(240, 240)));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  // Violet cast shadows: a shadow-only plane just above the lawn, so the grass keeps its green under the shade.
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.ShadowMaterial({ color: PALETTE.shadow, opacity: 0.6 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.01;
  catcher.receiveShadow = true;
  scene.add(catcher);
  scene.userData.sun = sun;
  return scene;
}
