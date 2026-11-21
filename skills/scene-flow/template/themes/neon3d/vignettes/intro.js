// Sentence 1: a line on the ground, and the agent that hops over it to a reward crystal.
import { agentBot } from "./agent-bot/agent-bot.js";
import { rewardCore } from "./reward-core/reward-core.js";

export function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = kit.stage();
  const camera = kit.camera(40);
  const bot = agentBot(kit, { color: PALETTE.violet, eyeColor: PALETTE.cyan, seed: 1 });
  bot.group.position.set(-0.5, 0, 0.4);
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 9), kit.glow(PALETTE.magenta, 3));
  line.position.set(0.15, 0.02, -3.6);
  const goal = rewardCore(kit, { color: PALETTE.amber, beamColor: PALETTE.magenta, radius: 0.35 });
  goal.group.position.set(1.5, 0, -0.2);
  const jump = kit.trail([[-0.9, 0.6, 0.4], [0.2, 2.2, 0.2], [1.5, 0.8, -0.2]], { color: PALETTE.amber, length: 1, dim: 0 });
  scene.add(bot.group, line, goal.group, jump.object);
  const label = kit.type("ĐƯỜNG TẮT", { y: 300, start: kit.beat("shortcut"), glowColor: PALETTE.amber });
  const lineAt = kit.beat("line");
  const cutAt = kit.beat("shortcut");
  function update(t) {
    kit.dolly(camera, t, { from: [0.2, 3.2, 11.5], to: [0.2, 2.5, 9.4], look: [0.2, 0.6, 0], dur: 8.5 });
    line.scale.z = Math.max(0.001, kit.ease(kit.progress(t, lineAt - 0.2, 0.9), "out"));
    bot.update(t, { popAt: 0.15, hop: cutAt, look: t > lineAt ? [0.9, -0.3] : undefined });
    goal.group.scale.setScalar(Math.max(0.0001, kit.pop(t, 0.5)));
    goal.update(t);
    jump.update(t, kit.progress(t, cutAt, 0.6));
    label.update(t);
  }
  return { scene, camera, update, hero: bot.hero };
}
