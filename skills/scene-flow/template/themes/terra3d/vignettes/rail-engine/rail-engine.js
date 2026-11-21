// Industrial rail engine facing +Z with an optional line of freight cars behind it. Long hood, cab with
// window band, headlight, handrails, and four axles. Moves along an optional straight path.
export function railEngine(kit, opts = {}) {
  const { THREE } = kit;
  const {
    cars = 1,
    bodyColor = "#D95D39",
    trimColor = "#F4C95D",
    darkColor = "#2B3440",
    position = [0, 0, 0],
    rotationY = 0,
    from = null,
    to = null,
    start = 0,
    dur = 4,
    curve = "linear",
    shadow = true,
  } = opts;
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;
  const add = (geo, mat, x, y, z, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast && !!shadow;
    m.receiveShadow = !!shadow;
    group.add(m);
    return m;
  };

  const bodyMat = kit.matte(bodyColor, { roughness: 0.65, metalness: 0.12 });
  const trimMat = kit.matte(trimColor, { roughness: 0.55 });
  const darkMat = kit.matte(darkColor, { roughness: 0.7, metalness: 0.2 });
  const lampMat = kit.glow("#FFF3C4");

  add(new THREE.BoxGeometry(1.1, 0.24, 3.2), darkMat, 0, 0.34, 0);
  add(new THREE.BoxGeometry(0.92, 0.85, 1.9), bodyMat, 0, 0.88, 0.45);
  add(new THREE.BoxGeometry(0.96, 0.14, 1.94), trimMat, 0, 0.82, 0.45, false);
  add(new THREE.BoxGeometry(1.04, 1.15, 0.98), bodyMat, 0, 1.03, -0.95);
  add(new THREE.BoxGeometry(1.1, 0.08, 1.06), darkMat, 0, 1.64, -0.95);
  add(new THREE.BoxGeometry(1.06, 0.34, 0.72), darkMat, 0, 1.28, -0.92, false);
  add(new THREE.CylinderGeometry(0.11, 0.14, 0.42, 8), darkMat, 0, 1.48, 0.85);
  const lamp = add(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10), lampMat, 0, 1.12, 1.41, false);
  lamp.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.03, 0.03, 1.9), trimMat, side * 0.53, 0.72, 0.45, false);

  const wheelGeom = new THREE.CylinderGeometry(0.22, 0.22, 1.16, 10);
  wheelGeom.rotateZ(Math.PI * 0.5);
  for (const wz of [-1.05, -0.35, 0.45, 1.1]) add(wheelGeom, darkMat, 0, 0.22, wz);

  for (let c = 0; c < cars; c++) {
    const cz = -3.3 - c * 2.9;
    add(new THREE.BoxGeometry(1.06, 0.22, 2.5), darkMat, 0, 0.34, cz);
    add(new THREE.BoxGeometry(0.92, 0.72, 2.0), trimMat, 0, 0.8, cz);
    add(new THREE.BoxGeometry(0.96, 0.06, 2.04), bodyMat, 0, 1.18, cz, false);
    for (const wz of [cz - 0.75, cz + 0.75]) add(wheelGeom, darkMat, 0, 0.22, wz);
  }

  function update(t) {
    kit.followPath(group, t, { from, to, start, dur, curve });
  }
  update(0);
  return { group, hero: group, update };
}
