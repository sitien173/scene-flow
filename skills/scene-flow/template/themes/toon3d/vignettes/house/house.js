// Sample object for toon3d: a salmon house with a flat grey roof behind a parapet, two windows, a brown door, and two rows of
// blue solar panels on steel rails, tilted toward the sun. Panels pop in from panelStart, a pure function of t.
// The house sits at the origin, so every anchor is a plain world point.
const ROOF = 2.8; // top of the roof slab
const TILT = 0.3; // radians: the panel slope toward the sun (-x)
const STANDOFF = 0.32; // height of each row origin above the roof
const ROWS = [-0.8, 0.8]; // x of the two rows
const PANEL_Z = [-0.95, 0, 0.95];

export function house(kit, { panelStart = 0.6, stagger = 0.12, inverter = false, rails = true } = {}) {
  const { THREE, PALETTE, toon, ink, pop, panelTexture } = kit;
  const group = new THREE.Group();
  const add = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // Walls, the flat roof slab, and the parapet ring around the roof.
  add(group, new THREE.BoxGeometry(4.2, 2.6, 3.2), toon(PALETTE.wall), 0, 1.3, 0);
  add(group, new THREE.BoxGeometry(4.2, 0.2, 3.2), toon(PALETTE.roof), 0, 2.7, 0);
  const parapet = toon(PALETTE.wall);
  const parapetY = ROOF + 0.18;
  add(group, new THREE.BoxGeometry(4.2, 0.36, 0.2), parapet, 0, parapetY, 1.5);
  add(group, new THREE.BoxGeometry(4.2, 0.36, 0.2), parapet, 0, parapetY, -1.5);
  add(group, new THREE.BoxGeometry(0.2, 0.36, 2.8), parapet, 2.0, parapetY, 0);
  add(group, new THREE.BoxGeometry(0.2, 0.36, 2.8), parapet, -2.0, parapetY, 0);

  // The front face at z = 1.6: two white-framed windows and a brown door.
  const frame = toon(PALETTE.white);
  const glass = toon(PALETTE.glass);
  for (const x of [-0.95, 0.05]) {
    add(group, new THREE.BoxGeometry(0.9, 1.0, 0.06), frame, x, 1.45, 1.63);
    add(group, new THREE.BoxGeometry(0.72, 0.82, 0.04), glass, x, 1.45, 1.68);
  }
  add(group, new THREE.BoxGeometry(0.8, 1.2, 0.06), toon(PALETTE.door), 1.15, 0.6, 1.63);

  // A row is a frame tilted about z by TILT, with its origin STANDOFF above the roof. onRow maps row space to the world.
  const c = Math.cos(TILT);
  const s = Math.sin(TILT);
  const onRow = (x0, lx, ly, lz) => new THREE.Vector3(x0 + lx * c - ly * s, ROOF + STANDOFF + lx * s + ly * c, lz);

  // Each panel's underside lies at its row origin, so a pop-in scaled about that origin keeps the panel on its rails.
  const panelGeo = new THREE.BoxGeometry(0.8, 0.06, 0.9).translate(0, 0.03, 0);
  const panelMat = toon(PALETTE.white, panelTexture());
  const panels = [];
  let k = 0;
  for (const x0 of ROWS) {
    for (const z of PANEL_Z) {
      const p = onRow(x0, 0, 0, z);
      const mesh = add(group, panelGeo, panelMat, p.x, p.y, p.z);
      mesh.rotation.z = TILT;
      panels.push({ mesh, start: panelStart + k * stagger });
      k++;
    }
  }

  // Steel rails under each panel row, on two legs per rail that stand on the roof.
  if (rails) {
    const railGeo = new THREE.BoxGeometry(0.08, 0.08, 2.8);
    const legGeo = new THREE.BoxGeometry(0.07, 1, 0.07);
    const metal = toon(PALETTE.metal);
    for (const x0 of ROWS) {
      for (const lx of [-0.36, 0.36]) {
        const p = onRow(x0, lx, -0.04, 0);
        const rail = add(group, railGeo, metal, p.x, p.y, p.z);
        rail.rotation.z = TILT;
        for (const lz of [-1.25, 1.25]) {
          const foot = onRow(x0, lx, -0.08, lz);
          const h = foot.y - ROOF;
          add(group, legGeo, metal, foot.x, ROOF + h / 2, foot.z).scale.y = h;
        }
      }
    }
  }

  if (inverter) add(group, new THREE.BoxGeometry(0.5, 0.7, 0.25), toon(PALETTE.metal), -1.75, 1.0, 1.73);

  ink(group, 0.014);
  const anchors = {
    panel: onRow(ROWS[0], 0, 0.06, 0),
    rail: onRow(ROWS[1], -0.36, 0, 0),
    inverter: new THREE.Vector3(-1.75, 1.0, 1.95),
  };

  function update(t) {
    for (const p of panels) p.mesh.scale.setScalar(Math.max(0.001, pop(t, p.start, 0.45)));
  }
  update(0);
  return { group, anchors, update };
}
