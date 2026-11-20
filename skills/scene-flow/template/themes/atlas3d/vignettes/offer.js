// Sentences 9-11: Backdrop scene for Napoleon's surprise offer of all Louisiana for $15M.
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.paper);

  kit.backdrop(scene, { image: kit.image || "backdrops/sample.webp" });

  const camera = kit.camera(35);
  const camFrom = [0.1, 1.35, 8.8];
  const camTo = [-0.05, 1.32, 8.6];

  const priceAt = kit.beat("price");
  const envoysAt = kit.beat("envoys");

  const king = kit.figure("king", {
    expression: "shocked",
    gesture: "shrug",
    scale: 1.2,
    position: [-0.9, 0.0, 0.1],
    rotationY: 0.28,
    at: 0.15,
    popDur: 0.45,
  });

  const tag = kit.props.priceTag({
    text: "15 triệu $",
    scale: 1.0,
    position: [-0.26, 0.0, 0.42],
    rotationY: 0.04,
    at: priceAt,
    popDur: 0.4,
  });

  const envoy1 = kit.figure("diplomat", {
    expression: "smile",
    gesture: "wave",
    scale: 1.02,
    position: [0.52, 0.0, 0.18],
    rotationY: -0.22,
    at: envoysAt,
    popDur: 0.4,
  });

  const envoy2 = kit.figure("diplomat", {
    expression: "smile",
    gesture: "idle",
    scale: 1.0,
    position: [0.98, 0.0, 0.14],
    rotationY: -0.35,
    at: envoysAt + 0.15,
    popDur: 0.4,
  });

  scene.add(king.group, tag.group, envoy1.group, envoy2.group);

  function update(t) {
    kit.dolly(camera, t, { from: camFrom, to: camTo, look: [0, 0.56, 0], start: 0, dur: 7.5 });
    king.update(t, {
      expression: t < priceAt ? "shocked" : "smile",
      gesture: t < priceAt ? "shrug" : "hold",
    });
    tag.update(t);
    envoy1.update(t);
    envoy2.update(t);
  }
  update(0);

  return {
    scene,
    camera,
    update,
    hero: [king.group, tag.group, envoy1.group, envoy2.group],
  };
}
