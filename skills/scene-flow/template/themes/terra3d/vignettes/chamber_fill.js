// Vignette 14: Container ship rising inside the cutaway lock chamber under orbit.
import { containerShip } from "./container-ship/container-ship.js";
export async function build(kit) {
  const scene = await kit.stage({
    ground: false,
    fog: "#A9D5F2",
    near: 30,
    far: 105,
    shadow: { size: 1024, range: 24 },
  });
  const camera = kit.camera(38);
  const fillSpec = { x: 0, width: 5.8, from: 0.45, to: 2.25, start: 0.2, dur: 2.6, curve: "inOut" };
  const cut = await kit.cutaway({
    width: 7.4,
    depth: 4.4,
    baseY: -1.6,
    wallHeight: 2.7,
    chambers: [fillSpec],
  });
  const ship = containerShip(kit, {
    length: 4.6,
    beam: 1.5,
    hullHeight: 0.65,
    rows: 3,
    cols: 2,
    layers: 2,
    seed: 88,
    rotationY: Math.PI * 0.5,
    position: [0, cut.deckY + 0.4, 0.2],
  });
  scene.add(cut.object, ship.group);

  kit.callout({
    from: 0,
    to: 33,
    unit: " m",
    label: "Bề rộng buồng âu",
    x: 540,
    y: 255,
    start: 0.1,
    dur: 2.4,
  });

  function update(t) {
    const u = kit.ease(kit.progress(t, 0.2, 2.6), "inOut");
    const lvl = kit.chamberLevel(t, fillSpec);
    kit.countValue(t, { from: 0, to: 33, start: 0.1, dur: 2.4 });
    kit.orbit(camera, t, {
      center: [0, 5.7, 0],
      radius: 26.5,
      fromHeight: 3.5,
      toHeight: 4.1,
      fromAngle: -0.32,
      toAngle: 0.32,
      look: [0, 5.7, 0],
      dur: 3.2,
    });
    cut.update(t);
    ship.group.position.y = cut.deckY + lvl - 0.18 + u * 0.05;
    ship.update(t);
  }
  return { scene, camera, update, hero: cut.object };
}
