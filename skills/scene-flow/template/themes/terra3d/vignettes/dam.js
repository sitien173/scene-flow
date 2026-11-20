// Vignette 9: Concrete dam across the valley holding back the upper lake with 26 m I-bar.
export async function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = await kit.stage({ ground: false, shadow: { size: 1024, range: 26 } });
  const camera = kit.camera(38);
  const fieldOpts = {
    seed: 63,
    river: true,
    riverWidth: 4.5,
    lake: true,
    lakeCenter: [0, -8],
    lakeRadius: [12, 8],
    cut: { center: [0, 7], width: 14, length: 16, depth: 1.6, bank: 2.5 },
  };
  const field = kit.createHeightfield(fieldOpts);
  const land = await kit.terrain({ ...fieldOpts, size: 80, segments: 80 });

  const damGroup = new THREE.Group();
  const wallMat = kit.matte(PALETTE.stone);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.8, 1.4), wallMat);
  wall.position.set(0, 1.4, -1.2);
  wall.castShadow = true;
  wall.receiveShadow = true;

  const spillway = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.9, 1.55), kit.matte(PALETTE.steel));
  spillway.position.set(0, 0.95, -1.2);
  spillway.castShadow = true;

  const crest = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.25, 1.65), kit.matte(PALETTE.white));
  crest.position.set(0, 2.85, -1.2);

  damGroup.add(wall, spillway, crest);
  scene.add(land.object, damGroup);

  kit.ibar({
    text: "26 m",
    a: [-3.9, 0.0, -1.2],
    b: [-3.9, 2.8, -1.2],
    labelOffset: [64, 0],
    start: 0.2,
  });

  function update(t) {
    kit.drone(camera, t, {
      from: [-3.5, 12.0, 28.5],
      to: [2.0, 10.6, 26.5],
      lookFrom: [0, 5.4, -1.2],
      lookTo: [0, 5.2, -1.2],
      dur: 2.4,
    });
    land.update(t);
  }
  return { scene, camera, update, hero: damGroup };
}
