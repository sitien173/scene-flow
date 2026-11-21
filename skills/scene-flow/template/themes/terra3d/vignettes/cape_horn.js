// Vignette 4: Southern ocean swells with custom oceanMaterial band, gerstnerAt buoy, GLB clipper, dolly, and callout.
import { clipper } from "./clipper/clipper.js";
export async function build(kit) {
  const { THREE } = kit;
  const scene = await kit.stage({ ground: false, shadow: { size: 1024, range: 24 } });
  const camera = kit.camera(38);
  const sea = kit.ocean({ size: 180, segments: 96, amp: 1.35 });
  const crestMat = kit.oceanMaterial({ amp: 1.35, deepColor: "#0A3A5A", shallowColor: "#4AB3E8" });
  const crestGeom = new THREE.PlaneGeometry(32, 8, 32, 8);
  crestGeom.rotateX(-Math.PI / 2);
  const crestBand = new THREE.Mesh(crestGeom, crestMat);
  crestBand.position.set(0, 0.04, -9);

  const ship = await clipper(kit, {
    scale: 0.48,
    from: [-2.8, 0, 1.2],
    to: [2.2, 0, -1.2],
    dur: 2.0,
    heightAt: (x, z, time) => kit.heightAt(x, z, time, { amp: 1.35 }),
  });

  const buoy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 0.9, 8),
    kit.matte("#F27D24"),
  );
  scene.add(sea.object, crestBand, ship.group, buoy);

  kit.callout({
    from: 8000,
    to: 13000,
    unit: " km",
    label: "Quãng đường rút ngắn",
    x: 540,
    y: 255,
    start: 0.1,
    dur: 1.4,
  });

  function update(t) {
    kit.dolly(camera, t, {
      from: [-5.0, 10.5, 33.0],
      to: [3.0, 10.2, 31.0],
      look: [0, 7.8, 0],
      dur: 2.0,
    });
    sea.update(t);
    crestMat.uniforms.uTime.value = t;
    ship.update(t);
    const wavePt = kit.gerstnerAt(3.2, 2.0, t, { waves: kit.WAVES, amp: 1.35 });
    buoy.position.set(wavePt.x, wavePt.y + 0.3, wavePt.z);
  }
  return { scene, camera, update, hero: ship.group };
}
