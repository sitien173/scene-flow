// Container ship facing +Z: two-tone hull with a pointed bow, stern bridge with funnel and lifeboat,
// and one InstancedMesh of seeded container stacks. Moves along an optional path and rides heightAt waves.
export function containerShip(kit, opts = {}) {
  const { THREE } = kit;
  const {
    length = 12.5,
    beam = 2.8,
    hullHeight = 1.15,
    hullColor = "#1F3B57",
    bootColor = "#9E3B2E",
    deckColor = "#B84A39",
    cabinColor = "#F1F5F9",
    rows = 5,
    cols = 3,
    layers = 3,
    seed = 71,
    position = [0, 0, 0],
    rotationY = 0,
    from = null,
    to = null,
    start = 0,
    dur = 5,
    curve = "linear",
    heightAt = null,
    waterLevel = 0,
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

  const hullMat = kit.matte(hullColor, { roughness: 0.72, metalness: 0.1 });
  const bootMat = kit.matte(bootColor, { roughness: 0.8 });
  const deckMat = kit.matte(deckColor, { roughness: 0.8 });
  const cabinMat = kit.matte(cabinColor, { roughness: 0.65 });
  const darkMat = kit.matte("#1B2B3A", { roughness: 0.5 });
  const lineMat = kit.matte("#F1F5F9", { roughness: 0.7 });

  const bodyLen = length * 0.78;
  const midZ = -length * 0.08;
  const bootH = hullHeight * 0.32;
  add(new THREE.BoxGeometry(beam, hullHeight - bootH, bodyLen), hullMat, 0, bootH + (hullHeight - bootH) / 2 - hullHeight * 0.1, midZ);
  add(new THREE.BoxGeometry(beam * 0.98, bootH, bodyLen * 0.99), bootMat, 0, bootH / 2 - hullHeight * 0.1, midZ);
  add(new THREE.BoxGeometry(beam * 1.01, 0.06, bodyLen * 1.0), lineMat, 0, bootH - hullHeight * 0.1, midZ, false);

  // Pointed bow: a four-sided cone turned to lie along +Z and flattened to the hull height.
  const bowLen = length * 0.24;
  const bowGeom = new THREE.ConeGeometry(beam * 0.52, bowLen, 4);
  bowGeom.rotateY(Math.PI * 0.25);
  bowGeom.rotateX(Math.PI * 0.5);
  bowGeom.scale(1.0, hullHeight / (beam * 0.72), 1.0);
  add(bowGeom, hullMat, 0, hullHeight * 0.4, bodyLen * 0.5 + midZ + bowLen * 0.42);

  add(new THREE.BoxGeometry(beam * 0.94, 0.12, bodyLen * 0.94), deckMat, 0, hullHeight * 0.95, midZ, false);

  // Stern bridge with window band, funnel, mast, and a lifeboat on one side.
  const bridgeZ = -bodyLen * 0.5 + midZ + 0.85;
  const deckY = hullHeight * 0.95;
  add(new THREE.BoxGeometry(beam * 0.82, 1.45, 1.35), cabinMat, 0, deckY + 0.72, bridgeZ);
  add(new THREE.BoxGeometry(beam * 0.84, 0.28, 0.85), darkMat, 0, deckY + 1.15, bridgeZ + 0.28, false);
  add(new THREE.BoxGeometry(beam * 0.9, 0.08, 1.5), cabinMat, 0, deckY + 1.48, bridgeZ);
  add(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8), deckMat, 0, deckY + 1.75, bridgeZ - 0.25);
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6), darkMat, 0, deckY + 1.9, bridgeZ + 0.35);
  const boat = add(new THREE.CapsuleGeometry(0.13, 0.45, 3, 8), kit.matte("#F27D24"), beam * 0.47, deckY + 0.55, bridgeZ);
  boat.rotation.x = Math.PI / 2;

  // Seeded container stacks in one InstancedMesh.
  const r = kit.rand(seed);
  const palette = ["#E05A47", "#3A86C8", "#E6A83A", "#46A06C", "#7D6B9E"].map(c => new THREE.Color(c));
  const cw = (beam * 0.82) / cols;
  const cl = (bodyLen * 0.72) / rows;
  const ch = 0.48;
  const containers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(cw * 0.9, ch * 0.92, cl * 0.92),
    kit.matte("#FFFFFF", { roughness: 0.7, metalness: 0.08 }),
    rows * cols * layers,
  );
  containers.castShadow = !!shadow;
  containers.receiveShadow = !!shadow;
  const m = new THREE.Matrix4();
  let idx = 0;
  const zStart = -bodyLen * 0.5 + midZ + 2.15;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const stackH = 1 + Math.floor(r() * layers);
      for (let ly = 0; ly < stackH; ly++) {
        m.makeTranslation((col - (cols - 1) * 0.5) * cw, hullHeight + 0.08 + (ly + 0.5) * ch, zStart + row * cl);
        containers.setMatrixAt(idx, m);
        containers.setColorAt(idx, palette[Math.floor(r() * palette.length)]);
        idx++;
      }
    }
  }
  containers.count = idx;
  containers.instanceMatrix.needsUpdate = true;
  if (containers.instanceColor) containers.instanceColor.needsUpdate = true;
  group.add(containers);

  function update(t) {
    if (from && to) {
      kit.followPath(group, t, { from, to, start, dur, curve, heightAt, waterLevel });
    } else if (heightAt) {
      group.position.y = heightAt(group.position.x, group.position.z, t) + (position[1] - waterLevel);
    }
  }
  update(0);
  return { group, hero: group, containers, update };
}
