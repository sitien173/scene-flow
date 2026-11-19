// Gerstner-wave ocean: shares one wave table between the GLSL shader and CPU heightAt(x, z, t).
import * as THREE from "three";

const norm = (x, z) => {
  const len = Math.hypot(x, z) || 1;
  return [x / len, z / len];
};

// Shared wave table used by both the vertex shader and CPU heightAt / gerstnerAt.
export const WAVES = [
  { dir: norm(0.85, 0.52), steepness: 0.22, wavelength: 14.0, speed: 1.0 },
  { dir: norm(0.42, -0.91), steepness: 0.16, wavelength: 8.5, speed: 1.15 },
  { dir: norm(-0.72, 0.69), steepness: 0.12, wavelength: 5.2, speed: 1.3 },
  { dir: norm(0.18, 0.98), steepness: 0.08, wavelength: 3.1, speed: 1.5 },
];

const tmpSample = { x: 0, y: 0, z: 0 };

function sampleGerstner(x, z, t, waves, level, amp, out) {
  let dx = 0;
  let dy = level;
  let dz = 0;
  for (let i = 0; i < waves.length; i++) {
    const w = waves[i];
    const k = (2 * Math.PI) / w.wavelength;
    const c = Math.sqrt(9.8 / k) * w.speed;
    const a = (w.steepness * amp) / k;
    const theta = k * (w.dir[0] * x + w.dir[1] * z) - c * t;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    dx += w.dir[0] * a * cosT;
    dy += a * sinT;
    dz += w.dir[1] * a * cosT;
  }
  out.x = x + dx;
  out.y = dy;
  out.z = z + dz;
  return out;
}

// Full CPU Gerstner displacement at rest coordinates (x, z) and time t.
export function gerstnerAt(x, z, t = 0, { waves = WAVES, level = 0, amp = 1 } = {}) {
  return sampleGerstner(x, z, t, waves, level, amp, { x: 0, y: 0, z: 0 });
}

// World-coordinate surface height at (x, z, t) by inverting horizontal Gerstner displacement via fixed-point iteration.
export function heightAt(x, z, t = 0, { waves = WAVES, level = 0, amp = 1 } = {}) {
  let rx = x;
  let rz = z;
  for (let i = 0; i < 10; i++) {
    sampleGerstner(rx, rz, t, waves, level, amp, tmpSample);
    rx = x - (tmpSample.x - rx);
    rz = z - (tmpSample.z - rz);
  }
  return sampleGerstner(rx, rz, t, waves, level, amp, tmpSample).y;
}

function buildWaveGlsl(waves) {
  return waves.map(w => {
    const k = (2 * Math.PI) / w.wavelength;
    const c = Math.sqrt(9.8 / k) * w.speed;
    return `addWave(pos.xz, vec2(${w.dir[0].toFixed(6)}, ${w.dir[1].toFixed(6)}), ${w.steepness.toFixed(6)}, ${k.toFixed(6)}, ${c.toFixed(6)}, disp, tangent, binormal);`;
  }).join("\n    ");
}

const FRAGMENT = /* glsl */`
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  varying float vWaveH;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    float crest = smoothstep(-0.25, 0.55, vWaveH);
    vec3 water = mix(uDeep, uShallow, crest);
    water = mix(water, uSky, clamp(fresnel * 0.72, 0.0, 0.85));
    float diff = max(dot(n, uSunDir), 0.0);
    water += uShallow * diff * 0.16;
    vec3 h = normalize(uSunDir + v);
    float spec = pow(max(dot(n, h), 0.0), 96.0);
    water += uSunColor * spec * 0.65;
    float foam = smoothstep(0.45, 0.8, vWaveH);
    water = mix(water, vec3(0.95, 0.98, 1.0), foam * 0.25);
    gl_FragColor = vec4(water, 1.0);
    #include <fog_fragment>
  }`;

// Gerstner wave ShaderMaterial driven by the shared WAVES table and uTime uniform.
export function oceanMaterial({
  waves = WAVES,
  amp = 1,
  level = 0,
  deepColor = "#0E4C73",
  shallowColor = "#2E8EC2",
  skyColor = "#9BD0F5",
  sunDir = [-10, 18, 12],
  sunColor = "#FFF1D0",
} = {}) {
  const vertexShader = /* glsl */`
  #include <common>
  #include <fog_pars_vertex>
  uniform float uTime;
  uniform float uAmp;
  uniform float uLevel;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  varying float vWaveH;

  void addWave(vec2 xz, vec2 dir, float steepness, float k, float c,
               inout vec3 disp, inout vec3 tangent, inout vec3 binormal) {
    float q = steepness * uAmp;
    float a = q / k;
    float theta = k * dot(dir, xz) - c * uTime;
    float cosT = cos(theta);
    float sinT = sin(theta);
    disp.x += dir.x * a * cosT;
    disp.y += a * sinT;
    disp.z += dir.y * a * cosT;
    tangent += vec3(-dir.x * dir.x * q * sinT, dir.x * q * cosT, -dir.x * dir.y * q * sinT);
    binormal += vec3(-dir.x * dir.y * q * sinT, dir.y * q * cosT, -dir.y * dir.y * q * sinT);
  }

  void main() {
    vec3 pos = position;
    vec3 disp = vec3(0.0, uLevel, 0.0);
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    ${buildWaveGlsl(waves)}
    vec3 transformed = pos + disp;
    vec3 localNormal = normalize(cross(binormal, tangent));
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPos = worldPosition.xyz;
    vNormalW = normalize(mat3(modelMatrix) * localNormal);
    vWaveH = disp.y - uLevel;
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 },
      uAmp: { value: amp },
      uLevel: { value: level },
      uDeep: { value: new THREE.Color(deepColor) },
      uShallow: { value: new THREE.Color(shallowColor) },
      uSky: { value: new THREE.Color(skyColor) },
      uSunDir: { value: new THREE.Vector3(sunDir[0], sunDir[1], sunDir[2]).normalize() },
      uSunColor: { value: new THREE.Color(sunColor) },
    }]),
    vertexShader,
    fragmentShader: FRAGMENT,
  });
}

// Builds an ocean mesh once; update(t) sets only the uTime shader uniform.
export function ocean({
  size = 180,
  segments = 96,
  waves = WAVES,
  amp = 1,
  level = 0,
  ...matOpts
} = {}) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const material = oceanMaterial({ waves, amp, level, ...matOpts });
  const mesh = new THREE.Mesh(geometry, material);
  return {
    object: mesh,
    material,
    update(t) {
      material.uniforms.uTime.value = t;
    },
    heightAt: (x, z, t = 0) => heightAt(x, z, t, { waves, level, amp }),
  };
}
