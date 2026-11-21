// Vignette 3: Gerstner ocean with fleet, GLB sailing ship, and container ship under orbit in lower zone.
import { clipper } from "./clipper/clipper.js";
import { containerShip } from "./container-ship/container-ship.js";
import { skiff } from "./skiff/skiff.js";
export async function build(kit) {
  const scene = await kit.stage({ ground: false, shadow: { size: 1024, range: 28 } });
  const camera = kit.camera(38);
  const sea = kit.ocean({ size: 180, segments: 96, amp: 1.0 });
  const boats = kit.fleet({
    geometry: skiff(kit).geometry,
    count: 10,
    area: [44, 48],
    direction: [0.22, 1.0],
    speed: 1.25,
    heightAt: sea.heightAt,
    seed: 37,
  });
  const cargo = containerShip(kit, {
    length: 10.0,
    beam: 2.5,
    seed: 71,
    from: [0.5, 0, 1.8],
    to: [0.5, 0, -3.2],
    dur: 3.2,
    heightAt: sea.heightAt,
  });
  const escort = await clipper(kit, {
    scale: 0.42,
    from: [-6.5, 0, 4.0],
    to: [-5.5, 0, -2.0],
    dur: 3.2,
    heightAt: sea.heightAt,
  });
  scene.add(sea.object, boats.object, cargo.group, escort.group);

  kit.beat("ship");
  function update(t) {
    kit.orbit(camera, t, {
      center: [0, 1.2, 0],
      radius: 29.5,
      fromHeight: 11.5,
      toHeight: 9.5,
      fromAngle: -0.45,
      toAngle: 0.25,
      look: [0, 7.2, 0],
      dur: 3.2,
    });
    sea.update(t);
    boats.update(t);
    cargo.update(t);
    escort.update(t);
  }
  return { scene, camera, update, hero: cargo.group };
}
