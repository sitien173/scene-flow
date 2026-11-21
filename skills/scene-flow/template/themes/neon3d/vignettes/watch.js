// Sentence 9: reading what the AI is thinking may be one of the few monitoring tools left.
import { rewardCore } from "./reward-core/reward-core.js";
import { thoughtGraph } from "./thought-graph/thought-graph.js";
import { holoPanel } from "./holo-panel/holo-panel.js";

export function build(kit) {
  const { PALETTE } = kit;
  const scene = kit.stage({ fog: "#0F0A2C", top: "#24145E" });
  const camera = kit.camera(40);
  const core = rewardCore(kit, { color: PALETTE.cyan, beamColor: PALETTE.violet, radius: 0.55 });
  const graph = thoughtGraph(kit, { color: PALETTE.teal, accent: PALETTE.amber, nodes: 14, radius: 0.95, center: [0, 2.35, 0], seed: 23 });
  const screens = [-1, 1].map((side, k) => {
    const win = holoPanel(kit, { width: 1.3, height: 0.9, title: k ? "Monitor" : "CoT", lines: 3, accent: k ? PALETTE.amber : PALETTE.cyan, seed: 50 + k });
    win.group.position.set(side * 1.35, 1.7, 0.2);
    win.group.rotation.y = -side * 0.45;
    scene.add(win.group);
    return win;
  });
  scene.add(core.group, graph.group);
  const label = kit.type("GIÁM SÁT", { y: 300, start: kit.beat("tool"), glowColor: PALETTE.cyan });
  const readAt = kit.beat("read");
  function update(t) {
    kit.orbit(camera, t, { center: [0, 1.6, 0], radius: 10.5, height: 1.1, angle: -0.3, speed: 0.07, look: [0, 0.4, 0] });
    core.update(t);
    graph.update(t, { lit: 0.3 + 0.7 * kit.ease(kit.progress(t, readAt, 0.8)) });
    screens.forEach((win, k) => { win.update(t + k); win.group.scale.setScalar(Math.max(0.0001, kit.pop(t, readAt + 0.2 * k))); });
    label.update(t);
  }
  return { scene, camera, update, hero: graph.hero };
}
