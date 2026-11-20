// Vignette 17: Equalizing lock chambers with sky reflection, seeded buoys, and dolly push-in.
export async function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = await kit.stage({
    ground: false,
    fog: "#A9D5F2",
    near: 30,
    far: 105,
    shadow: { size: 1024, range: 24 },
  });
  scene.environment = await kit.loadSky();
  const camera = kit.camera(38);
  const cut = await kit.cutaway({
    width: 7.4,
    depth: 4.2,
    baseY: -1.6,
    wallHeight: 2.6,
    chambers: [
      { x: -1.55, width: 2.9, from: 2.1, to: 1.4, start: 0.2, dur: 2.0 },
      { x: 1.65, width: 2.9, from: 0.7, to: 1.4, start: 0.2, dur: 2.0 },
    ],
    gates: [
      { x: 0.05, depth: 1.35, jambs: true, jambWidth: 0.36, from: 0.0, to: 1.15, start: 2.0, dur: 1.0 },
    ],
  });

  const rng = kit.rand(1701);
  const buoys = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 0.32, 8),
      kit.matte(i % 2 === 0 ? PALETTE.brick : PALETTE.sun),
    );
    b.position.set(-2.4 + i * 1.6 + (rng() - 0.5) * 0.3, cut.deckY + 2.85, 1.8);
    buoys.add(b);
  }
  scene.add(cut.object, buoys);

  function update(t) {
    kit.dolly(camera, t, {
      from: [-2.4, 7.8, 27.5],
      to: [0.8, 7.2, 26.0],
      look: [0, 5.2, 0],
      dur: 3.2,
    });
    cut.update(t);
  }
  return { scene, camera, update, hero: cut.object };
}
