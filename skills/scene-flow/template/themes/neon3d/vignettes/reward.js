// Sentence 4: the reward crystal, and the agent soaking up points it did not earn.
import { agentBot } from "./agent-bot/agent-bot.js";
import { rewardCore } from "./reward-core/reward-core.js";

export function build(kit) {
  const { PALETTE } = kit;
  const scene = kit.stage({ fog: "#1A0B2E", top: "#3A1050" });
  const camera = kit.camera(40);
  const core = rewardCore(kit, { color: PALETTE.amber, beamColor: PALETTE.magenta, radius: 0.8 });
  const points = kit.pixels({ color: PALETTE.amber, count: 40, origin: [0, 1.9, 0], spread: 1.1, height: 3.2, size: 0.09, speed: 0.3, seed: 12 });
  const bot = agentBot(kit, { color: PALETTE.magenta, eyeColor: PALETTE.amber, size: 0.85, seed: 9 });
  bot.group.position.set(1.0, 0, 1.0);
  scene.add(core.group, points.object, bot.group);
  const label = kit.type("REWARD HACKING", { y: 300, start: kit.beat("name"), glowColor: PALETTE.amber });
  const cheatAt = kit.beat("cheat");
  function update(t) {
    kit.dolly(camera, t, { from: [-1.2, 2.5, 9.2], to: [-0.4, 2.3, 10.6], look: [0.2, 0.5, 0], dur: 5.6, curve: "out" });
    core.update(t, { power: t > cheatAt ? 1.6 : 1 });
    points.update(t);
    bot.update(t, { popAt: 0.4, look: [-0.8, 0.5], squint: t > cheatAt ? 0.6 : 0, cheer: t > cheatAt ? 1 : 0 });
    label.update(t);
  }
  return { scene, camera, update, hero: bot.hero };
}
