// Six atlas3d props: sailingShip, cargoCrate, moneyBag, priceTag, arrow, riverPath.
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { PALETTE, canvasTexture, lineMaterial, toonMaterial } from "./look.js";
import { clamp01, ease, pop, progress } from "./motion.js";
import { addToonWithHull, attachMapDiorama } from "./figure.js";
import { LAND_H, lonLatToWorld } from "./map.js";

export const PROP_KINDS = ["sailingShip", "cargoCrate", "moneyBag", "priceTag", "arrow", "riverPath"];

function applyPlacement(group, options, diorama = {}) {
  const { position = null, rotationY = 0, scale = 1 } = options;
  if (position) {
    if (Array.isArray(position)) group.position.set(position[0], position[1], position[2]);
    else group.position.copy(position);
  }
  const pivot = new THREE.Group();
  group.add(pivot);
  attachMapDiorama(group, pivot, {
    rotationY,
    mapFacing: options.mapFacing ?? diorama.mapFacing ?? true,
    mapScale: options.mapScale ?? diorama.mapScale ?? 1.38,
    lift: diorama.lift ?? 0.14,
  });
  return { pivot, baseScale: scale };
}

function applyPopWindow(group, t, { at = 0, popDur = 0.45, outAt = Infinity, outDur = 0.35, baseScale = 1 } = {}) {
  const inS = pop(t, at, popDur);
  const outS = outAt < Infinity ? 1 - ease(progress(t, outAt - outDur, outDur), "in") : 1;
  const s = Math.max(0, inS * outS);
  if (s <= 0.01) {
    group.visible = false;
    group.scale.setScalar(0.001);
    return 0;
  }
  group.visible = true;
  group.scale.setScalar(baseScale * s);
  return s;
}

export function sailingShip(options = {}) {
  const group = new THREE.Group();
  group.userData.atlasHero = "prop";
  group.userData.propKind = "sailingShip";
  const { pivot, baseScale } = applyPlacement(group, options, { mapFacing: false, mapScale: 1.32, lift: 0 });
  const body = new THREE.Group();
  pivot.add(body);

  // Tapered boat hull.
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 0.34);
  hullShape.quadraticCurveTo(0.16, 0.14, 0.14, -0.24);
  hullShape.lineTo(-0.14, -0.24);
  hullShape.quadraticCurveTo(-0.16, 0.14, 0, 0.34);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 });
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.translate(0, 0.16, 0);
  addToonWithHull(body, hullGeo, "#8D5634", { thickness: 0.018, minY: 0.005 });

  // Deck plank inset.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.36), toonMaterial(PALETTE.landEdge));
  deck.position.set(0, 0.175, 0);
  body.add(deck);

  // Mast and billowing sails.
  const mast = addToonWithHull(body, new THREE.CylinderGeometry(0.022, 0.026, 0.56, 10), "#5A3822", { thickness: 0.012 });
  mast.position.set(0, 0.44, -0.02);

  const mainSailGeo = new THREE.BoxGeometry(0.32, 0.28, 0.032);
  const mainSail = addToonWithHull(body, mainSailGeo, PALETTE.white, { thickness: 0.014 });
  mainSail.position.set(0, 0.47, 0.03);

  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8), toonMaterial("#5A3822"));
  yard.rotation.z = Math.PI / 2;
  yard.position.set(0, 0.61, 0.02);
  body.add(yard);

  const pennant = addToonWithHull(body, new THREE.ConeGeometry(0.035, 0.11, 6), PALETTE.red, { thickness: 0.01 });
  pennant.rotation.z = -Math.PI / 2;
  pennant.position.set(0.06, 0.72, -0.02);

  function update(localTime) {
    const t = Number.isFinite(localTime) ? localTime : 0;
    const s = applyPopWindow(group, t, { ...options, baseScale });
    if (s <= 0) return;
    body.rotation.z = Math.sin(t * 2.4) * 0.06;
    body.rotation.x = Math.cos(t * 1.9) * 0.04;
    body.position.y = Math.sin(t * 2.4 + 0.6) * 0.018;
  }

  update(options.at ?? 0 + (options.popDur ?? 0.45));
  return { group, update, kind: "sailingShip" };
}

export function cargoCrate(options = {}) {
  const group = new THREE.Group();
  group.userData.atlasHero = "prop";
  group.userData.propKind = "cargoCrate";
  const { pivot, baseScale } = applyPlacement(group, options, { mapFacing: true, mapScale: 1.38, lift: 0.22 });

  const size = 0.44;
  const crateGeo = new THREE.BoxGeometry(size, size, size);
  crateGeo.translate(0, size / 2 + 0.01, 0);
  addToonWithHull(pivot, crateGeo, "#B9834D", { thickness: 0.02, minY: 0.005 });

  const trimMat = toonMaterial("#7A4E27");
  for (const sy of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(size + 0.03, 0.06, size + 0.03), trimMat);
    rim.position.set(0, size / 2 + 0.01 + sy * (size / 2 - 0.025), 0);
    rim.castShadow = true;
    pivot.add(rim);
  }
  const brace = new THREE.Mesh(new THREE.BoxGeometry(size * 0.92, 0.055, size + 0.032), trimMat);
  brace.position.set(0, size / 2 + 0.01, 0);
  brace.rotation.z = Math.PI / 4;
  pivot.add(brace);

  const brace2 = new THREE.Mesh(new THREE.BoxGeometry(size + 0.032, 0.055, size * 0.92), trimMat);
  brace2.position.set(0, size / 2 + 0.01, 0);
  brace2.rotation.x = Math.PI / 4;
  pivot.add(brace2);

  function update(localTime) {
    applyPopWindow(group, Number.isFinite(localTime) ? localTime : 0, { ...options, baseScale });
  }

  update((options.at ?? 0) + (options.popDur ?? 0.45));
  return { group, update, kind: "cargoCrate" };
}

