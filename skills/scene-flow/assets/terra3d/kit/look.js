// The terra3d look: a daylight stage with equirectangular sky IBL, hemisphere fill, sun, fog, and optional shadow map.
import * as THREE from "three";

export const PALETTE = {
  sky: "#9BD0F5", grass: "#7DB35A", sand: "#E3D3A0", water: "#3F9FD6", stone: "#C9C4B8",
  brick: "#C9694A", steel: "#8A99A8", ink: "#1B2B3A", white: "#FFFFFF", sun: "#FFF1D0",
  earth: "#9C4F36", deepWater: "#0E4C73",
};

const textureCache = new Map();
let skyPromise;

export function canvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Cached texture loader using relative asset URLs; clones share the underlying image source when repeated.
export function loadTexture(url, { colorSpace = THREE.SRGBColorSpace, mapping, wrap = THREE.RepeatWrapping, repeat } = {}) {
  if (!textureCache.has(url)) {
    textureCache.set(url, new THREE.TextureLoader().loadAsync(url).then(tex => {
      tex.colorSpace = colorSpace;
      if (mapping !== undefined) tex.mapping = mapping;
      if (wrap !== undefined) {
        tex.wrapS = wrap;
        tex.wrapT = wrap;
      }
      return tex;
    }));
  }
  return textureCache.get(url).then(base => {
    if (!repeat) return base;
    const tex = base.clone();
    tex.repeat.set(repeat[0], repeat[1]);
    tex.needsUpdate = true;
    return tex;
  });
}

// Cached equirectangular sky map; assigning it to scene.environment engages Three's PMREMGenerator on render/compile.
export function loadSky(url = "./assets/terra3d/env/sky-day.jpg") {
  if (!skyPromise || skyPromise.url !== url) {
    const p = loadTexture(url, {
      colorSpace: THREE.SRGBColorSpace,
      mapping: THREE.EquirectangularReflectionMapping,
      wrap: undefined,
    });
    p.url = url;
    skyPromise = p;
  }
  return skyPromise;
}

// Flat-shaded matte surface: the low-poly daylight material.
export function matte(color = PALETTE.stone, { roughness = 0.9, metalness = 0, flatShading = true, map = null } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading, map });
}

// Unlit color, for thin markers and anything that should ignore the sun.
export function glow(color = PALETTE.white, intensity = 1, { fog = true, opacity = 1 } = {}) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(intensity),
    fog,
    transparent: opacity < 1,
    opacity,
  });
}

// A scene lit by day: equirectangular sky & PMREM IBL, sun + hemisphere fill, distance fog, and at most one shadow light.
export async function stage({
  sky = "./assets/terra3d/env/sky-day.jpg",
  env = true,
  envIntensity = 0.75,
  ground = PALETTE.grass,
  fog = PALETTE.sky,
  near = 28,
  far = 95,
  sunPos = [-10, 18, 12],
  sunIntensity = 2.4,
  hemiIntensity = 0.9,
  shadow = false,
} = {}) {
  const scene = new THREE.Scene();
  const isImagePath = typeof sky === "string" && (sky.includes("/") || sky.includes("."));
  if (isImagePath) {
    const skyTex = await loadSky(sky);
    scene.background = skyTex;
    if (env) {
      scene.environment = skyTex;
      scene.environmentIntensity = envIntensity;
    }
  } else {
    scene.background = new THREE.Color(sky || PALETTE.sky);
    if (env === true) {
      scene.environment = await loadSky();
      scene.environmentIntensity = envIntensity;
    } else if (typeof env === "string") {
      scene.environment = await loadSky(env);
      scene.environmentIntensity = envIntensity;
    }
  }

  if (fog) scene.fog = new THREE.Fog(fog, near, far);

  const groundColor = typeof ground === "string" ? ground : PALETTE.grass;
  const hemi = new THREE.HemisphereLight(PALETTE.white, groundColor, hemiIntensity);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(PALETTE.sun, sunIntensity);
  sun.position.set(sunPos[0], sunPos[1], sunPos[2]);
  if (shadow) {
    const opts = typeof shadow === "object" ? shadow : {};
    const size = Math.min(1024, opts.size || 1024);
    const range = opts.range || 22;
    sun.castShadow = true;
    sun.shadow.mapSize.set(size, size);
    sun.shadow.camera.left = -range;
    sun.shadow.camera.right = range;
    sun.shadow.camera.top = range;
    sun.shadow.camera.bottom = -range;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.0005;
  }
  scene.add(sun);

  if (ground) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), matte(groundColor));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = !!shadow;
    scene.add(floor);
  }

  scene.userData.sun = sun;
  scene.userData.hemi = hemi;
  return scene;
}
