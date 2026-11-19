// Vignette 16: Crane rise over miter lock gates swinging shut with 33 m span dimension marker.
export async function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = await kit.stage({
    ground: false,
    fog: "#A9D5F2",
    near: 30,
    far: 105,
    shadow: { size: 1024, range: 24 },
  });
  const camera = kit.camera(38);
  const gateSpec = { x: 0.0, depth: 1.5, jambs: true, jambWidth: 0.38, from: 1.15, to: 0.0, start: 0.35, dur: 1.6 };
  const cut = await kit.cutaway({
    width: 7.4,
    depth: 4.4,
    baseY: -1.6,
    wallHeight: 2.7,
    chambers: [
      { x: -1.6, width: 2.8, from: 1.85, to: 1.85, start: 0, dur: 1.0 },
      { x: 1.6, width: 2.8, from: 1.85, to: 1.85, start: 0, dur: 1.0 },
    ],
    gates: [gateSpec],
  });
  const sealMarker = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.25, 0.18),
    kit.matte(PALETTE.sun),
  );
  scene.add(cut.object, sealMarker);

  kit.span({
    text: "33 m",
    a: [-2.2, cut.deckY + 2.95, 2.0],
    b: [2.2, cut.deckY + 2.95, 2.0],
    labelOffset: [0, -32],
    start: 0.25,
  });

  function update(t) {
    kit.crane(camera, t, {
      from: [-3.5, 7.6, 26.8],
      to: [2.5, 11.8, 26.5],
      lookFrom: [0, 5.7, 0],
      lookTo: [0, 6.2, 0],
      dur: 2.4,
    });
    cut.update(t);
    const angle = kit.gateAngle(t, gateSpec);
    sealMarker.position.set(Math.sin(angle) * 0.4, cut.deckY + 2.95, 0);
  }
  return { scene, camera, update, hero: cut.object };
}
