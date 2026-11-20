// Blue Marble globe, Fresnel atmosphere, progress-driven route arcs, label anchors, and globe-to-region zoom.
import * as THREE from "three";
import { loadTexture } from "./look.js";
import { ease, lerp, progress } from "./motion.js";

const DEG = Math.PI / 180;
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpLook = new THREE.Vector3();
const tmpAxis = new THREE.Vector3();
const tmpOrtho = new THREE.Vector3();

// Converts (lat, lon) in degrees to a 3D point matching Three.js SphereGeometry equirectangular UVs.
export function latLonToVec3(lat, lon, radius = 1, out = new THREE.Vector3()) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return out.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// Fresnel rim atmosphere shell around the globe.
export function atmosphereMaterial({ color = "#62B8FF", rimPower = 3.2, intensity = 1.15 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: rimPower },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */`
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        float rim = pow(clamp(1.0 + dot(normalize(vNormalV), normalize(vViewDir)), 0.0, 1.0), uPower);
        gl_FragColor = vec4(uColor * uIntensity, rim);
      }`,
  });
}

function slerpUnit(a, b, u, out) {
  const dot = Math.min(1, Math.max(-1, a.dot(b)));
  if (dot > 0.9995) return out.copy(a).lerp(b, u).normalize();
  if (dot < -0.9995) {
    if (Math.abs(a.x) < 0.8) tmpAxis.set(1, 0, 0);
    else tmpAxis.set(0, 1, 0);
    tmpOrtho.crossVectors(a, tmpAxis).normalize();
    return out.copy(a).multiplyScalar(Math.cos(Math.PI * u)).addScaledVector(tmpOrtho, Math.sin(Math.PI * u));
  }
  const omega = Math.acos(dot);
  const sinO = Math.sin(omega);
  const s0 = Math.sin((1 - u) * omega) / sinO;
  const s1 = Math.sin(u * omega) / sinO;
  return out.set(a.x * s0 + b.x * s1, a.y * s0 + b.y * s1, a.z * s0 + b.z * s1);
}

// Great-circle route arc whose TubeGeometry drawRange is a pure function of t and width scales with camera distance.
export function routeArc({
  from,
  to,
  radius = 3.2,
  height = 0.72,
  radiusTube = 0.015,
  color = "#FFD166",
  segments = 96,
  radialSegments = 6,
  samples = 32,
  start = 0,
  dur = 1.6,
  curve: curveKind = "out",
  head = true,
} = {}) {
  const dirA = latLonToVec3(from[0], from[1], 1);
  const dirB = latLonToVec3(to[0], to[1], 1);
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const p = slerpUnit(dirA, dirB, u, new THREE.Vector3());
    const r = radius + 0.02 + Math.sin(Math.PI * u) * height;
    pts.push(p.multiplyScalar(r));
  }
  const path = new THREE.CatmullRomCurve3(pts);
  const geom = new THREE.TubeGeometry(path, segments, radiusTube, radialSegments, false);
  const ringCount = radialSegments + 1;
  const posCount = geom.attributes.position.count;
  const spine = new Float32Array(posCount * 3);
  const pt = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    path.getPointAt(i / segments, pt);
    for (let j = 0; j < ringCount; j++) {
      const idx = (i * ringCount + j) * 3;
      if (idx + 2 < spine.length) {
        spine[idx] = pt.x;
        spine[idx + 1] = pt.y;
        spine[idx + 2] = pt.z;
      }
    }
  }
  geom.setAttribute("aSpine", new THREE.BufferAttribute(spine, 3));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uWidthScale: { value: 1.0 },
    },
    vertexShader: /* glsl */`
      attribute vec3 aSpine;
      uniform float uWidthScale;
      void main() {
        vec3 scaledPos = aSpine + (position - aSpine) * uWidthScale;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPos, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geom, mat);
  const group = new THREE.Group();
  group.add(mesh);

  let headMesh = null;
  if (head) {
    headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radiusTube * 1.9, 10, 8),
      new THREE.MeshBasicMaterial({ color: "#FFFFFF" }),
    );
    group.add(headMesh);
  }

  const perSegment = radialSegments * 6;
  function update(t, camera = null) {
    const x = ease(progress(t, start, dur), curveKind);
    const segs = Math.round(x * segments);
    const count = segs * perSegment;
    geom.setDrawRange(0, count);
    mesh.visible = count > 0;
    const surfDist = camera ? Math.max(0.5, camera.position.length() - radius) : 14.0;
    const widthScale = camera ? Math.min(1.15, Math.max(0.2, surfDist / 14.0)) : 1.0;
    mat.uniforms.uWidthScale.value = widthScale;
    if (headMesh) {
      headMesh.visible = x > 0 && x < 1;
      headMesh.scale.setScalar(widthScale);
      if (headMesh.visible) path.getPointAt(x, headMesh.position);
    }
  }
  update(0);
  return {
    object: mesh,
    group,
    geometry: geom,
    curve: path,
    update,
  };
}

// Async Blue Marble globe with Fresnel atmosphere, route arcs, and 3D label anchors.
export async function globe({
  radius = 3.2,
  segments = 64,
  atmosphere = true,
  glowColor = "#62B8FF",
  earthUrl = "./assets/terra3d/textures/earth-day.webp",
  arcs = [],
  labels = [],
} = {}) {
  const earthTex = await loadTexture(earthUrl, {
    colorSpace: THREE.SRGBColorSpace,
    wrap: THREE.ClampToEdgeWrapping,
  });
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, segments, Math.round(segments * 0.65)),
    new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.78, metalness: 0.04 }),
  );
  group.add(sphere);

  if (atmosphere) {
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.055, segments, Math.round(segments * 0.65)),
      atmosphereMaterial({ color: glowColor }),
    );
    group.add(atmo);
  }

  const builtArcs = arcs.map(spec => {
    const arc = routeArc({ radius, ...spec });
    group.add(arc.group);
    return arc;
  });

  const anchors = labels.map(spec => ({
    ...spec,
    position: latLonToVec3(spec.lat, spec.lon, radius * (spec.lift || 1.03)),
  }));

  function update(t, camera = null) {
    for (let i = 0; i < builtArcs.length; i++) builtArcs[i].update(t, camera);
  }
  update(0);

  return {
    object: group,
    sphere,
    radius,
    arcs: builtArcs,
    anchors,
    latLonToVec3,
    update,
  };
}

// Closed-form camera move zooming from a wide globe framing into a target (lat, lon) region.
export function globeZoom(camera, t, {
  fromLatLon = [20, -40],
  toLatLon = [9.1, -79.7],
  radius = 3.2,
  fromDist = 9.8,
  toDist = 5.3,
  lookSurface = 0.32,
  lookOffset = [0, 0, 0],
  start = 0,
  dur = 3.0,
  curve = "inOut",
} = {}) {
  const x = ease(progress(t, start, dur), curve);
  latLonToVec3(fromLatLon[0], fromLatLon[1], 1, tmpA);
  latLonToVec3(toLatLon[0], toLatLon[1], 1, tmpB);
  slerpUnit(tmpA, tmpB, x, tmpDir);
  const dist = lerp(fromDist, toDist, x);
  camera.up.set(0, 1, 0);
  camera.position.copy(tmpDir).multiplyScalar(dist);
  tmpLook.copy(tmpB).multiplyScalar(radius * lookSurface * x);
  tmpLook.x += lookOffset[0];
  tmpLook.y += lookOffset[1];
  tmpLook.z += lookOffset[2];
  camera.lookAt(tmpLook);
}
