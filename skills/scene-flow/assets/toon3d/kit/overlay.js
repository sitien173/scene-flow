// DOM overlay for toon3d: a white pill label projected from a 3D point, with a leader line and a dot at that point.
import * as THREE from "three";

const tmpVec = new THREE.Vector3();
const EDGE = 40; // px between a pill and the frame edge

// Projects a 3D world point through camera into 1080 x 1920 pixel coordinates.
export function projectPoint(worldPos, camera, width = 1080, height = 1920) {
  if (worldPos && worldPos.isObject3D) worldPos.getWorldPosition(tmpVec);
  else if (worldPos && worldPos.isVector3) tmpVec.copy(worldPos);
  else tmpVec.set(worldPos[0], worldPos[1], worldPos[2]);
  tmpVec.project(camera);
  return {
    x: (tmpVec.x * 0.5 + 0.5) * width,
    y: (-tmpVec.y * 0.5 + 0.5) * height,
    z: tmpVec.z,
    visible: Number.isFinite(tmpVec.x) && Number.isFinite(tmpVec.y) && tmpVec.z >= -1 && tmpVec.z <= 1,
  };
}

// True when a projected point keeps EDGE px from every frame edge, so a dot or number centred on it stays inside the frame.
function inset(p, width, height) {
  return p.x >= EDGE && p.x <= width - EDGE && p.y >= EDGE && p.y <= height - EDGE;
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

// Pill label at a 3D point. `at` is a point, or a function of t that returns one. `offset` moves the pill in pixels from that point.
// The leader runs from the pill centre to the point; the pill is stacked above it, so only the leader's visible part shows.
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
  const leader = document.createElement("div");
  leader.className = "toon-leader";
  const dot = document.createElement("div");
  dot.className = "toon-dot";
  const el = document.createElement("div");
  el.className = "toon-pill";
  el.textContent = text;
  if (layer) layer.append(leader, dot, el);

  function hide() {
    el.style.display = "none";
    el.style.opacity = "0";
    leader.style.display = "none";
    dot.style.display = "none";
  }

  function update(t, camera) {
    const op = windowOpacity(t, { start, fadeIn, end, fadeOut });
    if (!camera || op <= 0.005) {
      hide();
      return;
    }
    const p = projectPoint(resolvePoint(at, t), camera, width, height);
    // A target outside the frame inset hides the whole label, so no leader or dot shows past the edge.
    if (!p.visible || !inset(p, width, height)) {
      hide();
      return;
    }
    // The pill is centred on sx, so the clamp uses its measured width: it keeps EDGE px from both frame edges.
    el.style.display = "block";
    const half = el.offsetWidth / 2;
    const sx = Math.min(width - half - EDGE, Math.max(half + EDGE, p.x + offset[0]));
    const sy = Math.min(height - 140, Math.max(250, p.y + offset[1]));
    const dx = p.x - sx;
    const dy = p.y - sy;
    const o = op.toFixed(3);
    el.style.opacity = o;
    el.style.left = sx.toFixed(1) + "px";
    el.style.top = sy.toFixed(1) + "px";
    leader.style.display = "block";
    leader.style.opacity = o;
    leader.style.left = sx.toFixed(1) + "px";
    leader.style.top = (sy - 2).toFixed(1) + "px";
    leader.style.width = Math.hypot(dx, dy).toFixed(1) + "px";
    leader.style.transform = "rotate(" + Math.atan2(dy, dx).toFixed(4) + "rad)";
    dot.style.display = "block";
    dot.style.opacity = o;
    dot.style.left = p.x.toFixed(1) + "px";
    dot.style.top = p.y.toFixed(1) + "px";
  }
  return { element: el, update };
}

// Counter tags: a white number with an ink outline over each anchored panel, one number every `step` seconds from `start`,
// and a yellow multiplier badge at `badgeOffset` px from `badgeAt`. The counter shows in [start, end). Each number is
// clamped to EDGE px from the frame; a tag that cannot fit is caught by tests/toon3d-check.mjs.
export function counterTags(layer, {
  anchors = [],
  start = 0,
  step = 0.2,
  end = Infinity,
  badge = "×10",
  badgeAnchor = null,
  badgeOffset = [0, -150],
  badgeStart = 0,
  badgeEnd = Infinity,
  width = 1080,
  height = 1920,
} = {}) {
  const tags = anchors.map((at, i) => {
    const el = document.createElement("div");
    el.className = "toon-num";
    el.textContent = String(i + 1);
    if (layer) layer.append(el);
    return { el, at, from: start + i * step };
  });
  const bagel = document.createElement("div");
  bagel.className = "toon-badge";
  bagel.textContent = badge;
  if (layer) layer.append(bagel);

  function update(t, camera) {
    for (const tag of tags) {
      const on = camera && t >= tag.from && t < end;
      if (!on) { tag.el.style.display = "none"; continue; }
      const p = projectPoint(resolvePoint(tag.at, t), camera, width, height);
      if (!p.visible || !inset(p, width, height)) { tag.el.style.display = "none"; continue; }
      tag.el.style.display = "block";
      const half = tag.el.offsetWidth / 2;
      const sx = Math.min(width - half - EDGE, Math.max(half + EDGE, p.x));
      const sy = Math.min(height - 140, Math.max(250, p.y));
      tag.el.style.left = sx.toFixed(1) + "px";
      tag.el.style.top = sy.toFixed(1) + "px";
    }
    const shown = camera && t >= badgeStart && t < badgeEnd && badgeAnchor;
    if (!shown) { bagel.style.display = "none"; return; }
    const p = projectPoint(resolvePoint(badgeAnchor, t), camera, width, height);
    if (!p.visible || !inset(p, width, height)) { bagel.style.display = "none"; return; }
    bagel.style.display = "block";
    const half = bagel.offsetWidth / 2;
    const sx = Math.min(width - half - EDGE, Math.max(half + EDGE, p.x + badgeOffset[0]));
    const sy = Math.min(height - 140, Math.max(250, p.y + badgeOffset[1]));
    bagel.style.left = sx.toFixed(1) + "px";
    bagel.style.top = sy.toFixed(1) + "px";
  }
  update(-1, null);
  return { elements: [...tags.map(tag => tag.el), bagel], update };
}

// Flash: one full-frame violet frame (`frames` long at `fps`) from `at`, the reference's transition at 132.83 s. Optional.
export function flash(layer, { at = 0, frames = 1, fps = 30, color = "#8686A8" } = {}) {
  const el = document.createElement("div");
  el.className = "toon-flash";
  el.style.background = color;
  if (layer) layer.append(el);
  const dur = frames / fps;
  function update(t) {
    el.style.opacity = t >= at && t < at + dur ? "1" : "0";
  }
  update(-1);
  return { element: el, update };
}
