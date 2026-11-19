// Sentence 5: one test, run after run; every rack turns red.
export function build(kit) {
  const { PALETTE } = kit;
  const scene = kit.stage({ fog: "#170A26" });
  const camera = kit.camera(40);
  const racks = [-1.25, 0, 1.25].map((x, k) => {
    const rack = kit.serverRack({ units: 8, color: PALETTE.violet, ledColor: PALETTE.teal, seed: 30 + k });
    rack.group.position.set(x, 0, -0.8 - Math.abs(x) * 0.4);
    rack.group.rotation.y = -x * 0.25;
    scene.add(rack.group);
    return rack;
  });
  const hero = kit.blob({ shape: "bean", color: PALETTE.red, eyeColor: PALETTE.amber, size: 0.6, seed: 14 });
  hero.group.position.set(0, 0, 1.3);
  scene.add(hero.group);
  const label = kit.type("MỌI LẦN CHẠY", { y: 300, start: kit.beat("every"), glowColor: PALETTE.red });
  const everyAt = kit.beat("every");
  function update(t) {
    kit.dolly(camera, t, { from: [0, 2.0, 11], to: [0, 2.4, 9.4], look: [0, 0.2, 0], dur: 6 });
    const alert = kit.progress(t, 0.6, everyAt - 0.4);
    racks.forEach(rack => rack.update(t, { alert }));
    hero.update(t, { popAt: 0.2, look: [0, -0.4], squint: alert });
    label.update(t);
  }
  return { scene, camera, update, hero: hero.body };
}
