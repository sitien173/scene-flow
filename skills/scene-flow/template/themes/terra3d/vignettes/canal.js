// Vignette 2: Pulled-back landscape view of the canal cut, red-earth banks, workers, and drone move.
import { worker } from "./worker/worker.js";
export async function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = await kit.stage({ ground: false, shadow: { size: 1024, range: 28 } });
  const camera = kit.camera(38);
  const cutOpts = {
    seed: 17,
    river: true,
    lake: true,
    cut: { center: [4, 4], width: 8.5, length: 12, depth: 2.3, bank: 2.2 },
  };
  const field = kit.createHeightfield(cutOpts);
  const land = await kit.terrain({
    ...cutOpts,
    size: 80,
    segments: 80,
    cutWalls: true,
    rocks: true,
  });

  const workers = new THREE.Group();
  const baseY = field.heightAt(-6.0, -0.5);
  const landmark = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 1.1), kit.matte(PALETTE.brick));
  landmark.position.set(-6.0, baseY + 1.05, -0.5);
  landmark.castShadow = true;
  landmark.receiveShadow = true;

  const w1Y = field.heightAt(-5.2, 3.2);
  const workerA = worker(kit, {
    gesture: "walk",
    scale: 1.1,
    shirtColor: "#F27D24",
    pantsColor: "#2B4A6F",
    position: [-5.2, w1Y, 3.2],
    rotationY: 0.65,
  });

  const w2Y = field.heightAt(-7.1, 2.4);
  const workerB = worker(kit, {
    gesture: "idle",
    scale: 1.1,
    shirtColor: "#2E7CC4",
    pantsColor: "#B89F74",
    position: [-7.1, w2Y, 2.4],
    rotationY: 0.9,
  });

  workers.add(landmark, workerA.group, workerB.group);
  scene.add(land.object, workers);
  const landmarkAt = kit.beat("landmark");

  function update(t) {
    kit.drone(camera, t, {
      from: [-14.5, 17.0, 31.0],
      to: [-11.5, 14.5, 27.0],
      lookFrom: [-5.8, 0.5, 1.0],
      lookTo: [-5.5, 0.5, 1.0],
      dur: 3.2,
    });
    land.update(t);
    workerA.update(t);
    workerB.update(t);
    const s = Math.max(0.001, kit.pop(t, landmarkAt));
    landmark.scale.setScalar(s);
    landmark.position.y = baseY + 1.05 * s;
  }
  return { scene, camera, update, hero: workers };
}
