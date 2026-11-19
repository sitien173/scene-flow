// The one-eyed blob character: drop, bean, bowl or rounded cube, with blink, bob, look, squash, hop, pop and pixel steam.
import * as THREE from "three";
import { PALETTE, neon, glow, halo } from "./look.js";
import { pixels, pop, progress, rand } from "./motion.js";

function lathe(profile, segments = 48) {
  const points = new THREE.SplineCurve(profile.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(48);
  points[0].x = 0;
  points[points.length - 1].x = 0;
  return new THREE.LatheGeometry(points, segments);
}

function roundedCube(size, radius) {
  const geometry = new THREE.BoxGeometry(size, size, size, 12, 12, 12);
  const inner = size / 2 - radius;
  const p = new THREE.Vector3();
  const core = new THREE.Vector3();
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    core.set(THREE.MathUtils.clamp(p.x, -inner, inner), THREE.MathUtils.clamp(p.y, -inner, inner), THREE.MathUtils.clamp(p.z, -inner, inner));
    p.sub(core).normalize().multiplyScalar(radius).add(core);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  geometry.translate(0, size / 2, 0);
  return geometry;
}

// Each shape: body geometry with its feet at y = 0, height h, eye height, and body radius at the eye.
const SHAPES = {
  drop: () => ({ geometry: lathe([[0, 0], [0.42, 0.05], [0.62, 0.35], [0.6, 0.75], [0.42, 1.12], [0.16, 1.42], [0, 1.55]]), h: 1.55, eyeY: 0.72, eyeR: 0.6 }),
  bean: () => ({ geometry: new THREE.CapsuleGeometry(0.48, 0.62, 10, 32).translate(0, 0.79, 0), h: 1.58, eyeY: 0.98, eyeR: 0.48 }),
  bowl: () => ({ geometry: lathe([[0, 0], [0.5, 0.02], [0.8, 0.18], [0.92, 0.48], [0.94, 0.78], [0.82, 0.92], [0, 0.88]]), h: 0.92, eyeY: 0.52, eyeR: 0.92 }),
  cube: () => ({ geometry: roundedCube(1.1, 0.24), h: 1.1, eyeY: 0.62, eyeR: 0.55 }),
};

export function blob({ shape = "drop", color = PALETTE.violet, eyeColor, size = 1, seed = 1, steam = true, ground = true } = {}) {
  const spec = (SHAPES[shape] || SHAPES.drop)();
  const r = rand(seed);
  const phase = r() * Math.PI * 2;
  const blinkEvery = 2.4 + r() * 1.8;
  const blinkPhase = r() * blinkEvery;

  const group = new THREE.Group();
  group.scale.setScalar(size);
  const rig = new THREE.Group();
  group.add(rig);
  const body = new THREE.Mesh(spec.geometry, neon(color, { bottom: 0, top: spec.h, rimGain: 1.9 }));
  rig.add(body);

  const e = Math.min(0.34, spec.eyeR * 0.62);
  const eye = new THREE.Group();
  eye.position.set(0, spec.eyeY, spec.eyeR - e * 0.18);
  const sclera = new THREE.Mesh(new THREE.SphereGeometry(e, 32, 20), glow("#FFFFFF", 1.05));
  sclera.scale.z = 0.55;
  const iris = new THREE.Group();
  iris.position.z = e * 0.56;
  const irisDisc = new THREE.Mesh(new THREE.CircleGeometry(e * 0.56, 32), glow(eyeColor || color, 1.25));
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(e * 0.3, 32), new THREE.MeshBasicMaterial({ color: PALETTE.night }));
  pupil.position.z = 0.002;
  const shine = new THREE.Mesh(new THREE.CircleGeometry(e * 0.1, 16), glow("#FFFFFF", 3));
  shine.position.set(e * 0.14, e * 0.16, 0.004);
  iris.add(irisDisc, pupil, shine);
  eye.add(sclera, iris);
  rig.add(eye);

  let pool = null;
  if (ground) {
    pool = halo(color, spec.eyeR * 2.2, 1.1);
    group.add(pool);
  }
  const steamFx = steam ? pixels({ color, count: 16, origin: [0, spec.h * 0.92, 0], spread: 0.28, height: 1.4, size: 0.06, speed: 0.4, seed: seed + 11 }) : null;
  if (steamFx) rig.add(steamFx.object);

  const top = new THREE.Vector3(0, spec.h, 0);

  // update(t, { popAt, hop, look: [x, y], bob, mood }) — hop is the start time of a jump; look is -1..1 in eye space.
  function update(t, { popAt, hop, look, bob = 1, squint = 0 } = {}) {
    const s = popAt === undefined ? 1 : Math.max(0.0001, pop(t, popAt, 0.6));
    let y = Math.sin(t * 2.2 + phase) * 0.045 * spec.h * bob;
    let sy = 1 + Math.sin(t * 4.4 + phase) * 0.03 * bob;
    if (hop !== undefined) {
      const x = progress(t, hop, 0.62);
      if (x > 0 && x < 1) {
        y += Math.sin(Math.PI * x) * spec.h * 0.55;
        sy *= 1 + 0.16 * Math.sin(Math.PI * 2 * x);
      }
    }
    rig.position.y = y;
    rig.scale.set(s / Math.sqrt(sy), s * sy, s / Math.sqrt(sy));
    if (pool) pool.scale.setScalar(s * (1 - Math.min(0.5, y / spec.h)));

    const cycle = (t + blinkPhase) % blinkEvery;
    const blink = cycle < 0.16 ? Math.sin(Math.PI * cycle / 0.16) : 0;
    eye.scale.y = Math.max(0.06, (1 - blink) * (1 - 0.55 * squint));
    const [lx, ly] = look || [Math.sin(t * 0.7 + phase) * 0.35, Math.sin(t * 0.43 + phase * 2) * 0.2];
    iris.position.x = THREE.MathUtils.clamp(lx, -1, 1) * e * 0.34;
    iris.position.y = THREE.MathUtils.clamp(ly, -1, 1) * e * 0.3;
    if (steamFx) steamFx.update(t);
  }
  update(0);
  return { group, body, eye, iris: irisDisc, top, height: spec.h * size, portal: () => irisDisc, update };
}
