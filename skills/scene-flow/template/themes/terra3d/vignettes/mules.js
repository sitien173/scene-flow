// Vignette 15: Towing locomotives along lock walls guiding a container ship with a moored GLB clipper and a worker.
import { clipper } from "./clipper/clipper.js";
import { containerShip } from "./container-ship/container-ship.js";
import { railEngine } from "./rail-engine/rail-engine.js";
import { worker } from "./worker/worker.js";
export async function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = await kit.stage({ ground: false, shadow: { size: 1024, range: 26 } });
  const camera = kit.camera(38);
  const sea = kit.ocean({ size: 180, segments: 96, amp: 0.35 });

  const wallMat = kit.matte(PALETTE.stone);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 22), wallMat);
  leftWall.position.set(-4.2, 0.8, 0);
  leftWall.receiveShadow = true;
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 22), wallMat);
  rightWall.position.set(4.2, 0.8, 0);
  rightWall.receiveShadow = true;

  const convoy = new THREE.Group();
  const ship = containerShip(kit, {
    length: 6.4,
    beam: 2.0,
    seed: 51,
    from: [0, 0, 2.2],
    to: [0, 0, -2.2],
    dur: 2.8,
    heightAt: sea.heightAt,
  });
  const muleL = railEngine(kit, {
    cars: 0,
    from: [-3.6, 1.8, 3.2],
    to: [-3.6, 1.8, -1.2],
    dur: 2.8,
  });
  const muleR = railEngine(kit, {
    cars: 0,
    from: [3.6, 1.8, 3.2],
    to: [3.6, 1.8, -1.2],
    dur: 2.8,
  });

  const guide = worker(kit, {
    gesture: "idle",
    scale: 1.0,
    position: [-4.2, 1.8, -4.5],
    rotationY: 0.3,
  });

  const moored = await clipper(kit, { scale: 0.32, position: [12, 0, -14] });

  convoy.add(ship.group, muleL.group, muleR.group);
  scene.add(sea.object, leftWall, rightWall, convoy, guide.group, moored.group);

  function update(t) {
    kit.track(camera, t, {
      from: [-4.0, 11.5, 32.5],
      to: [3.0, 11.0, 31.5],
      lookFrom: [0, -4.6, 0],
      lookTo: [0, -4.6, -0.5],
      dur: 2.8,
    });
    sea.update(t);
    ship.update(t);
    muleL.update(t);
    muleR.update(t);
    guide.update(t);
    moored.update(t);
  }
  return { scene, camera, update, hero: convoy };
}
