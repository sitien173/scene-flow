// Sentence 4: the reward core, and a blob soaking up points it did not earn.
export function build(kit) {
  const { PALETTE } = kit;
  const scene = kit.stage({ fog: "#1A0B2E", top: "#3A1050" });
  const camera = kit.camera(40);
  const core = kit.hexCore({ color: PALETTE.amber, beamColor: PALETTE.magenta, radius: 0.8 });
  const points = kit.pixels({ color: PALETTE.amber, count: 40, origin: [0, 1.6, 0], spread: 1.1, height: 3.2, size: 0.09, speed: 0.3, seed: 12 });
  const hero = kit.blob({ shape: "bowl", color: PALETTE.magenta, size: 0.9, seed: 9 });
  hero.group.position.set(0.7, 0, 1.0);
  scene.add(core.group, points.object, hero.group);
  const label = kit.type("REWARD HACKING", { y: 300, start: kit.beat("name"), glowColor: PALETTE.amber });
  const cheatAt = kit.beat("cheat");
  function update(t) {
    kit.dolly(camera, t, { from: [-1.2, 2.5, 9.2], to: [-0.4, 2.3, 10.6], look: [0.2, 0.15, 0], dur: 5.6, curve: "out" });
    core.update(t, { power: t > cheatAt ? 1.4 : 1 });
    points.update(t);
    hero.update(t, { popAt: 0.4, look: [-0.8, 0.5], squint: t > cheatAt ? 0.6 : 0 });
    label.update(t);
  }
  return { scene, camera, update, hero: hero.body };
}
