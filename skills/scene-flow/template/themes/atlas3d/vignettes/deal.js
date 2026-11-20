// Sentence 1: North America wide view introducing the 1803 Louisiana Purchase.
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);
  scene.add(kit.map.group);

  const camera = kit.camera(35);
  const startPose = kit.view(-90, 38, 0.42, 20);
  const endPose = kit.view(-89, 37.8, 0.46, 19);
  kit.applyView(camera, startPose);

  kit.map.label([-78, 40.5], "Hoa Kỳ", { at: 0.35, dur: 0.35, offset: [0, -32] });

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const merchant = kit.figure("merchant", {
    expression: "smile",
    gesture: "wave",
    scale: 2.1,
    position: kit.lonLatToWorld(-85.5, 37.5, 0.09),
    rotationY: -0.2,
    at: 0.4,
    popDur: 0.45,
  });

  const bag = kit.props.moneyBag({
    scale: 1.9,
    position: kit.lonLatToWorld(-81.2, 36.0, 0.09),
    rotationY: -0.25,
    at: 0.75,
    popDur: 0.45,
  });

  layerGroup.add(merchant.group, bag.group);

  function update(t) {
    kit.move(camera, t, startPose, endPose, 4.0);
    merchant.update(t);
    bag.update(t);
  }

  return {
    scene,
    camera,
    update,
    hero: [merchant.group, bag.group],
  };
}
