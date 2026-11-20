// Atlas3d visual look: original cartographic palette, three-step toon shading, seeded parchment, lights, and Line2 outlines.
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { rand } from "./motion.js";

export const PALETTE = {
  sea: "#5C7A82",
  seaDeep: "#4B676F",
  land: "#E7D7B9",
  landEdge: "#C5B08B",
  ink: "#1A1612",
  paper: "#F6EEDC",
  blue: "#3B6FA0",
  red: "#BD4B3B",
  teal: "#2C8276",
  orange: "#D9832B",
  green: "#4D8450",
  white: "#F3EEE4",
  route: "#F0B429",
  routeGlow: "#FFE28A",
};

const NAMED_COLORS = {
  blue: PALETTE.blue,
  red: PALETTE.red,
  teal: PALETTE.teal,
  orange: PALETTE.orange,
  green: PALETTE.green,
  white: PALETTE.white,
};

export function regionColor(color = "blue") {
  return NAMED_COLORS[color] || color;
}

export function canvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let gradientCache = null;
export function toonGradient() {
  if (gradientCache) return gradientCache;
  // Three-step toon ramp in RGBA (4-byte aligned for WebGL2).
  const data = new Uint8Array([
    132, 132, 132, 255,
    198, 198, 198, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  gradientCache = tex;
  return tex;
}

export function toonMaterial(color, options = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient(),
    ...options,
  });
}

export function lights(scene) {
  const hemi = new THREE.HemisphereLight("#FFF9EC", "#6E6557", 1.15);
  const key = new THREE.DirectionalLight("#FFF3D6", 1.85);
  key.position.set(18, 42, 22);
  scene.add(hemi, key);
  return { hemi, key };
}

export function parchmentTexture(seed = 101, size = 512) {
  const rng = rand(seed);
  const tex = canvasTexture(size, size, (g, w, h) => {
    g.fillStyle = "#EDE0C4";
    g.fillRect(0, 0, w, h);
    // Soft warm blotches that tile cleanly.
    for (let i = 0; i < 42; i++) {
      const cx = rng() * w;
      const cy = rng() * h;
      const r = 36 + rng() * 96;
      const tone = rng() > 0.5 ? "rgba(182,150,104,0.06)" : "rgba(255,248,232,0.08)";
      for (const ox of [-w, 0, w]) {
        for (const oy of [-h, 0, h]) {
          const grad = g.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
          grad.addColorStop(0, tone);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = grad;
          g.fillRect(cx + ox - r, cy + oy - r, r * 2, r * 2);
        }
      }
    }
    // Fine paper speckles and fibers.
    for (let i = 0; i < 1600; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const alpha = 0.03 + rng() * 0.05;
      g.fillStyle = rng() > 0.35 ? `rgba(110,84,52,${alpha})` : `rgba(255,250,240,${alpha})`;
      g.fillRect(x, y, 1 + rng() * 2, 1 + rng() * 2);
    }
    g.lineWidth = 1;
    for (let i = 0; i < 140; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const len = 8 + rng() * 20;
      const ang = rng() * Math.PI * 2;
      g.strokeStyle = `rgba(130,102,68,${0.025 + rng() * 0.03})`;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.stroke();
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function lineMaterial({ color = PALETTE.ink, linewidth = 4, ...options } = {}) {
  return new LineMaterial({
    color: new THREE.Color(color).getHex(),
    linewidth,
    worldUnits: false,
    resolution: new THREE.Vector2(1080, 1920),
    ...options,
  });
}

export function outlineSegments(positions, options = {}) {
  const geom = new LineSegmentsGeometry();
  geom.setPositions(positions);
  return new LineSegments2(geom, lineMaterial(options));
}

export function outlineLoop(positions, options = {}) {
  const geom = new LineGeometry();
  geom.setPositions(positions);
  return new Line2(geom, lineMaterial(options));
}
