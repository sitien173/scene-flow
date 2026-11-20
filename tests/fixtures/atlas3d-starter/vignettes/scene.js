// Sentence 3 onward: backdrop vignette showing painted landscape plate, shadow-receiving floor, farmer figure, and price tag prop.
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.paper);

  kit.backdrop(scene, { image: kit.image || "backdrops/sample.webp" });

  const camera = kit.camera(35);
  const camFrom = [0.2, 1.35, 7.6];
  const camTo = [-0.15, 1.32, 7.2];

  const farmer = kit.figure("farmer", {
    expression: "smile",
    gesture: "wave",
    scale: 1.35,
    position: [-0.42, 0.0, 0.0],
    rotationY: 0.25,
    at: 0.15,
    popDur: 0.45,
  });
  const tag = kit.props.priceTag({
    text: "$15M",
    position: [0.58, 0.0, 0.15],
    rotationY: -0.2,
    scale: 1.15,
    at: 0.35,
    popDur: 0.45,
  });
  scene.add(farmer.group, tag.group);

  function update(t) {
    kit.dolly(camera, t, { from: camFrom, to: camTo, look: [0, 0.54, 0], start: 0, dur: 6.0 });
    farmer.update(t);
    tag.update(t);
  }
  update(0);

  return { scene, camera, update, hero: [farmer.group, tag.group] };
}
