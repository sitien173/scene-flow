// A chunky low-poly site worker for terra3d: hard hat, hi-vis band, boxy limbs, matte flat shading.
// About 2.5 units tall at scale 1. Gestures are pure functions of t, so any frame can be seeked in any order.
const GESTURES = ["idle", "walk", "work", "cheer"];

export function worker(kit, opts = {}) {
  const { THREE } = kit;
  const {
    gesture = "idle",
    scale = 1,
    speed = 1,
    phase = 0,
    shirtColor = "#F27D24",
    pantsColor = "#2B4A6F",
    hatColor = "#F6C431",
    skinColor = "#E0AC85",
    position = [0, 0, 0],
    rotationY = 0,
    from = null,
    to = null,
    start = 0,
    dur = 4,
    curve = "linear",
    shadow = true,
  } = opts;
  if (!GESTURES.includes(gesture)) {
    throw new Error("worker: unknown gesture " + JSON.stringify(gesture) + " in vignette " + kit.id + " (expected " + GESTURES.join(", ") + ")");
  }

  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;
  const body = new THREE.Group();
  body.scale.setScalar(scale);
  group.add(body);

  const shirt = kit.matte(shirtColor, { roughness: 0.8 });
  const pants = kit.matte(pantsColor, { roughness: 0.85 });
  const skin = kit.matte(skinColor, { roughness: 0.75 });
  const dark = kit.matte("#2A2724", { roughness: 0.7 });
  const vest = kit.matte("#E8F25A", { roughness: 0.6 });
  const hat = kit.matte(hatColor, { roughness: 0.45 });
  const add = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = !!shadow;
    m.receiveShadow = !!shadow;
    parent.add(m);
    return m;
  };

  // Legs pivot at the hip, arms at the shoulder; each mesh hangs below its pivot.
  const limb = (x, y, w, len, mat, cap, capMat) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    body.add(pivot);
    add(pivot, new THREE.BoxGeometry(w, len, w * 1.1), mat, 0, -len / 2, 0);
    add(pivot, cap, capMat, 0, -len, 0.03);
    return pivot;
  };
  const legL = limb(-0.2, 0.78, 0.32, 0.66, pants, new THREE.BoxGeometry(0.34, 0.16, 0.46), dark);
  const legR = limb(0.2, 0.78, 0.32, 0.66, pants, new THREE.BoxGeometry(0.34, 0.16, 0.46), dark);

  const torso = new THREE.Group();
  torso.position.y = 0.78;
  body.add(torso);
  add(torso, new THREE.BoxGeometry(0.9, 0.8, 0.56), shirt, 0, 0.4, 0);
  add(torso, new THREE.BoxGeometry(0.92, 0.09, 0.58), vest, 0, 0.42, 0);
  add(torso, new THREE.BoxGeometry(0.94, 0.12, 0.6), pants, 0, 0.04, 0);

  const armPivot = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.72, 0);
    torso.add(pivot);
    add(pivot, new THREE.BoxGeometry(0.24, 0.62, 0.27), shirt, 0, -0.29, 0);
    add(pivot, new THREE.SphereGeometry(0.14, 10, 8), skin, 0, -0.64, 0);
    return pivot;
  };
  const armL = armPivot(-0.58);
  const armR = armPivot(0.58);

  const head = new THREE.Group();
  head.position.y = 1.2;
  torso.add(head);
  add(head, new THREE.SphereGeometry(0.42, 16, 12), skin, 0, 0, 0);
  for (const side of [-1, 1]) add(head, new THREE.SphereGeometry(0.05, 8, 6), dark, side * 0.15, 0.04, 0.39);
  const dome = add(head, new THREE.SphereGeometry(0.45, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hat, 0, 0.1, 0);
  dome.scale.y = 0.85;
  add(head, new THREE.CylinderGeometry(0.52, 0.54, 0.05, 16), hat, 0, 0.1, 0.04);
  add(head, new THREE.BoxGeometry(0.1, 0.07, 0.7), hat, 0, 0.47, 0);

  function update(t) {
    kit.followPath(group, t, { from, to, start, dur, curve });
    const u = t * speed + phase;
    let legSwing = 0, armX = 0, armZ = 0, bob = 0, lean = 0, wave = 0;
    if (gesture === "idle") {
      bob = 0.015 * Math.sin(u * Math.PI * 2 / 2.4);
      armX = 0.05 * Math.sin(u * Math.PI * 2 / 2.4);
    } else if (gesture === "walk") {
      const w = Math.sin(u * Math.PI * 2 / 0.9);
      legSwing = 0.5 * w;
      armX = -0.4 * w;
      bob = 0.05 * Math.abs(w);
    } else if (gesture === "work") {
      const s = 0.5 - 0.5 * Math.cos(u * Math.PI * 2 / 1.4);
      armX = -0.3 - 1.2 * s;
      lean = 0.18 * s;
      bob = -0.03 * s;
    } else {
      armZ = 2.5;
      wave = 0.25 * Math.sin(u * Math.PI * 2 / 0.7);
      bob = 0.06 * Math.abs(Math.sin(u * Math.PI * 2 / 1.4));
    }
    legL.rotation.x = legSwing;
    legR.rotation.x = -legSwing;
    torso.position.y = 0.78 + bob;
    torso.rotation.x = lean;
    if (gesture === "work") {
      armL.rotation.set(armX, 0, 0);
      armR.rotation.set(armX, 0, 0);
    } else {
      armL.rotation.set(armX, 0, -armZ - wave);
      armR.rotation.set(-armX, 0, armZ + wave);
    }
  }
  update(0);
  return { group, hero: group, update };
}
