// Backdrop vignette builder: photo plate, shadow-receiving floor, and one shadow-casting light.
import * as THREE from "three";
import { PALETTE } from "./look.js";

export function createBackdrop(scene, options = {}) {
  if (scene && !scene.isScene && typeof scene === "object") {
    options = { ...options, ...scene };
    scene = options.scene || null;
  }
  const {
    image,
    plateWidth = 5.6,
    plateHeight = 10.0,
    plateZ = -3.6,
    plateY = 0.6,
    shadowOpacity = 0.36,
    lightPos = [3.0, 6.5, 4.2],
    loader = null,
  } = options;

  if (!image || typeof image !== "string") {
    throw new Error("atlas3d backdrop: image path is required");
  }

  const group = new THREE.Group();
  group.name = "atlas3d-backdrop";

  const plateMat = new THREE.MeshBasicMaterial({ color: "#FFFFFF", toneMapped: false });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(plateWidth, plateHeight), plateMat);
  plate.position.set(0, plateY, plateZ);
  plate.castShadow = false;
  plate.receiveShadow = false;
  group.add(plate);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10),
    new THREE.ShadowMaterial({ color: PALETTE.ink, opacity: shadowOpacity }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.castShadow = false;
  floor.receiveShadow = true;
  group.add(floor);

  const hemiLight = new THREE.HemisphereLight("#FFF9EC", "#706658", 1.1);
  const shadowLight = new THREE.DirectionalLight("#FFF5DF", 1.85);
  shadowLight.position.set(lightPos[0], lightPos[1], lightPos[2]);
  shadowLight.castShadow = true;
  shadowLight.shadow.mapSize.set(1024, 1024);
  shadowLight.shadow.camera.left = -4;
  shadowLight.shadow.camera.right = 4;
  shadowLight.shadow.camera.top = 4;
  shadowLight.shadow.camera.bottom = -4;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 20;
  shadowLight.shadow.bias = -0.0005;
  shadowLight.shadow.normalBias = 0.02;
  group.add(hemiLight, shadowLight, shadowLight.target);

  if (scene) {
    if (!scene.background) scene.background = new THREE.Color(PALETTE.paper);
    scene.add(group);
  }

  const texLoader = loader || new THREE.TextureLoader();
  const ready = texLoader.loadAsync(image).then(
    tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      plateMat.map = tex;
      plateMat.needsUpdate = true;
    },
    error => {
      throw new Error("atlas3d backdrop: failed to load " + image + ": " + (error && error.message ? error.message : error));
    },
  );

  return { group, plate, floor, shadowLight, hemiLight, ready, image };
}
