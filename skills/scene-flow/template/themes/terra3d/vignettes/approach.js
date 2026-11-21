// Vignette 12: Low water-level ground dolly as a container ship approaches the lock channel.
import { containerShip } from "./container-ship/container-ship.js";
export async function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = await kit.stage({ ground: false, shadow: { size: 1024, range: 26 } });
  const camera = kit.camera(38);
  const sea = kit.ocean({ size: 180, segments: 96, amp: 0.45 });

  const wallMat = kit.matte(PALETTE.stone);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 16), wallMat);
  leftWall.position.set(-4.2, 0.8, -8);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 16), wallMat);
  rightWall.position.set(4.2, 0.8, -8);

  const ship = containerShip(kit, {
    length: 8.6,
    beam: 2.3,
    seed: 105,
    from: [0, 0, 2.5],
    to: [0, 0, -2.5],
    dur: 2.4,
    heightAt: sea.heightAt,
  });

  scene.add(sea.object, leftWall, rightWall, ship.group);

  kit.pill({ text: "Cửa âu", at: [0, 8.2, -4.5], offset: [0, 0], start: 0.2 });

  function update(t) {
    const camPos = kit.clamp01(t / 2.4);
    kit.ground(camera, t, {
      from: [-3.8, 4.4, 24.5],
      to: [2.6, 4.2, 23.0 - camPos * 1.0],
      lookFrom: [0, 5.2, 0],
      lookTo: [0, 5.2, -1],
      dur: 2.4,
    });
    sea.update(t);
    ship.update(t);
    kit.projectPoint(ship.group.position, camera);
  }
  return { scene, camera, update, hero: ship.group };
}