export function moneyBag(options = {}) {
  const group = new THREE.Group();
  group.userData.atlasHero = "prop";
  group.userData.propKind = "moneyBag";
  const { pivot, baseScale } = applyPlacement(group, options, { mapFacing: true, mapScale: 1.38, lift: 0.16 });

  const sackGeo = new THREE.SphereGeometry(0.24, 18, 14);
  sackGeo.scale(1.05, 0.95, 0.96);
  sackGeo.translate(0, 0.235, 0);
  addToonWithHull(pivot, sackGeo, "#D7B46A", { thickness: 0.02, minY: 0.005 });

  const neck = addToonWithHull(pivot, new THREE.CylinderGeometry(0.085, 0.125, 0.1, 14), "#D7B46A", { thickness: 0.016 });
  neck.position.set(0, 0.42, 0);

  const ruff = addToonWithHull(pivot, new THREE.ConeGeometry(0.15, 0.12, 12), "#E6C77E", { thickness: 0.015 });
  ruff.rotation.x = Math.PI;
  ruff.position.set(0, 0.49, 0);

  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.022, 8, 16), toonMaterial(PALETTE.red));
  rope.rotation.x = Math.PI / 2;
  rope.position.set(0, 0.4, 0);
  pivot.add(rope);

  const coinTex = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = PALETTE.route;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#9C6914";
    g.lineWidth = 8;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = PALETTE.ink;
    g.font = "900 72px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("$", w / 2, h / 2 + 4);
  });
  const emblem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 0.024, 16),
    toonMaterial("#FFFFFF", { map: coinTex }),
  );
  emblem.rotation.x = Math.PI / 2;
  emblem.position.set(0, 0.235, 0.232);
  pivot.add(emblem);

  function update(localTime) {
    applyPopWindow(group, Number.isFinite(localTime) ? localTime : 0, { ...options, baseScale });
  }

  update((options.at ?? 0) + (options.popDur ?? 0.45));
  return { group, update, kind: "moneyBag" };
}

export function priceTag(options = {}) {
  const { text = "$15M", accent = PALETTE.red } = options;
  const group = new THREE.Group();
  group.userData.atlasHero = "prop";
  group.userData.propKind = "priceTag";
  const { pivot, baseScale } = applyPlacement(group, options, { mapFacing: true, mapScale: 1.38, lift: 0.08 });

  const holder = new THREE.Group();
  holder.rotation.z = options.tilt ?? -0.14;
  pivot.add(holder);

  const tex = canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = PALETTE.paper;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 14;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = accent;
    g.fillRect(14, 14, 84, h - 28);
    g.fillStyle = PALETTE.paper;
    g.beginPath();
    g.arc(56, h / 2, 18, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 6;
    g.stroke();

    g.fillStyle = PALETTE.ink;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const size = text.length > 6 ? 78 : 104;
    g.font = `900 ${size}px sans-serif`;
    g.fillText(text, (w + 84) / 2, h / 2 + 4);
  });

  const slabGeo = new THREE.BoxGeometry(0.76, 0.38, 0.06);
  const slab = addToonWithHull(holder, slabGeo, PALETTE.paper, { thickness: 0.02 });
  slab.position.set(0, 0.32, 0);

  const faceGeo = new THREE.PlaneGeometry(0.72, 0.34);
  const faceMat = new THREE.MeshBasicMaterial({ map: tex });
  const front = new THREE.Mesh(faceGeo, faceMat);
  front.position.set(0, 0.32, 0.032);
  const back = new THREE.Mesh(faceGeo, faceMat);
  back.rotation.y = Math.PI;
  back.position.set(0, 0.32, -0.032);
  holder.add(front, back);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16), toonMaterial(PALETTE.route));
  ring.position.set(-0.34, 0.52, 0);
  holder.add(ring);

  function update(localTime) {
    const t = Number.isFinite(localTime) ? localTime : 0;
    const s = applyPopWindow(group, t, { ...options, baseScale });
    if (s <= 0) return;
    holder.rotation.z = (options.tilt ?? -0.14) + Math.sin(t * 2.2) * 0.05;
  }

  update((options.at ?? 0) + (options.popDur ?? 0.45));
  return { group, update, kind: "priceTag" };
}

