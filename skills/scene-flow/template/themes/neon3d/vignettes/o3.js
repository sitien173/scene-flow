// Sentence 5: one test, run after run; every server tower turns red.
import { agentBot } from "./agent-bot/agent-bot.js";
import { serverTower } from "./server-tower/server-tower.js";

export function build(kit) {
  const { PALETTE } = kit;
  const scene = kit.stage({ fog: "#170A26" });
  const camera = kit.camera(40);
  const towers = [-1.25, 0, 1.25].map((x, k) => {
    const tower = serverTower(kit, { units: 8, color: PALETTE.violet, ledColor: PALETTE.teal, alertColor: PALETTE.red, seed: 30 + k });
    tower.group.position.set(x, 0, -0.8 - Math.abs(x) * 0.4);
    tower.group.rotation.y = -x * 0.25;
    scene.add(tower.group);
    return tower;
  });
  const bot = agentBot(kit, { color: PALETTE.red, eyeColor: PALETTE.amber, size: 0.6, seed: 14 });
  bot.group.position.set(0, 0, 1.3);
  scene.add(bot.group);
  const label = kit.type("MỌI LẦN CHẠY", { y: 300, start: kit.beat("every"), glowColor: PALETTE.red });
  const everyAt = kit.beat("every");
  function update(t) {
    kit.dolly(camera, t, { from: [0, 2.0, 11], to: [0, 2.4, 9.4], look: [0, 0.2, 0], dur: 6 });
    const alert = kit.progress(t, 0.6, everyAt - 0.4);
    towers.forEach(tower => tower.update(t, { alert }));
    bot.update(t, { popAt: 0.2, look: [0, -0.4], squint: alert });
    label.update(t);
  }
  return { scene, camera, update, hero: bot.hero };
}
