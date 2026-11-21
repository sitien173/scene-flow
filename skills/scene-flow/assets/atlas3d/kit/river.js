// riverPath: a glowing river line drawn along a CatmullRom curve over the atlas3d map.
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { lineMaterial } from "./look.js";
import { ease, progress } from "./motion.js";
import { LAND_H, lonLatToWorld } from "./map.js";

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