export function arrow(options = {}) {
  const group = new THREE.Group();
  group.userData.atlasHero = "prop";
  group.userData.propKind = "arrow";
  const { pivot, baseScale } = applyPlacement(group, options, { mapFacing: true, mapScale: 1.38, lift: 0.06 });

  const pulseGroup = new THREE.Group();
  pivot.add(pulseGroup);

  const shape = new THREE.Shape();
  shape.moveTo(-0.08, 0.0);
  shape.lineTo(0.08, 0.0);
  shape.lineTo(0.08, 0.34);
  shape.lineTo(0.2, 0.34);
  shape.lineTo(0.0, 0.62);
  shape.lineTo(-0.2, 0.34);
  shape.lineTo(-0.08, 0.34);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false });
  geo.translate(0, 0.02, -0.035);
  const mesh = addToonWithHull(pulseGroup, geo, PALETTE.white, { thickness: 0.024, hullColor: PALETTE.ink });
  if (options.pointing === "down") {
    mesh.rotation.z = Math.PI;
    mesh.position.y = 0.66;
  } else if (options.pointing === "right") {
    mesh.rotation.z = -Math.PI / 2;
    mesh.position.y = 0.32;
  } else if (options.pointing === "left") {
    mesh.rotation.z = Math.PI / 2;
    mesh.position.y = 0.32;
  }

  function update(localTime) {
    const t = Number.isFinite(localTime) ? localTime : 0;
    const s = applyPopWindow(group, t, { ...options, baseScale });
    if (s <= 0) return;
    pulseGroup.position.y = Math.sin(t * 3.2) * 0.04;
  }

  update((options.at ?? 0) + (options.popDur ?? 0.45));
  return { group, update, kind: "arrow" };
}

export function riverPath(options = {}) {
  const {
    points = [[-90.2, 38.6], [-91.1, 34.0], [-90.1, 29.95]],
    space = "lonlat",
    y = LAND_H + 0.022,
    at = 0,
    dur = 1.4,
    outAt = Infinity,
    outDur = 0.35,
    color = "#63D2D6",
    glowColor = "#B8F8F2",
    linewidth = 6,
  } = options;
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error("atlas3d props: riverPath needs at least 2 points");
  }

  const group = new THREE.Group();
  group.userData.atlasHero = "prop";
  group.userData.propKind = "riverPath";
  const baseScale = options.scale ?? 1;
  group.rotation.y = options.rotationY ?? 0;

  const worldPts = points.map(p => (
    space === "world"
      ? new THREE.Vector3(p[0], p[1] ?? y, p[2] ?? 0)
      : lonLatToWorld(p[0], p[1], y)
  ));
  const curve = new THREE.CatmullRomCurve3(worldPts);
  const steps = 48;
  const flat = [];
  for (let i = 0; i <= steps; i++) {
    const pt = curve.getPoint(i / steps);
    flat.push(pt.x, pt.y, pt.z);
  }

  // Soft outer glow halo + bright core stream.
  const glowGeom = new LineGeometry();
  glowGeom.setPositions(flat);
  glowGeom.computeBoundingBox();
  const glowLine = new Line2(glowGeom, lineMaterial({
    color: glowColor,
    linewidth: linewidth * 2.3,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  }));
  glowLine.renderOrder = 6;

  const coreGeom = new LineGeometry();
  coreGeom.setPositions(flat);
  coreGeom.computeBoundingBox();
  const coreLine = new Line2(coreGeom, lineMaterial({
    color,
    linewidth,
    transparent: true,
    opacity: 0.96,
  }));
  coreLine.renderOrder = 7;

  // Lightweight invisible proxy along curve ensures Box3().setFromObject works reliably across Three versions.
  const boundsMesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 16, 0.04, 6, false),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  group.add(glowLine, coreLine, boundsMesh);

  function update(localTime) {
    const t = Number.isFinite(localTime) ? localTime : 0;
    if (t < at || t >= outAt) {
      group.visible = false;
      return;
    }
    const drawP = ease(progress(t, at, dur), "inOut");
    const count = Math.round(steps * drawP);
    if (count <= 0) {
      group.visible = false;
      return;
    }
    const fadeOut = outAt < Infinity ? 1 - ease(progress(t, outAt - outDur, outDur), "in") : 1;
    if (fadeOut <= 0.01) {
      group.visible = false;
      return;
    }
    group.visible = true;
    group.scale.setScalar(baseScale);
    glowGeom.instanceCount = count;
    coreGeom.instanceCount = count;
    glowLine.material.opacity = (0.38 + 0.14 * Math.sin(t * 3.0)) * fadeOut;
    coreLine.material.opacity = 0.96 * fadeOut;
  }

  update(at + dur);
  return { group, update, kind: "riverPath" };
}

const FACTORIES = {
  sailingShip,
  cargoCrate,
  moneyBag,
  priceTag,
  arrow,
  riverPath,
};

export function createProp(kind, options = {}) {
  const fn = FACTORIES[kind];
  if (!fn) {
    throw new Error("atlas3d props: unknown prop " + JSON.stringify(kind) + " (expected one of " + PROP_KINDS.join(", ") + ")");
  }
  return fn(options);
}
