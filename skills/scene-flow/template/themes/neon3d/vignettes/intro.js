// Sentence 1: a line on the ground, and a blob that takes the shortcut over it.
export function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = kit.stage();
  const camera = kit.camera(40);
  const hero = kit.blob({ shape: "drop", color: PALETTE.violet, seed: 1 });
  hero.group.position.set(-0.6, 0, 0.4);
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 9), kit.glow(PALETTE.magenta, 3));
  line.position.set(0.15, 0.02, -3.6);
  const goal = kit.blob({ shape: "cube", color: PALETTE.amber, size: 0.45, seed: 2, steam: false });
  goal.group.position.set(1.5, 0, -0.2);
  const jump = kit.trail([[-0.9, 0.2, 0.4], [0.2, 1.7, 0.2], [1.5, 0.3, -0.2]], { color: PALETTE.amber, length: 1, dim: 0 });
  scene.add(hero.group, line, goal.group, jump.object);
  const label = kit.type("ĐƯỜNG TẮT", { y: 300, start: kit.beat("shortcut"), glowColor: PALETTE.amber });
  const lineAt = kit.beat("line");
  const cutAt = kit.beat("shortcut");
  function update(t) {
    kit.dolly(camera, t, { from: [0.2, 3.2, 11.5], to: [0.2, 2.5, 9.4], look: [0.2, 0.3, 0], dur: 8.5 });
    line.scale.z = Math.max(0.001, kit.ease(kit.progress(t, lineAt - 0.2, 0.9), "out"));
    hero.update(t, { popAt: 0.15, hop: cutAt, look: t > lineAt ? [0.9, -0.3] : undefined });
    goal.update(t, { popAt: 0.5 });
    jump.update(t, kit.progress(t, cutAt, 0.6));
    label.update(t);
  }
  return { scene, camera, update, hero: hero.body };
}
