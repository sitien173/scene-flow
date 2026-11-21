// Sample model for toon3d: a flat concrete roof with rows of blue panels on steel rails, a black tank, an optional white
// inverter cabinet, a black hook cable from the array to the tank, and a male plug and a red female socket at the first row.
// Static; the scene adds effects on top.
const TILT = 0.3; // radians: the panel slope
const STANDOFF = 0.35; // height of a rail above the deck
const DECK = 0.2; // top of the deck slab
const PITCH_X = 1.0; // spacing of panels along x
const PITCH_Z = 1.8; // spacing of rows along z

export function panelArray(kit, { cols = 6, rows = 3, tank = true, inverter = true } = {}) {
  const { THREE, PALETTE, toon, ink, panelTexture } = kit;
  const group = new THREE.Group();
  const add = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const x0 = -((cols - 1) * PITCH_X) / 2;
  const z0 = -((rows - 1) * PITCH_Z) / 2;
  const xEnd = x0 + (cols - 1) * PITCH_X;

  // Deck slab, then one rail and leg set per row.
  add(group, new THREE.BoxGeometry(cols * PITCH_X + 1.2, DECK, rows * PITCH_Z + 1.6), toon(PALETTE.floor), 0, DECK / 2, 0);
  const railY = DECK + STANDOFF;
  const metal = toon(PALETTE.metal);
  for (let r = 0; r < rows; r++) {
    const z = z0 + r * PITCH_Z;
    add(group, new THREE.BoxGeometry(cols * PITCH_X + 0.3, 0.08, 0.08), metal, 0, railY - 0.04, z);
    for (let c = 0; c <= cols; c++) {
      const x = x0 + (c - 0.5) * PITCH_X;
      add(group, new THREE.BoxGeometry(0.07, STANDOFF, 0.07), metal, x, DECK + STANDOFF / 2, z);
    }
  }

  // Panels: each one tilted about x, its underside on the rail.
  const panelGeo = new THREE.BoxGeometry(0.9, 0.06, 1.6).translate(0, 0.03, 0);
  const panelMat = toon(PALETTE.white, panelTexture());
  const panels = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const m = add(group, panelGeo, panelMat, x0 + c * PITCH_X, railY + 0.25, z0 + r * PITCH_Z);
      m.rotation.x = -TILT;
      panels.push(m);
    }
  }

  // Cable: a black tube that runs from the array end to the tank, along the deck.
  const tankX = xEnd + 2.0;
  const tankZ = z0 + 0.4;
  if (tank) {
    const cable = [new THREE.Vector3(xEnd + 0.5, DECK + 0.05, z0), new THREE.Vector3(xEnd + 1.2, DECK + 0.05, z0 + 0.6), new THREE.Vector3(tankX - 0.6, DECK + 0.05, tankZ)];
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cable), 32, 0.06, 8), toon(PALETTE.ink)));
    add(group, new THREE.CylinderGeometry(0.5, 0.5, 1.4, 24), toon("#2B2B33"), tankX, DECK + 0.7, tankZ);
  }
  if (inverter) add(group, new THREE.BoxGeometry(0.6, 1.2, 0.35), toon(PALETTE.white), x0 - 1.4, DECK + 0.6, z0 + 0.2);

  // Connectors at the first row's string end: a black male plug and a red female socket, one row apart.
  const plug = new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16).rotateZ(Math.PI / 2);
  add(group, plug, toon(PALETTE.ink), x0 - 0.75, DECK + 0.5, z0);
  add(group, plug, toon(PALETTE.red), x0 - 0.75, DECK + 0.5, z0 + PITCH_Z);

  ink(group, 0.014);
  const anchors = {
    array: new THREE.Vector3(x0 + 2 * PITCH_X, railY + 0.5, z0 + PITCH_Z),
    tank: new THREE.Vector3(tankX, DECK + 1.5, tankZ),
    inverter: new THREE.Vector3(x0 - 1.4, DECK + 1.3, z0 + 0.2),
    male: new THREE.Vector3(x0 - 0.75, DECK + 0.5, z0),
    female: new THREE.Vector3(x0 - 0.75, DECK + 0.5, z0 + PITCH_Z),
  };
  return { group, anchors, panels };
}
