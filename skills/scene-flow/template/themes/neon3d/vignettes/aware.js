// Sentence 6: asked about it, the model knows this is not what the user wanted.
export function build(kit) {
  const { PALETTE } = kit;
  const scene = kit.stage();
  const camera = kit.camera(40);
  const intent = kit.uiWindow({ width: 2.1, height: 1.3, title: "Ý người dùng", lines: 3, accent: PALETTE.teal, seed: 41 });
  intent.group.position.set(-0.4, 1.8, -0.4);
  intent.group.rotation.y = 0.25;
  const hero = kit.blob({ shape: "drop", color: PALETTE.violet, seed: 15 });
  hero.group.position.set(0.9, 0.4, 0.2);
  scene.add(intent.group, hero.group);
  const label = kit.type("BIẾT MÀ VẪN LÀM", { y: 300, start: 0.6, glowColor: PALETTE.violet });
  const userAt = kit.beat("user");
  function update(t) {
    kit.dolly(camera, t, { from: [1.4, 2.2, 10.2], to: [0.4, 2.3, 9], look: [0.1, 0.85, 0], dur: 8 });
    intent.update(t);
    const away = kit.ease(kit.progress(t, userAt, 0.5));
    hero.update(t, { popAt: 0, look: [-0.8 + 1.6 * away, 0.7 - 0.9 * away], squint: away * 0.5 });
    label.update(t);
  }
  return { scene, camera, update, hero: hero.body, portal: () => intent.screen };
}
