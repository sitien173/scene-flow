// Instanced particle effects (rain, swarm, fleet) with closed-form per-instance placement from index, seed, and t.
import * as THREE from "three";
import { rand } from "./motion.js";

const mod1 = x => ((x % 1) + 1) % 1;
const wrapSpan = (v, span) => ((((v + span * 0.5) % span) + span) % span) - span * 0.5;

// Falling rain streaks: one InstancedMesh with closed-form vertical loop and slant.
export function rain({
  count = 420,
  area = [26, 26],
  height = 18,
  yMin = 0,
  speed = 18,
  slant = 0.12,
  length = 0.65,
  radius = 0.018,
  color = "#CFE8FA",
  opacity = 0.65,
  center = [0, 0, 0],
  seed = 11,
} = {}) {
  const r = rand(seed);
  const seeds = Array.from({ length: count }, () => [
    (r() - 0.5) * area[0],
    (r() - 0.5) * area[1],
    r(),
    0.85 + r() * 0.3,
  ]);
  const geom = new THREE.CylinderGeometry(radius, radius, length, 4, 1);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geom, mat, count);
  mesh.renderOrder = 10;
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan(slant));

  function update(t) {
    for (let i = 0; i < count; i++) {
      const [x0, z0, phase, mul] = seeds[i];
      const frac = mod1((t * speed * mul) / height + phase);
      const y = yMin + (1 - frac) * height;
      const x = center[0] + x0 + frac * height * slant;
      const z = center[2] + z0;
      p.set(x, y, z);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { object: mesh, update };
}

// Swirling insect or bird swarm around an origin using closed-form harmonics.
export function swarm({
  count = 120,
  origin = [0, 2.2, 0],
  radius = [3.6, 1.3, 3.6],
  speed = 1.6,
  size = 0.055,
  color = "#242830",
  seed = 23,
} = {}) {
  const r = rand(seed);
  const seeds = Array.from({ length: count }, () => [
    0.7 + r() * 0.8,
    0.8 + r() * 0.9,
    0.7 + r() * 0.8,
    r() * Math.PI * 2,
    r() * Math.PI * 2,
    r() * Math.PI * 2,
    (0.35 + 0.65 * r()) * radius[0],
    (0.35 + 0.65 * r()) * radius[1],
    (0.35 + 0.65 * r()) * radius[2],
    0.7 + r() * 0.6,
  ]);
  const geom = new THREE.OctahedronGeometry(size, 0);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true });
  const mesh = new THREE.InstancedMesh(geom, mat, count);
  mesh.castShadow = true;
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const e = new THREE.Euler();

  function update(t) {
    for (let i = 0; i < count; i++) {
      const [fx, fy, fz, px, py, pz, rx, ry, rz, sc] = seeds[i];
      const u = t * speed;
      const x = origin[0] + Math.sin(u * fx + px) * rx + Math.cos(u * 0.7 + pz) * rx * 0.35;
      const y = origin[1] + Math.sin(u * fy + py) * ry;
      const z = origin[2] + Math.cos(u * fz + pz) * rz + Math.sin(u * 0.6 + px) * rz * 0.35;
      const vx = Math.cos(u * fx + px) * fx * rx;
      const vz = -Math.sin(u * fz + pz) * fz * rz;
      p.set(x, y, z);
      e.set(Math.sin(u * 6 + px) * 0.25, Math.atan2(vx, vz), 0);
      q.setFromEuler(e);
      s.setScalar(sc);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { object: mesh, update };
}

// Fleet of ships gliding across an ocean/water surface; reads heightAt(x, z, t) if provided.
// geometry is one ship facing +Z with its waterline at y = 0; vertex colors are used when it has them.
export function fleet({
  geometry,
  color = "#E8E2D4",
  count = 12,
  area = [48, 56],
  direction = [0.22, 1.0],
  speed = 1.1,
  scale = [0.75, 1.25],
  heightAt = null,
  waterLevel = 0,
  seed = 37,
} = {}) {
  if (!geometry) throw new Error("terra3d: fleet needs a geometry, such as skiff(kit).geometry");
  const len = Math.hypot(direction[0], direction[1]) || 1;
  const dx = direction[0] / len;
  const dz = direction[1] / len;
  const px = -dz;
  const pz = dx;
  const yaw = Math.atan2(dx, dz);

  const r = rand(seed);
  const seeds = Array.from({ length: count }, () => [
    (r() - 0.5) * area[0],
    (r() - 0.5) * area[1],
    scale[0] + r() * (scale[1] - scale[0]),
    r() * Math.PI * 2,
    0.8 + r() * 0.4,
  ]);
  const mat = new THREE.MeshStandardMaterial({
    color: geometry.hasAttribute("color") ? "#FFFFFF" : color,
    vertexColors: geometry.hasAttribute("color"),
    roughness: 0.8,
    metalness: 0.05,
    flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, mat, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const e = new THREE.Euler(0, 0, 0, "YXZ");

  function update(t) {
    const span = area[1];
    for (let i = 0; i < count; i++) {
      const [lateral, along0, sc, phase, mul] = seeds[i];
      const along = wrapSpan(along0 + t * speed * mul, span);
      const x = lateral * px + along * dx;
      const z = lateral * pz + along * dz;
      const y = heightAt ? heightAt(x, z, t) : waterLevel;
      let pitch = Math.sin(t * 1.4 + phase) * 0.04;
      let roll = Math.cos(t * 1.1 + phase) * 0.05;
      if (heightAt) {
        const d = 0.6;
        const hFwd = heightAt(x + dx * d, z + dz * d, t);
        const hBack = heightAt(x - dx * d, z - dz * d, t);
        const hRight = heightAt(x + px * d, z + pz * d, t);
        const hLeft = heightAt(x - px * d, z - pz * d, t);
        pitch = -Math.atan2(hFwd - hBack, d * 2) * 0.65;
        roll = Math.atan2(hRight - hLeft, d * 2) * 0.65;
      }
      p.set(x, y - 0.04, z);
      e.set(pitch, yaw, roll);
      q.setFromEuler(e);
      s.setScalar(sc);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { object: mesh, update };
}
