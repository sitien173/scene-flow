// Sentence 6: Great Britain view with angry soldier as war looms.
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);
  scene.add(kit.map.group);

  const camera = kit.camera(35);
  const startPose = kit.view(-2.2, 54.0, 0.92, 20);
  const endPose = kit.view(-2.0, 53.8, 0.98, 19);
  kit.applyView(camera, startPose);

  const gbrAt = kit.beat("gbr");
  kit.map.fill("gbr", { at: gbrAt, dur: 0.35, color: "red" });
  kit.map.label("gbr", "Anh", { at: gbrAt + 0.05, dur: 0.28, offset: [0, 56] });

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const [gbrLon, gbrLat] = kit.map.regionCenter("gbr");
  const soldier = kit.figure("soldier", {
    expression: "angry",
    gesture: "point",
    scale: 1.25,
    position: kit.lonLatToWorld(gbrLon, gbrLat, 0.145),
    rotationY: -0.2,
    at: gbrAt + 0.05,
    popDur: 0.35,
  });

  layerGroup.add(soldier.group);

  function update(t) {
    kit.move(camera, t, startPose, endPose, 1.0, { start: 0.8 });
    soldier.update(t);
  }

  return {
    scene,
    camera,
    update,
    hero: [soldier.group],
  };
}
