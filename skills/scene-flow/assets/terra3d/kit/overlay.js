// DOM overlay helpers for terra3d: count-up callouts, projected pill labels, and I-bar / span dimension markers.
import * as THREE from "three";
import { ease, lerp, progress } from "./motion.js";

const tmpVec = new THREE.Vector3();

// Pure numeric count-up value as a function of t.
export function countValue(t, { from = 0, to = 100, start = 0, dur = 1.6, curve = "out", decimals = 0 } = {}) {
  const val = lerp(from, to, ease(progress(t, start, dur), curve));
  const factor = 10 ** decimals;
  return decimals > 0 ? Math.round(val * factor) / factor : Math.round(val);
}

// Projects a 3D world point through camera into 1080 x 1920 pixel coordinates.
export function projectPoint(worldPos, camera, width = 1080, height = 1920) {
  if (worldPos && worldPos.isVector3) tmpVec.copy(worldPos);
  else tmpVec.set(worldPos[0], worldPos[1], worldPos[2]);
  tmpVec.project(camera);
  return {
    x: (tmpVec.x * 0.5 + 0.5) * width,
    y: (-tmpVec.y * 0.5 + 0.5) * height,
    z: tmpVec.z,
    visible: Number.isFinite(tmpVec.x) && Number.isFinite(tmpVec.y) && tmpVec.z >= -1 && tmpVec.z <= 1,
  };
}

function windowOpacity(t, { start = 0, fadeIn = 0.22, end = Infinity, fadeOut = 0.22 } = {}) {
  if (t < start || t >= end) return 0;
  const opIn = fadeIn > 0 ? Math.min(1, (t - start) / fadeIn) : 1;
  const opOut = Number.isFinite(end) && fadeOut > 0 ? Math.min(1, (end - t) / fadeOut) : 1;
  return Math.max(0, Math.min(opIn, opOut));
}

function resolvePoint(pt, t) {
  return typeof pt === "function" ? pt(t) : pt;
}

// Large count-up numeric callout anchored in screen space (away from watermark and caption band).
export function callout(layer, {
  from = 0,
  to = 200,
  prefix = "",
  unit = "",
  label = "",
  decimals = 0,
  format = null,
  x = 540,
  y = 260,
  start = 0,
  dur = 1.8,
  end = Infinity,
  fadeIn = 0.22,
  fadeOut = 0.22,
  curve = "out",
} = {}) {
  const el = document.createElement("div");
  el.className = "t3d-callout";
  const numEl = document.createElement("div");
  numEl.className = "t3d-callout-num";
  const labelEl = document.createElement("div");
  labelEl.className = "t3d-callout-label";
  labelEl.textContent = label;
  el.append(numEl, labelEl);
  if (layer) layer.append(el);

  function update(t) {
    const op = windowOpacity(t, { start, fadeIn, end, fadeOut });
    el.style.display = op > 0.005 ? "block" : "none";
    el.style.opacity = op.toFixed(3);
    el.style.left = x + "px";
    el.style.top = y + "px";
    const val = countValue(t, { from, to, start, dur, curve, decimals });
    const formatted = format ? format(val) : (decimals > 0 ? val.toFixed(decimals) : String(val));
    numEl.textContent = `${prefix}${formatted}${unit}`;
    labelEl.style.display = label ? "block" : "none";
  }
  update(0);
  return { element: el, numEl, labelEl, update };
}

// Pill place label projected from a 3D world point each frame.
export function pill(layer, {
  text = "",
  at = [0, 0, 0],
  offset = [0, -44],
  start = 0,
  end = Infinity,
  fadeIn = 0.22,
  fadeOut = 0.22,
  width = 1080,
  height = 1920,
} = {}) {
  const el = document.createElement("div");
  el.className = "t3d-pill";
  el.textContent = text;
  if (layer) layer.append(el);

  function update(t, camera) {
    const op = windowOpacity(t, { start, fadeIn, end, fadeOut });
    if (!camera || op <= 0.005) {
      el.style.display = "none";
      el.style.opacity = "0";
      return;
    }
    const p = projectPoint(resolvePoint(at, t), camera, width, height);
    if (!p.visible) {
      el.style.display = "none";
      el.style.opacity = "0";
      return;
    }
    const sx = Math.min(width - 140, Math.max(140, p.x + offset[0]));
    const sy = Math.min(height - 140, Math.max(250, p.y + offset[1]));
    el.style.display = "block";
    el.style.opacity = op.toFixed(3);
    el.style.left = sx.toFixed(1) + "px";
    el.style.top = sy.toFixed(1) + "px";
  }
  return { element: el, update };
}

function dimensionMarker(kind, layer, {
  text = "",
  a = [0, 0, 0],
  b = [0, 1, 0],
  labelOffset = [0, 0],
  start = 0,
  end = Infinity,
  fadeIn = 0.22,
  fadeOut = 0.22,
  width = 1080,
  height = 1920,
} = {}) {
  const el = document.createElement("div");
  el.className = `t3d-dim t3d-${kind}`;
  const line = document.createElement("div");
  line.className = "t3d-dim-line";
  const capA = document.createElement("div");
  capA.className = "t3d-dim-cap";
  const capB = document.createElement("div");
  capB.className = "t3d-dim-cap";
  const label = document.createElement("div");
  label.className = "t3d-dim-label";
  label.textContent = text;
  el.append(line, capA, capB, label);
  if (layer) layer.append(el);

  function update(t, camera) {
    const op = windowOpacity(t, { start, fadeIn, end, fadeOut });
    if (!camera || op <= 0.005) {
      el.style.display = "none";
      el.style.opacity = "0";
      return;
    }
    const pA = projectPoint(resolvePoint(a, t), camera, width, height);
    const pB = projectPoint(resolvePoint(b, t), camera, width, height);
    if (!pA.visible || !pB.visible) {
      el.style.display = "none";
      el.style.opacity = "0";
      return;
    }
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const capAngle = angle + Math.PI * 0.5;
    el.style.display = "block";
    el.style.opacity = op.toFixed(3);

    line.style.left = pA.x.toFixed(1) + "px";
    line.style.top = pA.y.toFixed(1) + "px";
    line.style.width = len.toFixed(1) + "px";
    line.style.transform = `translateY(-50%) rotate(${angle.toFixed(4)}rad)`;

    capA.style.left = pA.x.toFixed(1) + "px";
    capA.style.top = pA.y.toFixed(1) + "px";
    capA.style.transform = `translate(-50%, -50%) rotate(${capAngle.toFixed(4)}rad)`;

    capB.style.left = pB.x.toFixed(1) + "px";
    capB.style.top = pB.y.toFixed(1) + "px";
    capB.style.transform = `translate(-50%, -50%) rotate(${capAngle.toFixed(4)}rad)`;

    label.style.left = ((pA.x + pB.x) * 0.5 + labelOffset[0]).toFixed(1) + "px";
    label.style.top = ((pA.y + pB.y) * 0.5 + labelOffset[1]).toFixed(1) + "px";
  }
  return { element: el, line, capA, capB, label, update };
}

// Vertical I-bar dimension marker projected from two 3D points.
export function ibar(layer, opts = {}) {
  return dimensionMarker("ibar", layer, { labelOffset: [58, 0], ...opts });
}

// Horizontal span dimension marker projected from two 3D points.
export function span(layer, opts = {}) {
  return dimensionMarker("span", layer, { labelOffset: [0, -34], ...opts });
}
