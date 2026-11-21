// Effects for toon3d: rain streaks, expanding ripples on a surface, and a sun with rays. Each one is a pure function of the time it is given.
import * as THREE from "three";
import { PALETTE, toon, ink } from "./look.js";
import { rand, clamp01 } from "./motion.js";

// Rain: thin streaks that fall and wrap inside a box. Each streak is a flat quad turned about the vertical axis to face the
// camera, so it keeps a vertical stroke at its real width (WebGL lines are always 1 px). Positions come from t and the camera.
export function rain({ count = 90, box = [-6, 2.8, -10, 6, 12, -2], seed = 7, speed = 9, slant = 0.1, len = 0.7, width = 0.035,
  start = 0, fade = 0.6, color = PALETTE.white } = {}) {
  const rnd = rand(seed);
  const [x0, y0, z0, x1, y1, z1] = box;
  const H = y1 - y0;
  const seeds = Array.from({ length: count }, () => [x0 + rnd() * (x1 - x0), y0 + rnd() * H, z0 + rnd() * (z1 - z0)]);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const object = new THREE.InstancedMesh(new THREE.PlaneGeometry(width, len), mat, count);
  object.frustumCulled = false;
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan(slant));
  const yaw = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  function update(t, camera) {
    const local = t - start;
    // Hidden before the start, so a matrix left over from a later seek can never draw: frames stay a pure function of t.
    object.visible = local > 0;
    mat.opacity = local <= 0 ? 0 : 0.85 * clamp01(local / fade);
    if (local <= 0 || !camera) return;
    for (let i = 0; i < count; i++) {
      const [sx, sy, sz] = seeds[i];
      const y = y0 + ((((sy - y0 - speed * local) % H) + H) % H);
      euler.y = Math.atan2(camera.position.x - sx, camera.position.z - sz);
      yaw.setFromEuler(euler).multiply(tilt);
      p.set(sx, y, sz);
      object.setMatrixAt(i, m.compose(p, yaw, one));
    }
    object.instanceMatrix.needsUpdate = true;
  }
  return { object, update };
}

// Ripple pools: flat pale-blue ellipses that grow on a surface at height y, one pool every period / count seconds. Each pool
// throws `debris` brown chips that hop on a parabola, one hop per period, as rain lands on a panel. Every pool is a pure function of t.
export function ripples({ center = [0, 0, 0], spread = [2, 0, 1.2], y = 0.05, count = 5, period = 1.4, radius = 1.0, aspect = 0.7,
  seed = 3, start = 0, color = "#8AACC8", chipColor = "#977553", debris = 10, chipSize = 0.035, hop = 0.22, opacity = 0.85 } = {}) {
  const rnd = rand(seed);
  const object = new THREE.Group();
  const geo = new THREE.CircleGeometry(1, 40);
  const chipGeo = new THREE.BoxGeometry(chipSize, chipSize, chipSize);
  const chipMat = new THREE.MeshBasicMaterial({ color: chipColor });
  const items = [];
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    group.position.set(center[0] + (rnd() * 2 - 1) * spread[0], center[1] + y, center[2] + (rnd() * 2 - 1) * spread[2]);
    object.add(group);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    const pool = new THREE.Mesh(geo, mat);
    pool.rotation.x = -Math.PI / 2;
    group.add(pool);
    const chips = [];
    for (let d = 0; d < debris; d++) {
      let ux, uz;
      do { ux = rnd() * 2 - 1; uz = rnd() * 2 - 1; } while (ux * ux + uz * uz > 0.8);
      const chip = new THREE.Mesh(chipGeo, chipMat);
      chip.position.set(ux * radius * 0.8, 0, uz * radius * aspect * 0.8);
      chip.visible = false;
      group.add(chip);
      chips.push({ chip, offset: rnd() });
    }
    items.push({ group, pool, mat, phase: i / count, chips });
  }
  function update(t) {
    const local = t - start;
    for (const it of items) {
      const x = local <= 0 ? 0 : (local / period + it.phase) % 1;
      const r = radius * (0.25 + 0.75 * Math.min(1, x / 0.6));
      it.pool.scale.set(r, r * aspect, 1);
      // Fade in while the pool spreads, fade out at the end of its period.
      const fadeOut = clamp01((x - 0.8) / 0.2);
      it.mat.opacity = local <= 0 ? 0 : opacity * clamp01(x / 0.12) * (1 - fadeOut);
      for (const c of it.chips) {
        const h = local <= 0 ? 0 : (local / period + c.offset) % 1;
        c.chip.visible = local > 0 && x > 0.3 && fadeOut < 1;
        c.chip.position.y = hop * 4 * h * (1 - h);
      }
    }
  }
  update(0);
  return { object, update };
}

// Striped cable: black and yellow bands along a tube, with bulbs that light one after another from `start`, `step`
// seconds apart. A bulb stays lit after it lights. Bulbs sit at equal arc lengths along the points.
export function cableLights({ points, bulbs = 6, radius = 0.035, start = 0, step = 0.2, stripes = 8, repeat = 12,
  lit = PALETTE.yellow, dark = "#E9E6DC", bulb = 0.09 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 4;
  const g = c.getContext("2d");
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? PALETTE.ink : PALETTE.yellow;
    g.fillRect(i * 256 / stripes, 0, 256 / stripes, 4);
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.repeat.set(repeat, 1);
  const object = new THREE.Group();
  object.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 8), toon("#FFFFFF", map)));
  const mats = [];
  for (let i = 0; i < bulbs; i++) {
    const p = curve.getPointAt(bulbs === 1 ? 0.5 : i / (bulbs - 1));
    const mat = toon(dark);
    const b = new THREE.Mesh(new THREE.SphereGeometry(bulb, 16, 12), mat);
    b.position.copy(p).add(new THREE.Vector3(0, 0.12, 0));
    object.add(b);
    mats.push(mat);
  }
  ink(object, 0.012);
  function update(t) {
    const local = t - start;
    for (let i = 0; i < bulbs; i++) mats[i].color.set(local >= i * step ? lit : dark);
  }
  update(0);
  return { object, update };
}

// Sun: a flat yellow disc with triangular rays, placed from the camera's own axes so it keeps its corner of the frame.
export function sun({ right = -7, up = 9, dist = 40, radius = 2.1, rays = 12, spin = 0.2, color = "#F7D33F" } = {}) {
  const object = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, depthWrite: false });
  object.add(new THREE.Mesh(new THREE.CircleGeometry(radius, 40), mat));
  const ray = new THREE.ConeGeometry(0.42, 1.5, 3);
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const m = new THREE.Mesh(ray, mat);
    m.position.set(Math.cos(a) * (radius + 0.85), Math.sin(a) * (radius + 0.85), 0);
    m.rotation.z = a - Math.PI / 2;
    object.add(m);
  }
  const fwd = new THREE.Vector3();
  const side = new THREE.Vector3();
  const top = new THREE.Vector3();
  const v = new THREE.Vector3();
  function update(t, camera) {
    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    side.set(1, 0, 0).applyQuaternion(camera.quaternion);
    top.set(0, 1, 0).applyQuaternion(camera.quaternion);
    v.copy(camera.position).addScaledVector(fwd, dist).addScaledVector(side, right).addScaledVector(top, up);
    object.position.copy(v);
    object.quaternion.copy(camera.quaternion);
    object.rotateZ(spin * t);
  }
  return { object, update };
}
