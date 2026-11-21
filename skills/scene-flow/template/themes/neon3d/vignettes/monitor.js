// Sentence 7: the chain of thought as a graph; a penalty pulse hits the cheating thoughts.
import { agentBot } from "./agent-bot/agent-bot.js";
import { thoughtGraph } from "./thought-graph/thought-graph.js";

export function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = kit.stage({ fog: "#0E0A30", top: "#16205A" });
  const camera = kit.camera(40);
  const graph = thoughtGraph(kit, { color: PALETTE.cyan, accent: PALETTE.magenta, nodes: 16, radius: 0.95, center: [0, 1.9, 0], seed: 17 });
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 96), kit.glow(PALETTE.red, 2.6, { opacity: 1 }));
  pulse.position.set(0, 1.9, 0);
  const bot = agentBot(kit, { color: PALETTE.teal, eyeColor: PALETTE.cyan, size: 0.55, seed: 18 });
  bot.group.position.set(0, 0, 0.8);
  scene.add(graph.group, pulse, bot.group);
  const label = kit.type("CHUỖI LẬP LUẬN", { y: 300, start: 0.5, glowColor: PALETTE.cyan });
  const punishAt = kit.beat("punish");
  function update(t) {
    kit.orbit(camera, t, { center: [0, 1.5, 0], radius: 10, height: 1.2, angle: 0.4, speed: -0.12, look: [0, 0.55, 0] });
    graph.update(t);
    const p = kit.progress(t, punishAt, 1.1);
    pulse.visible = p > 0 && p < 1;
    pulse.scale.setScalar(0.2 + 2.2 * kit.ease(p, "out"));
    pulse.material.opacity = 1 - p;
    pulse.lookAt(camera.position);
    bot.update(t, { popAt: 0.3, look: [0, 0.9], squint: p > 0 && p < 1 ? 1 - p : 0 });
    label.update(t);
  }
  return { scene, camera, update, hero: graph.hero };
}
