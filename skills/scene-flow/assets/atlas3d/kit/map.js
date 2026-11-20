// Shared atlas3d map: sea, seeded parchment land, Natural Earth relief, raised regions, stencil-clipped polygons, Line2 outlines, DOM labels, routes, and camera views.
import * as THREE from "three";
import * as WORLD from "atlas3d/map";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { PALETTE, regionColor, toonMaterial, parchmentTexture, lineMaterial, outlineSegments } from "./look.js";
import { clamp01, ease, lerp, progress } from "./motion.js";

export const DEG_SCALE = 0.5;
export const LAND_H = 0.08;
export const FILL_H = 0.05;
const WIDTH = 1080;
const HEIGHT = 1920;
const EDGE = 24;

export function lonLatToWorld(lon, lat, y = LAND_H) {
  return new THREE.Vector3(lon * DEG_SCALE, y, -lat * DEG_SCALE);
}

// Returns a camera pose looking down at (lon, lat) with a gentle southward framing bias so the subject sits above captions.
export function view(lon, lat, zoom = 1, tilt = 20, { fov = 35, yaw = 0, yOffset = 0 } = {}) {
  const d = 18 / Math.max(zoom, 0.05);
  const focus = lonLatToWorld(lon, lat, LAND_H + yOffset);
  const target = focus.clone();
  target.z += d * 0.045;
  const tiltRad = THREE.MathUtils.degToRad(tilt);
  const yawRad = THREE.MathUtils.degToRad(yaw);
  const dy = d * Math.cos(tiltRad);
  const horiz = d * Math.sin(tiltRad);
  const position = new THREE.Vector3(
    target.x + horiz * Math.sin(yawRad),
    target.y + dy,
    target.z + horiz * Math.cos(yawRad),
  );
  const mat = new THREE.Matrix4().lookAt(position, target, new THREE.Vector3(0, 1, 0));
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(mat);
  return { position, quaternion, target, focus, fov, lon, lat, zoom, tilt };
}

export function applyView(camera, pose) {
  camera.position.copy(pose.position);
  camera.quaternion.copy(pose.quaternion);
  if (pose.fov && camera.fov !== pose.fov) {
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }
}

export function move(camera, t, from, to, dur = 2, { start = 0, curve = "inOut" } = {}) {
  const e = ease(progress(t, start, dur), curve);
  camera.position.lerpVectors(from.position, to.position, e);
  camera.quaternion.slerpQuaternions(from.quaternion, to.quaternion, e);
  const fovFrom = from.fov ?? camera.fov;
  const fovTo = to.fov ?? camera.fov;
  const targetFov = lerp(fovFrom, fovTo, e);
  if (targetFov !== camera.fov) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }
}

function decodeArcs() {
  const { scale, translate } = WORLD.transform;
  return WORLD.arcs.map(arc => {
    const pts = new Array(arc.length);
    let qx = 0, qy = 0;
    for (let i = 0; i < arc.length; i++) {
      qx += arc[i][0];
      qy += arc[i][1];
      pts[i] = [qx * scale[0] + translate[0], qy * scale[1] + translate[1]];
    }
    return pts;
  });
}

