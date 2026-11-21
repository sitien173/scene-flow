// A chunky bevelled arrow that bobs above the map. opts.pointing is "up" (default), "down", "left" or
// "right"; opts.color is the fill.
export function mapArrow(kit, opts = {}) {
  const { THREE, look } = kit;
  const { pointing = "up", color = look.PALETTE.white } = opts;
  const turns = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
  if (!(pointing in turns)) throw new Error("map-arrow: unknown pointing " + JSON.stringify(pointing));
  const group = new THREE.Group();
  group.userData.atlasHero = "map-arrow";
  const { pivot, baseScale } = kit.place(group, opts, { mapFacing: true, mapScale: 1.38, lift: 0.06 });
  const bob = new THREE.Group();
  pivot.add(bob);

  // Drawn around its own center so every direction turns in place and stays inside the same box.
  const shape = new THREE.Shape();
  shape.moveTo(-0.075, -0.3);
  shape.lineTo(0.075, -0.3);
  shape.lineTo(0.075, 0.03);
  shape.lineTo(0.19, 0.03);
  shape.lineTo(0, 0.3);
  shape.lineTo(-0.19, 0.03);
  shape.lineTo(-0.075, 0.03);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
  geo.translate(0, 0, -0.025);
  const mesh = look.addToonWithHull(bob, geo, color, { thickness: 0.024 });
  mesh.rotation.z = turns[pointing];
  mesh.position.y = 0.34;

  function update(t) {
    const time = Number.isFinite(t) ? t : 0;
    const s = kit.popWindow(group, time, { ...opts, baseScale });
    if (s <= 0) return;
    bob.position.y = Math.sin(time * 3.2) * 0.04;
  }

  update((opts.at ?? 0) + (opts.popDur ?? 0.45));
  return kit.hero({ group, hero: group, update });
}
