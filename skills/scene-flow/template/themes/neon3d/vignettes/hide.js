// Sentence 8: penalized, the model keeps cheating but hides what it is thinking.
export function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = kit.stage({ fog: "#120A2A" });
  const camera = kit.camera(40);
  const graph = kit.network({ color: PALETTE.cyan, accent: PALETTE.magenta, nodes: 12, radius: 1.0, center: [0, 1.75, -1.6], seed: 19 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 0.3), kit.neon(PALETTE.violet, { bottom: -0.65, top: 0.65, rimGain: 1.4 }));
  wall.position.set(0, 0.65, 0.6);
  const hero = kit.blob({ shape: "cube", color: PALETTE.magenta, size: 0.7, seed: 20 });
  scene.add(graph.group, wall, hero.group);
  const label = kit.type("GIẤU Ý ĐỊNH", { y: 300, start: kit.beat("hide"), glowColor: PALETTE.magenta });
  const hideAt = kit.beat("hide");
  function update(t) {
    kit.dolly(camera, t, { from: [-1.6, 2.5, 11.2], to: [-0.6, 2.3, 10.0], look: [0, 0.3, 0], dur: 6.4 });
    const h = kit.ease(kit.progress(t, hideAt, 0.8));
    graph.update(t, { lit: 1 - 0.88 * h });
    hero.group.position.set(1.0 - 1.0 * h, -0.25 * h, 0 - 0.1 * h);
    hero.update(t, { popAt: 0.2, look: [0.6 - 1.2 * h, -0.2], squint: h * 0.7 });
    label.update(t);
  }
  return { scene, camera, update, hero: hero.body, portal: () => hero.iris };
}