function decodeRing(ringRefs, decodedArcs) {
  const pts = [];
  for (const ref of ringRefs) {
    const rev = ref < 0;
    const arc = decodedArcs[rev ? ~ref : ref];
    const start = rev ? arc.length - 1 : 0;
    const end = rev ? -1 : arc.length;
    const step = rev ? -1 : 1;
    for (let i = start; i !== end; i += step) {
      const p = arc[i];
      if (!pts.length || pts[pts.length - 1][0] !== p[0] || pts[pts.length - 1][1] !== p[1]) {
        pts.push(p);
      }
    }
  }
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
    pts.pop();
  }
  return pts;
}

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygons(lon, lat, polygons) {
  for (const poly of polygons) {
    if (!pointInRing(lon, lat, poly[0])) continue;
    let inHole = false;
    for (let h = 1; h < poly.length; h++) {
      if (pointInRing(lon, lat, poly[h])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

function buildSlabGeometry(polygonsLonLat, height, { uvsMode = "world", withSkirt = true } = {}) {
  const topPos = [];
  const topNorm = [];
  const topUv = [];
  const topIdx = [];
  const skirtPos = [];
  const skirtNorm = [];
  const skirtIdx = [];
  let topVertexBase = 0;
  let skirtVertexBase = 0;
  let bestTriArea = -1;
  let bestCenter = null;

  for (const poly of polygonsLonLat) {
    if (!poly.length || poly[0].length < 3) continue;
    let outer = poly[0];
    let outer2D = outer.map(([lon, lat]) => new THREE.Vector2(lon * DEG_SCALE, lat * DEG_SCALE));
    if (THREE.ShapeUtils.isClockWise(outer2D)) {
      outer = [...outer].reverse();
      outer2D = [...outer2D].reverse();
    }
    const holes = [];
    const holes2D = [];
    for (let h = 1; h < poly.length; h++) {
      if (poly[h].length < 3) continue;
      let hole = poly[h];
      let hole2D = hole.map(([lon, lat]) => new THREE.Vector2(lon * DEG_SCALE, lat * DEG_SCALE));
      if (!THREE.ShapeUtils.isClockWise(hole2D)) {
        hole = [...hole].reverse();
        hole2D = [...hole2D].reverse();
      }
      holes.push(hole);
      holes2D.push(hole2D);
    }

    const faces = THREE.ShapeUtils.triangulateShape(outer2D, holes2D);
    if (!faces.length) continue;

    const allPts = [...outer];
    for (const hole of holes) allPts.push(...hole);

    for (const [lon, lat] of allPts) {
      topPos.push(lon * DEG_SCALE, height, -lat * DEG_SCALE);
      topNorm.push(0, 1, 0);
      if (uvsMode === "equirect") {
        topUv.push((lon + 180) / 360, (lat + 90) / 180);
      } else {
        topUv.push(lon * 0.14, lat * 0.14);
      }
    }

    for (const [a, b, c] of faces) {
      topIdx.push(topVertexBase + a, topVertexBase + b, topVertexBase + c);
      const pa = allPts[a], pb = allPts[b], pc = allPts[c];
      const area = Math.abs((pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1])) * 0.5;
      if (area > bestTriArea) {
        bestTriArea = area;
        bestCenter = [(pa[0] + pb[0] + pc[0]) / 3, (pa[1] + pb[1] + pc[1]) / 3];
      }
    }
    topVertexBase += allPts.length;

    if (withSkirt) {
      const rings = [outer, ...holes];
      for (const ring of rings) {
        const n = ring.length;
        for (let i = 0; i < n; i++) {
          const [lon0, lat0] = ring[i];
          const [lon1, lat1] = ring[(i + 1) % n];
          const x0 = lon0 * DEG_SCALE, z0 = -lat0 * DEG_SCALE;
          const x1 = lon1 * DEG_SCALE, z1 = -lat1 * DEG_SCALE;
          const dx = x1 - x0, dz = z1 - z0;
          const len = Math.hypot(dx, dz) || 1;
          const nx = -dz / len, nz = dx / len;
          skirtPos.push(
            x0, 0, z0,
            x1, 0, z1,
            x1, height, z1,
            x0, height, z0,
          );
          for (let k = 0; k < 4; k++) skirtNorm.push(nx, 0, nz);
          skirtIdx.push(
            skirtVertexBase, skirtVertexBase + 1, skirtVertexBase + 2,
            skirtVertexBase, skirtVertexBase + 2, skirtVertexBase + 3,
          );
          skirtVertexBase += 4;
        }
      }
    }
  }

  const topGeometry = new THREE.BufferGeometry();
  topGeometry.setAttribute("position", new THREE.Float32BufferAttribute(topPos, 3));
  topGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(topNorm, 3));
  topGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(topUv, 2));
  topGeometry.setIndex(topIdx);
  topGeometry.computeBoundingSphere();

  let skirtGeometry = null;
  if (withSkirt && skirtPos.length) {
    skirtGeometry = new THREE.BufferGeometry();
    skirtGeometry.setAttribute("position", new THREE.Float32BufferAttribute(skirtPos, 3));
    skirtGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(skirtNorm, 3));
    skirtGeometry.setIndex(skirtIdx);
    skirtGeometry.computeBoundingSphere();
  }

  return { topGeometry, skirtGeometry, center: bestCenter };
}

