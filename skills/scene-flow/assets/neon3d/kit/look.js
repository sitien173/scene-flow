// The neon look: palette, foggy stage, toon gradient material with rim light, glow and halo.
import * as THREE from "three";

export const PALETTE = {
  violet: "#7C4DFF", magenta: "#FF3DCB", teal: "#14E3B0", cyan: "#3DE8FF", amber: "#FFB23D",
  red: "#FF4D6A", night: "#0B0820", deep: "#120A2A", ink: "#F4F1FF",
};

function canvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let haloTexture;
function haloMap() {
  haloTexture ||= canvasTexture(256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  return haloTexture;
}

// A scene with a vertical gradient sky, distance fog and a dark ground that takes colored halos instead of shadows.
export function stage({ fog = PALETTE.deep, top, bottom = PALETTE.night, near = 10, far = 36, ground = true } = {}) {
  top ||= "#" + new THREE.Color(fog).lerp(new THREE.Color(PALETTE.violet), 0.22).getHexString();
  const scene = new THREE.Scene();
  scene.background = canvasTexture(4, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, top);
    grad.addColorStop(0.5, fog);
    grad.addColorStop(1, bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog(fog, near, far);
  if (ground) {
    // the floor fades out with distance, so no hard horizon line shows against the sky
    const fade = canvasTexture(256, 256, (g, w, h) => {
      const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, "#fff");
      grad.addColorStop(0.45, "#fff");
      grad.addColorStop(1, "#000");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    fade.colorSpace = THREE.NoColorSpace;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshBasicMaterial({
      color: new THREE.Color(bottom).lerp(new THREE.Color(fog), 0.35), alphaMap: fade, transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    scene.add(floor);
    const grid = new THREE.GridHelper(24, 24, fog, fog);
    grid.material.color.set(top).multiplyScalar(0.55);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    scene.add(grid);
  }
  return scene;
}

const VERTEX = /* glsl */`
  #include <common>
  #include <fog_pars_vertex>
  uniform float uBottom;
  uniform float uTop;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  varying float vHeight;
  void main() {
    vec4 localPosition = vec4(position, 1.0);
    vec3 localNormal = normal;
    #ifdef USE_INSTANCING
      localPosition = instanceMatrix * localPosition;
      localNormal = mat3(instanceMatrix) * localNormal;
    #endif
    vec4 worldPosition = modelMatrix * localPosition;
    vHeight = clamp((position.y - uBottom) / max(uTop - uBottom, 1e-3), 0.0, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * localNormal);
    vViewW = cameraPosition - worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const FRAGMENT = /* glsl */`
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform vec3 uRim;
  uniform vec3 uLight;
  uniform float uRimPower;
  uniform float uRimGain;
  uniform float uGlow;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  varying float vHeight;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(vViewW);
    vec3 base = mix(uLow, uHigh, smoothstep(0.0, 1.0, vHeight));
    float lit = dot(n, normalize(uLight)) * 0.5 + 0.5;
    float toon = 0.5 + 0.5 * smoothstep(0.38, 0.62, lit);
    float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), uRimPower);
    gl_FragColor = vec4(base * toon * (1.0 + uGlow) + uRim * rim * uRimGain, 1.0);
    #include <fog_fragment>
  }`;

// Toon gradient material: dark low color to bright high color over the geometry's own height range (bottom..top),
// plus a hot rim that blooms. Works on instanced meshes.
export function neon(color = PALETTE.violet, { low, high, rim, bottom = 0, top = 2, rimGain = 1.6, rimPower = 2.4, glow = 0 } = {}) {
  const c = new THREE.Color(color);
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uLow: { value: low ? new THREE.Color(low) : c.clone().multiplyScalar(0.18) },
      uHigh: { value: high ? new THREE.Color(high) : c.clone() },
      uRim: { value: new THREE.Color(rim || color).lerp(new THREE.Color("#ffffff"), 0.25) },
      uLight: { value: new THREE.Vector3(-0.4, 1, 0.6) },
      uRimPower: { value: rimPower }, uRimGain: { value: rimGain }, uGlow: { value: glow },
      uBottom: { value: bottom }, uTop: { value: top },
    }]),
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
}

// Emissive material; intensity above 1 is what the bloom pass picks up.
export function glow(color = PALETTE.cyan, intensity = 2.2, { fog = true, opacity = 1 } = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), fog,
    transparent: opacity < 1, opacity });
}

// A soft additive light pool, flat on the ground by default.
export function halo(color = PALETTE.violet, radius = 1.4, intensity = 1.2) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: haloMap(), color: new THREE.Color(color).multiplyScalar(intensity),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  return mesh;
}

export { canvasTexture };
