// Motion helpers. Every helper is a pure function of the time it is given; none keeps state between frames.
import * as THREE from "three";
import { glow } from "./look.js";

export const clamp01 = x => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
export const lerp = (a, b, x) => a + (b - a) * x;

const CURVES = {
  linear: x => x,
  in: x => x * x * x,
  out: x => 1 - (1 - x) ** 3,
  inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  back: x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
};

// ease(x, "inOut") with x clamped to 0..1; window(t, start, dur) maps a time into that range.
export function ease(x, kind = "inOut") {
  return (CURVES[kind] || CURVES.inOut)(clamp01(x));
}
export const progress = (t, start, dur) => clamp01((t - start) / Math.max(dur, 1e-3));

// Scale for a pop-in that starts at `start`: 0 before, overshoots, settles at 1.
export function pop(t, start = 0, dur = 0.55) {
  const x = progress(t, start, dur);
  return x <= 0 ? 0 : x >= 1 ? 1 : CURVES.back(x);
}

// mulberry32: the only randomness allowed in vignettes, always seeded.
export function rand(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const v3 = p => (p && p.isVector3 ? p : new THREE.Vector3(...(p || [0, 0, 0])));

// Camera moves from `from` to `to` between start and start + dur, always looking at `look` (or from lookFrom to look).
export function dolly(camera, t, { from, to, look = [0, 1, 0], lookFrom, start = 0, dur = 4, curve = "inOut" }) {
  const x = ease(progress(t, start, dur), curve);
  camera.position.lerpVectors(v3(from), v3(to), x);
  camera.lookAt(new THREE.Vector3().lerpVectors(v3(lookFrom || look), v3(look), x));
}

// Camera on a circle around `center`; angle in radians at start, turning `speed` radians per second.
export function orbit(camera, t, { center = [0, 1, 0], radius = 8, height = 3, angle = 0, speed = 0.15, look } = {}) {
  const c = v3(center);
  const a = angle + speed * t;
  camera.position.set(c.x + Math.sin(a) * radius, c.y + height, c.z + Math.cos(a) * radius);
  camera.lookAt(look ? v3(look) : c);
}

// Glowing pixel cubes rising from a base point, fading as they climb.
export function pixels({ color = "#3DE8FF", count = 24, origin = [0, 0, 0], spread = 0.6, height = 2.2, size = 0.07, speed = 0.35, seed = 7 } = {}) {
  const r = rand(seed);
  const seeds = Array.from({ length: count }, () => [r(), r() * Math.PI * 2, 0.4 + r() * 0.6]);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size), glow(color, 2.4), count);
  const base = v3(origin);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  function update(t) {
    seeds.forEach(([phase, angle, k], i) => {
      const life = (t * speed * k + phase) % 1;
      const radius = spread * (0.3 + 0.7 * k) * (0.4 + life);
      p.set(base.x + Math.cos(angle + life * 2) * radius, base.y + life * height, base.z + Math.sin(angle + life * 2) * radius);
      s.setScalar(Math.max(0.001, 1 - life));
      mesh.setMatrixAt(i, m.compose(p, q, s));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { object: mesh, update };
}

// A glowing segment that travels along a curve through `points`; a dim tube shows the whole path.
export function trail(points, { color = "#3DE8FF", radius = 0.05, length = 0.25, speed = 0.3, dim = 0.22, closed = false, segments = 160 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(v3), closed);
  const geometry = new THREE.TubeGeometry(curve, segments, radius, 8, closed);
  const group = new THREE.Group();
  const path = new THREE.Mesh(geometry, glow(color, dim));
  const head = new THREE.Mesh(geometry.clone(), glow(color, 3.2));
  group.add(path, head);
  const perSegment = 8 * 6;
  // update(t) loops by default; update(t, x) places the segment end at fraction x of the path.
  function update(t, at) {
    const x = at === undefined ? (t * speed) % 1 : clamp01(at);
    const end = Math.round(x * segments);
    const begin = Math.max(0, end - Math.round(length * segments));
    head.visible = end > begin;
    head.geometry.setDrawRange(begin * perSegment, (end - begin) * perSegment);
    path.visible = dim > 0;
  }
  update(0);
  return { object: group, curve, update };
}

// Typewriter text on the vignette's DOM layer. Returns update(t); the text types from `start` at `cps` characters per second.
export function type(layer, text, { x = 540, y = 300, size = 58, color = "#F4F1FF", glowColor = "#7C4DFF", start = 0, cps = 18, caret = true } = {}) {
  const el = document.createElement("div");
  el.className = "nv-text";
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.fontSize = size + "px";
  el.style.color = color;
  el.style.textShadow = "0 0 18px " + glowColor + ",0 0 4px rgba(0,0,0,0.9)";
  const span = document.createElement("span");
  const mark = document.createElement("span");
  mark.className = "nv-caret";
  el.append(span, mark);
  layer.append(el);
  const chars = [...text];
  function update(t) {
    const n = Math.max(0, Math.min(chars.length, Math.floor((t - start) * cps)));
    span.textContent = chars.slice(0, n).join("");
    el.style.visibility = t < start ? "hidden" : "visible";
    mark.style.opacity = caret && (n < chars.length || Math.floor(t * 2.2) % 2 === 0) ? "1" : "0";
  }
  update(0);
  return { element: el, update };
}

// Moves obj from `from` to `to` over [start, start + dur], facing the direction of travel; heightAt adds wave pitch and roll.
export function followPath(obj, t, { from, to, start = 0, dur = 4, curve = "linear", heightAt, waterLevel = 0, baseYaw = 0 } = {}) {
  if (!from || !to) return;
  const x = ease(progress(t, start, dur), curve);
  const px = lerp(from[0], to[0], x);
  const pz = lerp(from[2], to[2], x);
  const py = heightAt ? heightAt(px, pz, t) : lerp(from[1], to[1], x);
  obj.position.set(px, py, pz);
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  if (Math.hypot(dx, dz) > 1e-4) {
    obj.rotation.y = Math.atan2(dx, dz) + baseYaw;
  }
  if (heightAt) {
    const d = 0.6;
    const len = Math.hypot(dx, dz) || 1;
    const fx = dx / len;
    const fz = dz / len;
    const rx = -fz;
    const rz = fx;
    const pitch = -Math.atan2(heightAt(px + fx * d, pz + fz * d, t) - heightAt(px - fx * d, pz - fz * d, t), d * 2) * 0.55;
    const roll = Math.atan2(heightAt(px + rx * d, pz + rz * d, t) - heightAt(px - rx * d, pz - rz * d, t), d * 2) * 0.55;
    obj.rotation.x = pitch;
    obj.rotation.z = roll;
    obj.position.y = py + (from[1] - waterLevel);
  }
}
