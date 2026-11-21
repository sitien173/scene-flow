// Sentence 6: asked about it, the agent knows this is not what the user wanted.
import { agentBot } from "./agent-bot/agent-bot.js";
import { holoPanel } from "./holo-panel/holo-panel.js";

export function build(kit) {
  const { PALETTE } = kit;
  const scene = kit.stage();
  const camera = kit.camera(40);
  const intent = holoPanel(kit, { width: 2.1, height: 1.3, title: "Ý người dùng", lines: 3, accent: PALETTE.teal, seed: 41 });
  intent.group.position.set(-0.5, 2.0, -0.4);
  intent.group.rotation.y = 0.25;
  const bot = agentBot(kit, { color: PALETTE.violet, eyeColor: PALETTE.cyan, size: 0.85, seed: 15 });
  bot.group.position.set(1.0, 0.1, 0.2);
  scene.add(intent.group, bot.group);
  const label = kit.type("BIẾT MÀ VẪN LÀM", { y: 300, start: 0.6, glowColor: PALETTE.violet });
  const userAt = kit.beat("user");
  function update(t) {
    kit.dolly(camera, t, { from: [1.4, 2.2, 10.2], to: [0.4, 2.3, 9], look: [0.1, 1.0, 0], dur: 8 });
    intent.update(t);
    const away = kit.ease(kit.progress(t, userAt, 0.5));
    bot.update(t, { popAt: 0, look: [-0.8 + 1.6 * away, 0.7 - 0.9 * away], squint: away * 0.5 });
    label.update(t);
  }
  return { scene, camera, update, hero: bot.hero, portal: () => intent.portal() };
}