function arcSegments(arcIndices, decodedArcs, y) {
  const segs = [];
  for (const idx of arcIndices) {
    const arc = decodedArcs[idx];
    for (let i = 0; i + 1 < arc.length; i++) {
      const [lon0, lat0] = arc[i];
      const [lon1, lat1] = arc[i + 1];
      segs.push(lon0 * DEG_SCALE, y, -lat0 * DEG_SCALE, lon1 * DEG_SCALE, y, -lat1 * DEG_SCALE);
    }
  }
  return segs;
}

function loopSegments(ring, y) {
  const segs = [];
  for (let i = 0; i < ring.length; i++) {
    const [lon0, lat0] = ring[i];
    const [lon1, lat1] = ring[(i + 1) % ring.length];
    segs.push(lon0 * DEG_SCALE, y, -lat0 * DEG_SCALE, lon1 * DEG_SCALE, y, -lat1 * DEG_SCALE);
  }
  return segs;
}

function intersects(a, b, pad = 10) {
  return a.left < b.right + pad && a.right > b.left - pad &&
    a.top < b.bottom + pad && a.bottom > b.top - pad;
}

const LABEL_OFFSETS = [
  [0, 0], [0, -48], [0, 48], [72, 0], [-72, 0], [0, -96], [0, 96],
  [112, -56], [-112, -56], [112, 56], [-112, 56], [0, -152], [0, 152],
  [168, 0], [-168, 0], [0, -220], [0, 220],
];

