// Sentence 2: an evaluator hands models coding tasks that are scored automatically.
export function build(kit) {
  const { PALETTE } = kit;
  const scene = kit.stage({ fog: "#130B33" });
  const camera = kit.camera(38);
  const desk = kit.laptop({ color: PALETTE.violet, accent: PALETTE.teal, width: 1.7, seed: 4 });
  desk.group.position.set(0.3, 0, 0);
  const task = kit.uiWindow({ width: 2, height: 1.25, title: "Task 01", lines: 4, accent: PALETTE.cyan, seed: 21 });
  task.group.position.set(-0.6, 2.25, -0.6);
  const score = kit.uiWindow({ width: 1.3, height: 0.95, title: "Score", lines: 1, accent: PALETTE.teal, badge: "PASS", seed: 22 });
  score.group.position.set(1.1, 1.75, 0.3);
  const hero = kit.blob({ shape: "bean", color: PALETTE.cyan, size: 0.8, seed: 3 });
  hero.group.position.set(-0.9, 0, 0.6);
  scene.add(desk.group, task.group, score.group, hero.group);
  const label = kit.type("METR · 2025", { y: 300, start: 0.2, glowColor: PALETTE.cyan });
  const taskAt = kit.beat("task");
  const scoreAt = kit.beat("score");
  function update(t) {
    kit.orbit(camera, t, { center: [0, 1.15, 0], radius: 9, height: 1.9, angle: -0.35, speed: 0.06, look: [0, -0.1, 0] });
    desk.update(t, { open: kit.ease(kit.progress(t, 0.1, 1.2), "out") });
    task.group.scale.setScalar(Math.max(0.0001, kit.pop(t, taskAt - 0.1)));
    task.update(t);
    score.group.scale.setScalar(Math.max(0.0001, kit.pop(t, scoreAt)));
    hero.update(t, { popAt: 0, look: t > scoreAt ? [0.9, 0.3] : [0.6, 0.6] });
    label.update(t);
  }
  return { scene, camera, update, hero: hero.body };
}
