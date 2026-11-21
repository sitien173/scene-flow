// Sample model for toon3d: two grey utility poles at the street side, two thin wires across the facade between them, and a grey
// meter box on the facade. Static, so update() does nothing. The wires carry no ink: at street framing they read as dark lines.
export function utility(kit) {
  const { THREE, PALETTE, toon, ink } = kit;
  const group = new THREE.Group();
  const post = toon("#9A968E");
  const wire = toon(PALETTE.ink);
  const lines = [];
  for (const x of [-5.4, 5.6]) {
    lines.push([[x, 0, 2.2], [x, 6.0, 2.2]]);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 6.0, 12), post);
    p.position.set(x, 3.0, 2.2);
    ink(p, 0.014);
    group.add(p);
  }
  for (const y of [2.1, 2.35]) {
    lines.push([[-5.4, y, 2.2], [5.6, y, 2.2]]);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 11.0, 6).rotateZ(Math.PI / 2), wire);
    w.position.set(0.1, y, 2.2);
    group.add(w);
  }
  const meter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.2), toon(PALETTE.metal));
  meter.position.set(3.3, 1.5, 1.72);
  ink(meter, 0.014);
  group.add(meter);
  return { group, update() {}, lines };
}
