// Vignette 8: Ground-level dolly beside excavation workers and textured earth/rock spoil mounds.
export async function build(kit) {
  const { THREE } = kit;
  const scene = await kit.stage({ ground: false, shadow: { size: 1024, range: 22 } });
  const camera = kit.camera(38);
  const land = await kit.terrain({
    seed: 55,
    size: 76,
    segments: 76,
    elevation: 2.2,
    baseHeight: 0.6,
    waterLevel: -10.0,
    river: false,
    lake: false,
    cutWalls: true,
    rocks: false,
    cut: { center: [0, 6], width: 14, length: 26, depth: -9.5, bank: 2.2 },
  });
  const [earthTex, rockTex] = await Promise.all([
    kit.loadTexture("./assets/terra3d/textures/ground-red-earth.webp", { repeat: [3, 3] }),
    kit.loadTexture("./assets/terra3d/textures/ground-rock.webp", { repeat: [2, 2] }),
  ]);

  const crew = new THREE.Group();
  const baseY = land.heightAt(0, 0);
  const mound = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 1.3, 7),
    kit.matte("#FFFFFF", { map: earthTex }),
  );
  mound.position.set(1.2, baseY + 0.65, -0.6);
  mound.castShadow = true;
  mound.receiveShadow = true;

  const boulder = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.65, 0),
    kit.matte("#FFFFFF", { map: rockTex }),
  );
  boulder.position.set(-1.5, baseY + 0.45, -0.3);
  boulder.castShadow = true;

  const w1 = await kit.human({
    model: "Knight.glb",
    clip: "Walking_A",
    scale: 1.0,
    shirtColor: "#F27D24",
    position: [-0.6, baseY, 0.7],
    rotationY: 0.4,
  });
  const w2 = await kit.human({
    model: "Mage.glb",
    clip: "Interact",
    scale: 1.0,
    shirtColor: "#2E7CC4",
    position: [0.5, baseY, 0.6],
    rotationY: -0.5,
  });

  crew.add(mound, boulder, w1.object, w2.object);
  scene.add(land.object, crew);

  function update(t) {
    kit.ground(camera, t, {
      from: [-3.5, baseY + 5.0, 24.5],
      to: [1.8, baseY + 4.8, 22.8],
      lookFrom: [0.3, baseY - 2.3, 0],
      lookTo: [0.3, baseY - 2.3, 0],
      dur: 2.4,
    });
    land.update(t);
    w1.update(t);
    w2.update(t);
  }
  return { scene, camera, update, hero: crew };
}
