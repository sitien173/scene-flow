// Seeded heightfield terrain with river/lake masks, flat water plane, and optional red-earth cut walls.
import * as THREE from "three";
import { loadTexture, PALETTE } from "./look.js";
import { lerp, rand } from "./motion.js";

const GRID = 32;
const smoothstep = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const quintic = t => t * t * t * (t * (t * 6 - 15) + 10);

function buildLattice(seed) {
  const r = rand(seed);
  const table = new Float32Array(GRID * GRID);
  for (let i = 0; i < table.length; i++) table[i] = r();
  return table;
}

function sampleLattice(table, x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = quintic(x - ix);
  const fz = quintic(z - iz);
  const x0 = ((ix % GRID) + GRID) % GRID;
  const x1 = (x0 + 1) % GRID;
  const z0 = ((iz % GRID) + GRID) % GRID;
  const z1 = (z0 + 1) % GRID;
  const a = lerp(table[z0 * GRID + x0], table[z0 * GRID + x1], fx);
  const b = lerp(table[z1 * GRID + x0], table[z1 * GRID + x1], fx);
  return lerp(a, b, fz);
}

function fbm(table, x, z) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  let norm = 0;
  for (let o = 0; o < 4; o++) {
    sum += amp * sampleLattice(table, x * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

// Deterministic seeded heightfield with river, lake, and optional rectangular cut trench.
export function createHeightfield({
  seed = 1,
  elevation = 5.5,
  baseHeight = 0.9,
  waterLevel = 0.0,
  river = true,
  riverWidth = 3.8,
  riverAmp = 7.0,
  riverFreq = 0.085,
  riverPhase = 0.4,
  riverDepth = 2.2,
  lake = true,
  lakeCenter = [3.5, -5.0],
  lakeRadius = [9.5, 7.0],
  lakeDepth = 2.4,
  cut = null,
} = {}) {
  const table = buildLattice(seed);

  function riverCenter(z) {
    return riverAmp * Math.sin(z * riverFreq + riverPhase)
      + riverAmp * 0.3 * Math.cos(z * riverFreq * 1.85 - riverPhase);
  }

  function masks(x, z) {
    let riverMask = 0;
    if (river) {
      const dist = Math.abs(x - riverCenter(z));
      riverMask = 1 - smoothstep(riverWidth * 0.45, riverWidth * 1.35, dist);
    }
    let lakeMask = 0;
    if (lake) {
      const dx = (x - lakeCenter[0]) / lakeRadius[0];
      const dz = (z - lakeCenter[1]) / lakeRadius[1];
      const wob = (sampleLattice(table, x * 0.16 + 7.1, z * 0.16 + 3.7) - 0.5) * 0.28;
      const dist = Math.hypot(dx, dz) + wob;
      lakeMask = 1 - smoothstep(0.62, 1.12, dist);
    }
    let cutMask = 0;
    if (cut) {
      const cx = cut.center ? cut.center[0] : 0;
      const cz = cut.center ? cut.center[1] : 0;
      const hw = (cut.width || 10) * 0.5;
      const hl = (cut.length || 14) * 0.5;
      const bank = cut.bank || 2.0;
      const dx = Math.abs(x - cx) - hw;
      const dz = Math.abs(z - cz) - hl;
      const d = Math.max(dx, dz);
      cutMask = 1 - smoothstep(0, bank, d);
    }
    return { riverMask, lakeMask, cutMask, waterMask: Math.max(riverMask, lakeMask) };
  }

  function heightAt(x, z) {
    const n = fbm(table, x * 0.045 + 11.3, z * 0.045 + 5.7);
    const ridge = Math.pow(fbm(table, x * 0.075 + 23.1, z * 0.075 + 17.9), 2) * elevation * 0.55;
    let h = baseHeight + n * elevation + ridge;
    const { riverMask, lakeMask, cutMask } = masks(x, z);
    const waterMask = Math.max(riverMask, lakeMask);
    if (waterMask > 0) {
      const target = waterLevel - Math.max(riverMask * riverDepth, lakeMask * lakeDepth);
      h = lerp(h, target, waterMask);
    }
    if (cut && cutMask > 0) {
      const cutFloor = waterLevel - (cut.depth || 2.6);
      h = lerp(h, Math.min(h, cutFloor), cutMask);
    }
    return h;
  }

  return { heightAt, masks, riverCenter, waterLevel };
}

export function terrainHeight(x, z, opts = {}) {
  return createHeightfield(opts).heightAt(x, z);
}

function buildCutWalls(field, { size, segments, waterLevel, redEarthTex }) {
  const positions = [];
  const uvs = [];
  const step = size / segments;
  const half = size * 0.5;
  const eps = step * 0.5;

  const liftAt = (x, z, h) => {
    const m = field.masks(x, z);
    const inCut = m.cutMask > 0.08 && m.cutMask < 0.96;
    const onBank = h < waterLevel + 0.85 && h > waterLevel - 0.8;
    return (inCut || onBank) ? 0.035 : -0.06;
  };

  // Build sloped red-earth embankment segments where terrain drops into carved water or cut zones.
  for (let iz = 0; iz < segments; iz++) {
    for (let ix = 0; ix < segments; ix++) {
      const x0 = -half + ix * step;
      const z0 = -half + iz * step;
      const xc = x0 + eps;
      const zc = z0 + eps;
      const m = field.masks(xc, zc);
      const h00 = field.heightAt(x0, z0);
      const h10 = field.heightAt(x0 + step, z0);
      const h01 = field.heightAt(x0, z0 + step);
      const h11 = field.heightAt(x0 + step, z0 + step);
      const hMax = Math.max(h00, h10, h01, h11);
      const hMin = Math.min(h00, h10, h01, h11);
      const steep = hMax - hMin > step * 0.55;
      const isCutBank = (m.cutMask > 0.12 && m.cutMask < 0.92) || (steep && hMin < waterLevel + 0.55 && hMax > waterLevel + 0.15);
      if (!isCutBank) continue;
      const l00 = liftAt(x0, z0, h00);
      const l10 = liftAt(x0 + step, z0, h10);
      const l01 = liftAt(x0, z0 + step, h01);
      const l11 = liftAt(x0 + step, z0 + step, h11);
      const uvU = (x, z) => (x + z) * 0.14;
      const uvV = y => y * 0.32;
      positions.push(
        x0, h00 + l00, z0,
        x0, h01 + l01, z0 + step,
        x0 + step, h10 + l10, z0,
        x0 + step, h10 + l10, z0,
        x0, h01 + l01, z0 + step,
        x0 + step, h11 + l11, z0 + step,
      );
      uvs.push(
        uvU(x0, z0), uvV(h00),
        uvU(x0, z0 + step), uvV(h01),
        uvU(x0 + step, z0), uvV(h10),
        uvU(x0 + step, z0), uvV(h10),
        uvU(x0, z0 + step), uvV(h01),
        uvU(x0 + step, z0 + step), uvV(h11),
      );
    }
  }
  if (!positions.length) return null;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: redEarthTex,
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function buildRocks(field, { seed, size, waterLevel, rockTex, count = 16 }) {
  const r = rand(seed + 71);
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    map: rockTex,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
  const baseGeom = new THREE.DodecahedronGeometry(1, 0);
  const span = size * 0.38;
  for (let i = 0; i < count; i++) {
    const x = (r() - 0.5) * span * 2;
    const z = (r() - 0.5) * span * 2;
    const y = field.heightAt(x, z);
    if (y < waterLevel + 0.2) continue;
    const rock = new THREE.Mesh(baseGeom, mat);
    const sx = 0.45 + r() * 0.95;
    const sy = 0.35 + r() * 0.7;
    const sz = 0.45 + r() * 0.95;
    rock.scale.set(sx, sy, sz);
    rock.rotation.set(r() * 0.4, r() * Math.PI * 2, r() * 0.4);
    rock.position.set(x, y + sy * 0.32, z);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }
  return group;
}

function terrainWaterMaterial({
  deepColor = "#0D4A70",
  shallowColor = "#1E78AD",
  skyColor = PALETTE.sky,
  sunDir = [-10, 18, 12],
  sunColor = PALETTE.sun,
  opacity = 0.9,
} = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(deepColor) },
      uShallow: { value: new THREE.Color(shallowColor) },
      uSky: { value: new THREE.Color(skyColor) },
      uSunDir: { value: new THREE.Vector3(sunDir[0], sunDir[1], sunDir[2]).normalize() },
      uSunColor: { value: new THREE.Color(sunColor) },
      uOpacity: { value: opacity },
    }]),
    vertexShader: /* glsl */`
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uOpacity;
      varying vec3 vWorldPos;
      void main() {
        vec2 p = vWorldPos.xz;
        float r1 = sin(p.x * 1.35 + uTime * 1.4) * cos(p.y * 1.15 - uTime * 1.1);
        float r2 = sin(p.x * 2.6 - p.y * 2.2 + uTime * 2.1);
        vec3 n = normalize(vec3((r1 * 0.06 + r2 * 0.03), 1.0, (r1 * 0.05 - r2 * 0.035)));
        vec3 v = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.2);
        vec3 base = mix(uDeep, uShallow, 0.45 + 0.35 * r1);
        vec3 col = mix(base, uSky, clamp(0.18 + fresnel * 0.72, 0.0, 0.88));
        vec3 h = normalize(uSunDir + v);
        float spec = pow(max(dot(n, h), 0.0), 80.0);
        col += uSunColor * spec * 0.55;
        gl_FragColor = vec4(col, uOpacity);
        #include <fog_fragment>
      }`,
  });
}

