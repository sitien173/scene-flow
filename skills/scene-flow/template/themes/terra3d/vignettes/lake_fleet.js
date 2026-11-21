// Vignette 10: Top-down highland lake crossing with fleet and terrain-checked marker buoys.
import { containerShip } from "./container-ship/container-ship.js";
import { skiff } from "./skiff/skiff.js";
export async function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = await kit.stage({ ground: false, shadow: { size: 1024, range: 26 } });
  const camera = kit.camera(38);
  const sea = kit.ocean({ size: 180, segments: 96, amp: 0.45 });
  const boats = kit.fleet({
    geometry: skiff(kit).geometry,
    count: 14,
    area: [28, 34],
    direction: [0.0, -1.0],
    speed: 1.15,
    heightAt: sea.heightAt,
    seed: 91,
  });

  const lead = containerShip(kit, {
    length: 6.4,
    beam: 1.9,
    seed: 44,
    from: [-1.0, 0, -2.5],
    to: [-1.0, 0, -4.6],
    dur: 2.4,
    heightAt: sea.heightAt,
  });

  // Sample terrain elevation at an island shoulder for buoy placement.
  const islandH = kit.terrainHeight(14, -6, { seed: 91 });
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 3.8, Math.max(1.2, Math.abs(islandH) + 1.0), 8),
    kit.matte(PALETTE.grass),
  );
  island.position.set(5.4, 0.3, -5.0);
  island.receiveShadow = true;

  scene.add(sea.object, boats.object, lead.group, island);

  function update(t) {
    const u = kit.clamp01(t / 2.4);
    kit.topdown(camera, t, {
      from: [0, 32, 2.5],
      to: [0, 30, 0.5],
      lookFrom: [0, 0, kit.lerp(2.2, 1.0, u)],
      lookTo: [0, 0, 0.4],
      dur: 2.4,
    });
    sea.update(t);
    boats.update(t);
    lead.update(t);
  }
  return { scene, camera, update, hero: lead.group };
}
