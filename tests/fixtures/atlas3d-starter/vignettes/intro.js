// Sentence 1: shared parchment map focusing on France, with two chibi figures and three props on the vignette's layer.
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);
  scene.add(kit.map.group);

  const camera = kit.camera(35);
  const startPose = kit.view(2.3, 46.8, 0.85, 22);
  const endPose = kit.view(2.3, 46.5, 0.95, 20);
  kit.applyView(camera, startPose);

  const fillAt = kit.beat("fill");
  kit.map.fill("fra", { at: fillAt, dur: 0.45, color: "blue" });
  kit.map.label([2.3, 49.0], "Pháp", { at: 0.25, dur: 0.35, offset: [0, -18] });

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const king = kit.figure("king", {
    expression: "smile",
    gesture: "wave",
    scale: 1.0,
    position: kit.lonLatToWorld(0.6, 46.8, 0.145),
    rotationY: 0.22,
    at: 0.45,
    popDur: 0.45,
    outAt: 5.45,
    outDur: 0.35,
  });
  const diplomat = kit.figure("diplomat", {
    expression: "neutral",
    gesture: "point",
    scale: 0.98,
    position: kit.lonLatToWorld(3.9, 46.8, 0.145),
    rotationY: -0.28,
    at: 0.65,
    popDur: 0.45,
    outAt: 5.45,
    outDur: 0.35,
  });

  const ship = kit.props.sailingShip({
    position: kit.lonLatToWorld(-2.4, 45.6, 0.015),
    rotationY: 0.6,
    scale: 1.15,
    at: 0.7,
    popDur: 0.45,
    outAt: 5.45,
    outDur: 0.35,
  });
  const crate = kit.props.cargoCrate({
    position: kit.lonLatToWorld(0.4, 45.2, 0.145),
    rotationY: 0.35,
    scale: 0.95,
    at: 0.85,
    popDur: 0.45,
    outAt: 5.45,
    outDur: 0.35,
  });
  const bag = kit.props.moneyBag({
    position: kit.lonLatToWorld(4.1, 45.4, 0.145),
    rotationY: -0.25,
    scale: 1.0,
    at: 1.0,
    popDur: 0.45,
    outAt: 5.45,
    outDur: 0.35,
  });

  layerGroup.add(king.group, diplomat.group, ship.group, crate.group, bag.group);

  function update(t) {
    kit.move(camera, t, startPose, endPose, 4.5);
    king.update(t);
    diplomat.update(t);
    ship.update(t);
    crate.update(t);
    bag.update(t);
  }

  return {
    scene,
    camera,
    update,
    hero: [king.group, diplomat.group, ship.group, crate.group, bag.group],
  };
}
