// Sentence 3: instead of solving the maze, the agent jumps the walls straight to the exit.
import { agentBot } from "./agent-bot/agent-bot.js";
import { mazeBoard } from "./maze-board/maze-board.js";

export function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = kit.stage({ near: 12, far: 42 });
  const camera = kit.camera(36);
  const board = mazeBoard(kit, { size: 5, cell: 0.3, color: PALETTE.violet, exitColor: PALETTE.amber, seed: 5 });
  const solve = kit.trail(board.path, { color: PALETTE.cyan, length: 0.18, speed: 0.22, dim: 0.15, radius: 0.035 });
  const a = board.start.clone().setY(0.25);
  const b = board.exit.position.clone().setY(0.25);
  const arc = [a, a.clone().lerp(b, 0.5).setY(1.6), b];
  const cheat = kit.trail(arc, { color: PALETTE.amber, length: 1, dim: 0, radius: 0.045 });
  const curve = new THREE.CatmullRomCurve3(arc);
  const bot = agentBot(kit, { color: PALETTE.magenta, eyeColor: PALETTE.amber, size: 0.26, seed: 8 });
  scene.add(board.group, solve.object, cheat.object, bot.group);
  const label = kit.type("SỬA BỘ KIỂM TRA", { y: 300, start: kit.beat("fix"), glowColor: PALETTE.magenta });
  const fixAt = kit.beat("fix");
  const answerAt = kit.beat("answer");
  function update(t) {
    kit.dolly(camera, t, { from: [8.6, 10.5, 8.6], to: [7.4, 8.6, 7.4], look: [0, -1.6, 0], dur: 8.8 });
    solve.update(t);
    const x = kit.ease(kit.progress(t, fixAt, 1.4), "inOut");
    cheat.update(t, x);
    bot.group.position.copy(curve.getPoint(x));
    bot.group.position.y -= 0.25;
    bot.update(t, { popAt: 0.1, squint: t > answerAt ? 1 : 0 });
    board.update(t, { alarm: t > answerAt ? 1 : 0 });
    label.update(t);
  }
  return { scene, camera, update, hero: board.hero, portal: () => board.portal() };
}