export function createMap({ regions = [], overlay, seed = 101 } = {}) {
  const decodedArcs = decodeArcs();
  const group = new THREE.Group();
  group.name = "atlas3d-shared-map";

  // Sea base plane.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 140),
    toonMaterial(PALETTE.sea),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0;
  sea.renderOrder = 0;
  group.add(sea);

  // Decode all country polygons once for base land and interior lookups.
  const countryPolygons = {};
  const countrySamples = [];
  const allLandPolygons = [];
  for (const [code, country] of Object.entries(WORLD.countries)) {
    const polys = country.polygons.map(poly => poly.map(ring => decodeRing(ring, decodedArcs)));
    countryPolygons[code] = polys;
    for (const p of polys) allLandPolygons.push(p);
  }

  const land = buildSlabGeometry(allLandPolygons, LAND_H, { uvsMode: "world", withSkirt: true });
  const parchment = parchmentTexture(seed, 512);
  const landTopMat = toonMaterial("#F7EFE0", {
    map: parchment,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilZPass: THREE.ReplaceStencilOp,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
  });
  const landTop = new THREE.Mesh(land.topGeometry, landTopMat);
  landTop.renderOrder = 1;
  group.add(landTop);

  if (land.skirtGeometry) {
    const landSkirt = new THREE.Mesh(land.skirtGeometry, toonMaterial(PALETTE.landEdge));
    landSkirt.renderOrder = 1;
    group.add(landSkirt);
  }

  // Equirectangular UVs on a second top mesh for Natural Earth shaded relief.
  const reliefGeom = land.topGeometry.clone();
  const posAttr = reliefGeom.attributes.position;
  const reliefUv = new Float32Array(posAttr.count * 2);
  for (let i = 0; i < posAttr.count; i++) {
    const lon = posAttr.getX(i) / DEG_SCALE;
    const lat = -posAttr.getZ(i) / DEG_SCALE;
    reliefUv[i * 2] = (lon + 180) / 360;
    reliefUv[i * 2 + 1] = (lat + 90) / 180;
  }
  reliefGeom.setAttribute("uv", new THREE.BufferAttribute(reliefUv, 2));
  const reliefMat = new THREE.MeshBasicMaterial({
    color: "#FFFFFF",
    blending: THREE.MultiplyBlending,
    transparent: true,
    opacity: 0.45,
    premultipliedAlpha: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const reliefMesh = new THREE.Mesh(reliefGeom, reliefMat);
  reliefMesh.renderOrder = 2;
  reliefMesh.visible = false;
  group.add(reliefMesh);

  // Load Natural Earth shaded relief texture via ImageLoader.
  const ready = new THREE.TextureLoader().loadAsync("./assets/atlas3d/map/relief.webp").then(tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    reliefMat.map = tex;
    reliefMat.needsUpdate = true;
    reliefMesh.visible = true;
  });

  // Base world borders and coastlines: every shared arc drawn once.
  const allArcIndices = decodedArcs.map((_, i) => i);
  const baseOutline = outlineSegments(arcSegments(allArcIndices, decodedArcs, LAND_H + 0.004), {
    color: "#43392E",
    linewidth: 1.8,
  });
  baseOutline.renderOrder = 3;
  group.add(baseOutline);

  // Precompute one guaranteed interior land point per country for unfilled land probing.
  for (const [code, polys] of Object.entries(countryPolygons)) {
    const largest = polys.reduce((best, p) => {
      if (!best) return p;
      return p[0].length > best[0].length ? p : best;
    }, null);
    if (!largest) continue;
    const slab = buildSlabGeometry([largest], 0, { withSkirt: false });
    if (slab.center) countrySamples.push({ code, lon: slab.center[0], lat: slab.center[1] });
    slab.topGeometry.dispose();
  }

  // Build declared regions.
  const regionMap = new Map();
  for (const r of regions) {
    if (r.countries) {
      const polys = [];
      const arcCounts = new Map();
      for (const code of r.countries) {
        for (const p of countryPolygons[code] || []) polys.push(p);
        for (const poly of WORLD.countries[code]?.polygons || []) {
          for (const ring of poly) {
            for (const ref of ring) {
              const a = ref < 0 ? ~ref : ref;
              arcCounts.set(a, (arcCounts.get(a) || 0) + 1);
            }
          }
        }
      }
      const slab = buildSlabGeometry(polys, FILL_H, { uvsMode: "world", withSkirt: true });
      const mat = toonMaterial(PALETTE.blue);
      const fillGroup = new THREE.Group();
      fillGroup.position.y = LAND_H;
      const topMesh = new THREE.Mesh(slab.topGeometry, mat);
      topMesh.renderOrder = 5;
      fillGroup.add(topMesh);
      if (slab.skirtGeometry) {
        const skirtMat = toonMaterial(PALETTE.ink);
        const skirtMesh = new THREE.Mesh(slab.skirtGeometry, skirtMat);
        skirtMesh.renderOrder = 5;
        fillGroup.add(skirtMesh);
      }
      fillGroup.visible = false;
      group.add(fillGroup);

      // Merged outer boundary: only arcs used by exactly one member country ring.
      const outerArcs = [];
      for (const [a, count] of arcCounts.entries()) {
        if (count === 1) outerArcs.push(a);
      }
      const outline = outlineSegments(arcSegments(outerArcs, decodedArcs, 0), {
        color: PALETTE.ink,
        linewidth: 4,
      });
      outline.position.y = LAND_H + FILL_H + 0.004;
      outline.renderOrder = 6;
      outline.visible = false;
      group.add(outline);

      regionMap.set(r.id, {
        id: r.id,
        kind: "countries",
        countries: new Set(r.countries),
        polygons: polys,
        center: slab.center || [0, 0],
        fillGroup,
        mat,
        outline,
        activeState: null,
      });
    } else if (r.polygon) {
      const poly = [r.polygon];
      const slab = buildSlabGeometry([poly], 0, { uvsMode: "world", withSkirt: false });
      const mat = toonMaterial(PALETTE.orange, {
        transparent: true,
        opacity: 1,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.EqualStencilFunc,
        stencilFail: THREE.KeepStencilOp,
        stencilZFail: THREE.KeepStencilOp,
        stencilZPass: THREE.KeepStencilOp,
      });
      const fillGroup = new THREE.Group();
      fillGroup.position.y = LAND_H + 0.005;
      const topMesh = new THREE.Mesh(slab.topGeometry, mat);
      topMesh.renderOrder = 4;
      fillGroup.add(topMesh);
      fillGroup.visible = false;
      group.add(fillGroup);

      const outline = outlineSegments(loopSegments(r.polygon, 0), {
        color: PALETTE.ink,
        linewidth: 4,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.EqualStencilFunc,
        stencilFail: THREE.KeepStencilOp,
        stencilZFail: THREE.KeepStencilOp,
        stencilZPass: THREE.KeepStencilOp,
      });
      outline.position.y = LAND_H + 0.007;
      outline.renderOrder = 6;
      outline.visible = false;
      group.add(outline);

      // Pick an interior point of the polygon that lies on land so stencil clipping does not discard probe points.
      let center = slab.center || r.polygon[0];
      const pos = slab.topGeometry.attributes.position;
      const idx = slab.topGeometry.index;
      if (idx) {
        let bestArea = -1;
        for (let i = 0; i < idx.count; i += 3) {
          const ia = idx.getX(i), ib = idx.getX(i + 1), ic = idx.getX(i + 2);
          const lon = (pos.getX(ia) + pos.getX(ib) + pos.getX(ic)) / 3 / DEG_SCALE;
          const lat = -(pos.getZ(ia) + pos.getZ(ib) + pos.getZ(ic)) / 3 / DEG_SCALE;
          const onLand = Object.values(countryPolygons).some(ps => pointInPolygons(lon, lat, ps));
          if (!onLand) continue;
          const ax = pos.getX(ia), az = pos.getZ(ia);
          const bx = pos.getX(ib), bz = pos.getZ(ib);
          const cx = pos.getX(ic), cz = pos.getZ(ic);
          const area = Math.abs((bx - ax) * (cz - az) - (cx - ax) * (bz - az));
          if (area > bestArea) {
            bestArea = area;
            center = [lon, lat];
          }
        }
      }

      regionMap.set(r.id, {
        id: r.id,
        kind: "polygon",
        countries: new Set(),
        polygons: [poly],
        center,
        fillGroup,
        mat,
        outline,
        activeState: null,
      });
    }
  }

  // DOM label container.
  const labelsRoot = document.createElement("div");
  labelsRoot.id = "atlas3d-labels";
  if (overlay) overlay.append(labelsRoot);

  const fillEvents = [];
  const labelEvents = [];
  const routeEvents = [];

  function resolvePoint(target) {
    if (typeof target === "string") {
      const reg = regionMap.get(target);
      if (!reg) throw new Error("atlas3d map: unknown region " + JSON.stringify(target));
      return reg.center;
    }
    if (Array.isArray(target) && target.length >= 2) return target;
    throw new Error("atlas3d map: invalid label target");
  }

  function fill(regionId, { at = 0, dur = 0.4, until = Infinity, color = "blue" } = {}) {
    if (!regionMap.has(regionId)) throw new Error("atlas3d map: unknown region " + JSON.stringify(regionId));
    fillEvents.push({ regionId, at, dur, until, color: regionColor(color) });
  }

  function label(target, text, { at = 0, dur = 0.35, until = Infinity, offset = [0, 0], className = "" } = {}) {
    const [lon, lat] = resolvePoint(target);
    const el = document.createElement("div");
    el.className = className ? "atlas-label " + className : "atlas-label";
    el.textContent = text;
    el.style.visibility = "hidden";
    el.style.opacity = "0";
    labelsRoot.append(el);
    labelEvents.push({ lon, lat, text, at, dur, until, offset, el });
    return el;
  }

  function route(points, { at = 0, dur = 1.0, until = Infinity, color = PALETTE.route, linewidth = 5, arc = 0.35 } = {}) {
    if (!Array.isArray(points) || points.length < 2) {
      throw new Error("atlas3d map: route needs at least 2 [lon, lat] points");
    }
    const basePts = points.map(([lon, lat]) => lonLatToWorld(lon, lat, LAND_H + FILL_H + 0.025));
    const curve = new THREE.CatmullRomCurve3(basePts);
    const steps = 48;
    const flat = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const p = curve.getPoint(u);
      p.y += Math.sin(Math.PI * u) * arc;
      flat.push(p.x, p.y, p.z);
    }
    const glowGeom = new LineGeometry();
    glowGeom.setPositions(flat);
    const glowLine = new Line2(glowGeom, lineMaterial({
      color: PALETTE.routeGlow,
      linewidth: linewidth * 2.2,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }));
    glowLine.renderOrder = 7;
    glowLine.visible = false;

    const mainGeom = new LineGeometry();
    mainGeom.setPositions(flat);
    const mainLine = new Line2(mainGeom, lineMaterial({ color, linewidth }));
    mainLine.renderOrder = 8;
    mainLine.visible = false;

    group.add(glowLine, mainLine);
    routeEvents.push({
      at, dur, until, steps,
      glowGeom, glowLine,
      mainGeom, mainLine,
    });
  }

  function update(T, camera) {
    // 1. Reset and apply fills strictly from absolute time T.
    for (const reg of regionMap.values()) {
      reg.fillGroup.visible = false;
      reg.outline.visible = false;
      reg.activeState = null;
    }
    for (const ev of fillEvents) {
      if (T < ev.at || T >= ev.until) continue;
      const reg = regionMap.get(ev.regionId);
      const p = ease(progress(T, ev.at, ev.dur), "out");
      if (p <= 0.001) continue;
      reg.mat.color.set(ev.color);
      reg.fillGroup.visible = true;
      reg.outline.visible = true;
      if (reg.kind === "countries") {
        reg.fillGroup.scale.y = p;
        reg.outline.position.y = LAND_H + FILL_H * p + 0.004;
      } else {
        reg.mat.opacity = p;
      }
      reg.activeState = { id: reg.id, color: ev.color, progress: p };
    }

    // 2. Apply routes strictly from absolute time T.
    for (const ev of routeEvents) {
      if (T < ev.at || T >= ev.until) {
        ev.glowLine.visible = false;
        ev.mainLine.visible = false;
        continue;
      }
      const p = ease(progress(T, ev.at, ev.dur), "inOut");
      const count = Math.round(ev.steps * p);
      if (count <= 0) {
        ev.glowLine.visible = false;
        ev.mainLine.visible = false;
        continue;
      }
      ev.glowGeom.instanceCount = count;
      ev.mainGeom.instanceCount = count;
      ev.glowLine.visible = true;
      ev.mainLine.visible = true;
    }

    // 3. Orient figures and upright diorama props toward the active map camera as a pure function of camera pose.
    if (camera) camera.updateMatrixWorld(true);
    if (camera && group.parent) {
      const stack = [...group.parent.children];
      while (stack.length) {
        const obj = stack.pop();
        if (obj === group) continue;
        if (obj.userData && typeof obj.userData.atlasOrient === "function") {
          obj.userData.atlasOrient(camera);
        }
        if (obj.children && obj.children.length) {
          for (let i = 0; i < obj.children.length; i++) stack.push(obj.children[i]);
        }
      }
    }

    // 4. Project DOM labels from 3D coordinates and keep them clear of captions, watermarks, and edges.
    if (!camera) return;
    const masks = ["#kara .kc", "#watermark-top", "#watermark-bottom"]
      .flatMap(sel => [...document.querySelectorAll(sel)])
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 0 && r.height > 0);
    const placed = [];

    for (const ev of labelEvents) {
      if (T < ev.at || T >= ev.until) {
        ev.el.style.visibility = "hidden";
        ev.el.style.opacity = "0";
        continue;
      }
      const p = ease(progress(T, ev.at, ev.dur), "out");
      if (p <= 0.02) {
        ev.el.style.visibility = "hidden";
        ev.el.style.opacity = "0";
        continue;
      }
      const worldPt = lonLatToWorld(ev.lon, ev.lat, LAND_H + FILL_H + 0.06);
      const ndc = worldPt.clone().project(camera);
      const sx = (ndc.x * 0.5 + 0.5) * WIDTH;
      const sy = (-ndc.y * 0.5 + 0.5) * HEIGHT;
      if (ndc.z > 1 || sx < -60 || sx > WIDTH + 60 || sy < -60 || sy > HEIGHT + 60) {
        ev.el.style.visibility = "hidden";
        ev.el.style.opacity = "0";
        continue;
      }

      ev.el.style.visibility = "visible";
      ev.el.style.opacity = String(p);
      ev.el.style.transform = `scale(${lerp(0.86, 1, p).toFixed(3)})`;
      const w = ev.el.offsetWidth || 120;
      const h = ev.el.offsetHeight || 44;

      const fits = (cx, cy) => {
        const left = cx - w / 2;
        const top = cy - h / 2;
        const rect = { left, top, right: left + w, bottom: top + h };
        return left >= EDGE && top >= EDGE && rect.right <= WIDTH - EDGE && rect.bottom <= HEIGHT - EDGE &&
          !masks.some(m => intersects(rect, m, 8)) && !placed.some(m => intersects(rect, m, 8));
      };

      const bx = sx + ev.offset[0];
      const by = sy + ev.offset[1];
      let chosen = null;
      for (const [ox, oy] of LABEL_OFFSETS) {
        if (fits(bx + ox, by + oy)) {
          chosen = [bx + ox, by + oy];
          break;
        }
      }
      if (!chosen) {
        // Fallback: clamp near target vertically outside caption band.
        const cx = Math.max(EDGE + w / 2, Math.min(WIDTH - EDGE - w / 2, bx));
        for (const cy of [340, 520, 720, 920, 1120, 1540, 1700]) {
          if (fits(cx, cy)) {
            chosen = [cx, cy];
            break;
          }
        }
      }
      if (!chosen) {
        ev.el.style.visibility = "hidden";
        ev.el.style.opacity = "0";
        continue;
      }
      const left = chosen[0] - w / 2;
      const top = chosen[1] - h / 2;
      ev.el.style.left = left.toFixed(1) + "px";
      ev.el.style.top = top.toFixed(1) + "px";
      placed.push({ left, top, right: left + w, bottom: top + h });
    }
  }

  function setOverlayVisible(visible) {
    labelsRoot.style.display = visible ? "block" : "none";
  }

  function regionCenter(regionId) {
    const reg = regionMap.get(regionId);
    if (!reg) throw new Error("atlas3d map: unknown region " + JSON.stringify(regionId));
    return [...reg.center];
  }

  function probeAt(camera, T) {
    camera.updateMatrixWorld(true);
    const projectPt = (lon, lat, y = LAND_H + FILL_H) => {
      const ndc = lonLatToWorld(lon, lat, y).project(camera);
      return {
        x: (ndc.x * 0.5 + 0.5) * WIDTH,
        y: (-ndc.y * 0.5 + 0.5) * HEIGHT,
        z: ndc.z,
      };
    };
    const inSafeFrame = pt => pt.z <= 1 && pt.x >= 40 && pt.x <= WIDTH - 40 && pt.y >= 260 && pt.y <= 1280;

    const filled = [];
    const activeCountries = new Set();
    const activePolys = [];
    for (const reg of regionMap.values()) {
      if (!reg.activeState || reg.activeState.progress < 0.8) continue;
      for (const code of reg.countries) activeCountries.add(code);
      if (reg.kind === "polygon") activePolys.push(...reg.polygons);
      const y = reg.kind === "countries" ? LAND_H + FILL_H : LAND_H + 0.005;
      const pt = projectPt(reg.center[0], reg.center[1], y);
      if (inSafeFrame(pt)) filled.push({ id: reg.id, x: Math.round(pt.x), y: Math.round(pt.y) });
    }

    let unfilled = null;
    for (const sample of countrySamples) {
      if (activeCountries.has(sample.code)) continue;
      if (pointInPolygons(sample.lon, sample.lat, activePolys)) continue;
      const pt = projectPt(sample.lon, sample.lat, LAND_H);
      if (inSafeFrame(pt)) {
        unfilled = { x: Math.round(pt.x), y: Math.round(pt.y) };
        break;
      }
    }
    return { filled, unfilled };
  }

  return {
    group,
    ready,
    fill,
    label,
    route,
    update,
    setOverlayVisible,
    regionCenter,
    probeAt,
    lonLatToWorld,
  };
}
