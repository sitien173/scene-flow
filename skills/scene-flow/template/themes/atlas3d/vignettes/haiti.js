// Sentence 5: Caribbean view on Hispaniola showing Saint-Domingue crisis.
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);
  scene.add(kit.map.group);

  const camera = kit.camera(35);
  const startPose = kit.view(-72.4, 19.0, 1.05, 20);
  const endPose = kit.view(-72.2, 19.0, 1.12, 19);
  kit.applyView(camera, startPose);

  const htiAt = kit.beat("hti");
  kit.map.fill("hti", { at: htiAt, dur: 0.4, color: "red" });
  kit.map.label("hti", "Saint-Domingue", { at: htiAt + 0.08, dur: 0.3, offset: [0, 56] });

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const [htiLon, htiLat] = kit.map.regionCenter("hti");
  const soldier = kit.figure("soldier", {
    expression: "shocked",
    gesture: "shrug",
    scale: 1.05,
    position: kit.lonLatToWorld(htiLon, htiLat, 0.145),
    rotationY: 0.1,
    at: htiAt,
    popDur: 0.22,
  });

  layerGroup.add(soldier.group);

  function update(t) {
    kit.move(camera, t, startPose, endPose, 1.8, { start: 1.0 });
    soldier.update(t);
  }

  return {
    scene,
    camera,
    update,
    hero: [soldier.group],
  };
}
