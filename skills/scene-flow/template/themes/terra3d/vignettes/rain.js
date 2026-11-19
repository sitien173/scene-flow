// Vignette 7: Rain, insect swarm, red-earth cut terrain, and dry-bank locomotive under crane rise.
export async function build(kit) {
  const { THREE, PALETTE } = kit;
  const scene = await kit.stage({
    ground: false,
    fog: "#90B4CE",
    near: 36,
    far: 110,
    sunIntensity: 1.85,
    hemiIntensity: 0.85,
    shadow: { size: 1024, range: 26 },
  });
  const camera = kit.camera(38);
  const land = await kit.terrain({
    seed: 42,
    size: 80,
    segments: 80,
    river: true,
    lake: false,
    cutWalls: true,
    rocks: true,
    cut: { center: [0, 0], width: 10, length: 12, depth: 2.5, bank: 2.0 },
  });
  const stormRain = kit.rain({
    count: 420,
    area: [26, 26],
    height: 18,
    speed: 19,
    slant: 0.14,
    seed: 11,
  });
  const insects = kit.swarm({
    count: 90,
    origin: [-1.5, 2.2, 0],
    radius: [3.4, 1.1, 3.4],
    seed: 23,
  });

  // Place rail embankment above water level along the solid cut bank so the locomotive reads clearly.
  const railX = 6.2;
  const pierY = Math.max(land.heightAt(railX, 0), land.waterLevel + 1.2);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 15.5), kit.matte(PALETTE.stone));
  pier.position.set(railX, pierY - 0.5, 0);
  pier.receiveShadow = true;
  pier.castShadow = true;

  const train = kit.locomotive({
    cars: 1,
    from: [railX, pierY + 0.2, 4.0],
    to: [railX, pierY + 0.2, -2.5],
    dur: 3.2,
  });
  scene.add(land.object, stormRain.object, insects.object, pier, train.object);

  kit.beat("storm");
  function update(t) {
    kit.crane(camera, t, {
      from: [-4.5, 10.2, 22.0],
      to: [1.5, 13.8, 24.5],
      lookFrom: [5.4, pierY + 4.4, 0.8],
      lookTo: [5.4, pierY + 4.6, -1.0],
      dur: 3.2,
    });
    land.update(t);
    stormRain.update(t);
    insects.update(t);
    train.update(t);
  }
  return { scene, camera, update, hero: train.object };
}
