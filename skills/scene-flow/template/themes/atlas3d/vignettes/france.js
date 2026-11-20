// Sentences 2-4: Western Europe view with France, Spain, Napoleon, and cargo crate.
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);
  scene.add(kit.map.group);

  const camera = kit.camera(35);
  const startPose = kit.view(-0.5, 44.5, 0.72, 20);
  const endPose = kit.view(-0.8, 44.2, 0.78, 19);
  kit.applyView(camera, startPose);

  const fraAt = kit.beat("fra");
  const espAt = kit.beat("esp");
  const crateAt = kit.beat("crate");

  kit.map.fill("fra", { at: fraAt, dur: 0.45, color: "blue" });
  kit.map.label("fra", "Pháp", { at: fraAt + 0.1, dur: 0.35, offset: [10, 64] });

  kit.map.fill("esp", { at: espAt, dur: 0.45, color: "orange" });
  kit.map.label("esp", "Tây Ban Nha", { at: espAt + 0.1, dur: 0.35, offset: [0, 28] });

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const king = kit.figure("king", {
    expression: "smile",
    gesture: "idle",
    scale: 1.7,
    position: kit.lonLatToWorld(2.8, 47.2, 0.145),
    rotationY: -0.15,
    at: fraAt + 0.15,
    popDur: 0.45,
  });

  const crate = kit.props.cargoCrate({
    scale: 1.55,
    position: kit.lonLatToWorld(-0.4, 46.2, 0.145),
    rotationY: 0.3,
    at: crateAt,
    popDur: 0.4,
  });

  layerGroup.add(king.group, crate.group);

  function update(t) {
    kit.move(camera, t, startPose, endPose, 6.5, { start: 1.0 });
    king.update(t);
    crate.update(t);
  }

  return {
    scene,
    camera,
    update,
    hero: [king.group, crate.group],
  };
}
