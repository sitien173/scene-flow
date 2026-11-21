// Sentence 2: an evaluator hands the agent coding tasks that are scored automatically.
import { agentBot } from "./agent-bot/agent-bot.js";
import { holoPanel } from "./holo-panel/holo-panel.js";

export function build(kit) {
  const { PALETTE } = kit;
  const scene = kit.stage({ fog: "#130B33" });
  const camera = kit.camera(38);
  const task = holoPanel(kit, { width: 1.5, height: 0.95, title: "Task 01", lines: 4, accent: PALETTE.cyan, seed: 21 });
  task.group.position.set(-0.3, 1.85, -1.0);
  const score = holoPanel(kit, { width: 1.3, height: 0.95, title: "Score", accent: PALETTE.teal, stamp: "PASS", seed: 22 });
  score.group.position.set(1.2, 1.6, 0.3);
  score.group.rotation.y = -0.3;
  const bot = agentBot(kit, { color: PALETTE.cyan, eyeColor: PALETTE.teal, size: 0.85, seed: 3 });
  bot.group.position.set(-0.55, 0, 0.6);
  scene.add(task.group, score.group, bot.group);
  const label = kit.type("METR · 2025", { y: 300, start: 0.2, glowColor: PALETTE.cyan });
  const taskAt = kit.beat("task");
  const scoreAt = kit.beat("score");
  function update(t) {
    kit.orbit(camera, t, { center: [0, 1.15, 0], radius: 9, height: 1.9, angle: -0.35, speed: 0.06, look: [0, -0.1, 0] });
    task.group.scale.setScalar(Math.max(0.0001, kit.pop(t, taskAt - 0.1)));
    task.update(t);
    score.group.scale.setScalar(Math.max(0.0001, kit.pop(t, scoreAt)));
    score.update(t);
    bot.update(t, { popAt: 0, look: t > scoreAt ? [0.9, 0.3] : [0.6, 0.8], cheer: kit.ease(kit.progress(t, scoreAt + 0.2, 0.4)) });
    label.update(t);
  }
  return { scene, camera, update, hero: bot.hero };
}
