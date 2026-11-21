// Vignette 18: Final ocean convoy pullback with container ship, sailing escort, fleet, and 80 km callout.
import { clipper } from "./clipper/clipper.js";
import { containerShip } from "./container-ship/container-ship.js";
import { skiff } from "./skiff/skiff.js";
export async function build(kit) {
  const scene = await kit.stage({ ground: false, shadow: { size: 1024, range: 28 } });
  const camera = kit.camera(38);
  const sea = kit.ocean({ size: 180, segments: 96, amp: 0.9 });
  const boats = kit.fleet({
    geometry: skiff(kit).geometry,
    count: 14,
    area: [44, 52],
    direction: [0.15, -1.0],
    speed: 1.35,
    heightAt: sea.heightAt,
    seed: 118,
  });
  const cargo = containerShip(kit, {
    length: 9.2,
    beam: 2.3,
    seed: 119,
    from: [0, 0, 2.5],
    to: [0, 0, -3.5],
    dur: 3.0,
    heightAt: sea.heightAt,
  });
  const escort = await clipper(kit, {
    scale: 0.4,
    from: [5.5, 0, 3.0],
    to: [4.8, 0, -2.5],
    dur: 3.0,
    heightAt: sea.heightAt,
  });
  scene.add(sea.object, boats.object, cargo.group, escort.group);

  kit.callout({
    from: 0,
    to: 80,
    unit: " km",
    label: "Chiều dài toàn tuyến kênh",
    x: 540,
    y: 255,
    start: 0.15,
    dur: 1.9,
  });

  function update(t) {
    kit.drone(camera, t, {
      from: [-4.5, 9.8, 25.0],
      to: [-7.5, 13.8, 30.5],
      lookFrom: [0, 6.5, 0],
      lookTo: [0, 6.8, -1.0],
      dur: 3.0,
    });
    sea.update(t);
    boats.update(t);
    cargo.update(t);
    escort.update(t);
  }
  return { scene, camera, update, hero: cargo.group };
}
