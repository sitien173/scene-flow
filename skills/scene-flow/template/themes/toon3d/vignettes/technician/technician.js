// Sample character for toon3d: a boxy rooftop technician in a teal shirt, navy trousers, and a white hard hat.
// Gestures are pure functions of t: "walk" moves from `from` to `to` between start and start + dur, "work" raises the right arm.
const GESTURES = ["walk", "work"];

export function technician(kit, opts = {}) {
  const { THREE, PALETTE, toon, ink, progress, ease } = kit;
  const { gesture = "work", scale = 1, from = [0, 0, 0], to = from, start = 0, dur = 3, rotationY = 0 } = opts;
  if (!GESTURES.includes(gesture)) {
    throw new Error("technician: unknown gesture " + JSON.stringify(gesture) + " (expected walk or work)");
  }

  const group = new THREE.Group();
  group.position.set(from[0], from[1], from[2]);
  group.rotation.y = rotationY;
  const body = new THREE.Group();
  body.scale.setScalar(scale);
  group.add(body);
  const add = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const shirt = toon(PALETTE.teal);
  const trousers = toon(PALETTE.navy);
  const skin = toon(PALETTE.skin);
  const helmet = toon(PALETTE.white);
  const boots = toon(PALETTE.ink);

  const pivot = (x, y) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    body.add(p);
    return p;
  };
  const legL = pivot(-0.2, 0.78);
  const legR = pivot(0.2, 0.78);
  for (const leg of [legL, legR]) {
    add(leg, new THREE.BoxGeometry(0.32, 0.66, 0.36), trousers, 0, -0.33, 0);
    add(leg, new THREE.BoxGeometry(0.34, 0.16, 0.46), boots, 0, -0.74, 0.05);
  }

  const torso = new THREE.Group();
  torso.position.y = 0.78;
  body.add(torso);
  add(torso, new THREE.BoxGeometry(0.9, 0.8, 0.5), shirt, 0, 0.4, 0);
  add(torso, new THREE.BoxGeometry(0.94, 0.12, 0.54), trousers, 0, 0.04, 0);
  add(torso, new THREE.BoxGeometry(0.26, 0.4, 0.24), skin, 0, 0.9, 0);

  const arm = x => {
    const p = new THREE.Group();
    p.position.set(x, 0.72, 0);
    torso.add(p);
    add(p, new THREE.BoxGeometry(0.24, 0.62, 0.26), shirt, 0, -0.29, 0);
    add(p, new THREE.BoxGeometry(0.22, 0.2, 0.24), skin, 0, -0.66, 0);
    return p;
  };
  const armL = arm(-0.6);
  const armR = arm(0.6);

  const head = new THREE.Group();
  head.position.y = 1.2;
  torso.add(head);
  add(head, new THREE.BoxGeometry(0.5, 0.5, 0.46), skin, 0, 0.1, 0);
  add(head, new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), helmet, 0, 0.3, 0);
  add(head, new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16), helmet, 0, 0.3, 0);

  ink(group, 0.03);

  function headAt(t) {
    const x = ease(progress(t, start, dur), "inOut");
    const at = gesture === "walk" ? from.map((v, i) => v + (to[i] - v) * x) : from;
    return new THREE.Vector3(at[0], at[1] + 1.95 * scale, at[2]);
  }

  function update(t) {
    const moving = gesture === "walk" && t >= start && t <= start + dur;
    if (gesture === "walk") {
      const x = ease(progress(t, start, dur), "inOut");
      group.position.set(from[0] + (to[0] - from[0]) * x, from[1] + (to[1] - from[1]) * x, from[2] + (to[2] - from[2]) * x);
      const w = moving ? Math.sin(t * Math.PI * 2 / 0.9) : 0;
      legL.rotation.x = 0.5 * w;
      legR.rotation.x = -0.5 * w;
      armL.rotation.x = -0.4 * w;
      armR.rotation.x = 0.4 * w;
      torso.position.y = 0.78;
      torso.rotation.x = 0;
    } else {
      const s = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 1.4);
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      armL.rotation.x = -0.1;
      armR.rotation.x = -0.3 - 1.2 * s;
      torso.rotation.x = 0.18 * s;
      torso.position.y = 0.78 - 0.03 * s;
    }
  }
  update(0);
  return { group, hero: group, update, headAt };
}