// Bakes seeded terrain geometry, flat water at waterLevel, optional red-earth cut walls, and rocks.
export async function terrain({
  seed = 1,
  size = 90,
  segments = 96,
  waterLevel = 0.0,
  cutWalls = true,
  rocks = true,
  rockCount = 16,
  grassRepeat = null,
  earthRepeat = [2, 2],
  shadow = true,
  ...fieldOpts
} = {}) {
  const field = createHeightfield({ seed, waterLevel, ...fieldOpts });
  const rep = grassRepeat || [Math.max(16, Math.round(size / 4)), Math.max(16, Math.round(size / 4))];
  const [grassTex, redEarthTex, rockTex] = await Promise.all([
    loadTexture("./assets/terra3d/textures/ground-grass.webp", { repeat: rep }),
    cutWalls ? loadTexture("./assets/terra3d/textures/ground-red-earth.webp", { repeat: earthRepeat }) : Promise.resolve(null),
    rocks ? loadTexture("./assets/terra3d/textures/ground-rock.webp", { repeat: [3, 3] }) : Promise.resolve(null),
  ]);

  const geom = new THREE.PlaneGeometry(size, size, segments, segments);
  geom.rotateX(-Math.PI / 2);
  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color("#B8D98A");
  const cBank = new THREE.Color("#D6BE8A");
  const cRidge = new THREE.Color("#8FA089");
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = field.heightAt(x, z);
    pos.setY(i, y);
    if (y < waterLevel + 0.35) {
      tmp.copy(cBank);
    } else if (y > waterLevel + 3.6) {
      tmp.copy(cGrass).lerp(cRidge, smoothstep(waterLevel + 3.6, waterLevel + 6.2, y));
    } else {
      tmp.copy(cGrass);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();

  const group = new THREE.Group();
  const terrainMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  const land = new THREE.Mesh(geom, terrainMat);
  land.receiveShadow = !!shadow;
  group.add(land);

  const waterMat = terrainWaterMaterial();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(size, size), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = waterLevel;
  water.renderOrder = 1;
  group.add(water);

  if (cutWalls && redEarthTex) {
    const walls = buildCutWalls(field, { size, segments, waterLevel, redEarthTex });
    if (walls) group.add(walls);
  }
  if (rocks && rockTex) {
    group.add(buildRocks(field, { seed, size, waterLevel, rockTex, count: rockCount }));
  }

  return {
    object: group,
    heightAt: field.heightAt,
    waterLevel,
    update(t) {
      waterMat.uniforms.uTime.value = t;
      water.position.y = waterLevel + Math.sin(t * 1.4) * 0.015;
    },
  };
}
