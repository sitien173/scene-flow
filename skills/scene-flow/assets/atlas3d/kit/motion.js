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
