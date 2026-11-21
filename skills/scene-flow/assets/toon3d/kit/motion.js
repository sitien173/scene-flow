// Motion helpers. Every helper is a pure function of the time it is given; none keeps state between frames.
import * as THREE from "three";

export const clamp01 = x => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
export const lerp = (a, b, x) => a + (b - a) * x;

const CURVES = {
  linear: x => x,
  in: x => x * x * x,
  out: x => 1 - (1 - x) ** 3,
  inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  back: x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
};

// ease(x, "inOut") with x clamped to 0..1.
export function ease(x, kind = "inOut") {
  return (CURVES[kind] || CURVES.inOut)(clamp01(x));
}
export const progress = (t, start, dur) => clamp01((t - start) / Math.max(dur, 1e-3));

// Scale for a pop-in that starts at `start`: 0 before, overshoots, settles at 1.
export function pop(t, start = 0, dur = 0.4) {
  const x = progress(t, start, dur);
  return x <= 0 ? 0 : x >= 1 ? 1 : CURVES.back(x);
}

// Pop-in for a list of { mesh, start } items: each mesh grows from zero at its own start. A pure function of t.
export function popIn(items, t, dur = 0.45) {
  for (const it of items) it.mesh.scale.setScalar(Math.max(0.001, pop(t, it.start, dur)));
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
const tmpLook = new THREE.Vector3();

// Camera moves from `from` to `to` between start and start + dur, looking from lookFrom to look.
export function dolly(camera, t, { from, to, look = [0, 1, 0], lookFrom, start = 0, dur = 4, curve = "inOut", up = [0, 1, 0] }) {
  const x = ease(progress(t, start, dur), curve);
  camera.up.set(up[0], up[1], up[2]);
  camera.position.lerpVectors(v3(from), v3(to), x);
  tmpLook.lerpVectors(v3(lookFrom || look), v3(look), x);
  camera.lookAt(tmpLook);
}
