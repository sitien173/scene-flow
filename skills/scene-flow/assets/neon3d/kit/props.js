// Props: network, maze, hexCore, uiWindow, laptop, serverRack. Layouts come from rand(seed); canvas textures are drawn once.
import * as THREE from "three";
import { PALETTE, neon, glow, halo, canvasTexture } from "./look.js";
import { rand } from "./motion.js";

const hash = (a, b) => {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const UP = new THREE.Vector3(0, 1, 0);

function placeBetween(matrix, a, b, thickness) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  return matrix.compose(mid, q, new THREE.Vector3(thickness, dir.length(), thickness));
}

// Glowing nodes joined to their nearest neighbours, with packets running along the edges.
export function network({ color = PALETTE.cyan, accent = PALETTE.magenta, nodes = 14, radius = 1.6, seed = 3, center = [0, 1.6, 0] } = {}) {
  const r = rand(seed);
  const c = new THREE.Vector3(...center);
  const points = Array.from({ length: nodes }, () => {
    const u = r() * 2 - 1;
    const a = r() * Math.PI * 2;
    const k = radius * (0.55 + 0.45 * r());
    return new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(a) * k, u * k * 0.8, Math.sqrt(1 - u * u) * Math.sin(a) * k).add(c);
  });
  const edges = [];
  points.forEach((p, i) => {
    points.map((q, j) => [p.distanceTo(q), j]).filter(([, j]) => j !== i).sort((x, y) => x[0] - y[0]).slice(0, 2)
      .forEach(([, j]) => { if (!edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) edges.push([i, j]); });
  });
  const group = new THREE.Group();
  const nodeMaterial = glow(color, 1.6);
  const nodeMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 2), nodeMaterial, nodes);
  const edgeMaterial = glow(color, 0.75);
  const edgeMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), edgeMaterial, edges.length);
  const packetMaterial = glow(accent, 3);
  const packetMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 1), packetMaterial, edges.length);
  const m = new THREE.Matrix4();
  edges.forEach(([a, b], k) => edgeMesh.setMatrixAt(k, placeBetween(m, points[a], points[b], 0.014)));
  group.add(edgeMesh, nodeMesh, packetMesh);
  const offsets = edges.map(() => r());
  const base = { node: nodeMaterial.color.clone(), edge: edgeMaterial.color.clone(), packet: packetMaterial.color.clone() };
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();

  // update(t, { lit }) — lit 0..1 dims the whole graph.
  function update(t, { lit = 1, speed = 0.5 } = {}) {
    const k = 0.12 + 0.88 * lit;
    nodeMaterial.color.copy(base.node).multiplyScalar(k);
    edgeMaterial.color.copy(base.edge).multiplyScalar(k);
    packetMaterial.color.copy(base.packet).multiplyScalar(lit);
    points.forEach((point, i) => {
      s.setScalar(1 + 0.3 * Math.max(0, Math.sin(t * 3 + i * 1.7)));
      nodeMesh.setMatrixAt(i, m.compose(point, q, s));
    });
    edges.forEach(([a, b], i) => {
      p.lerpVectors(points[a], points[b], (t * speed + offsets[i]) % 1);
      s.setScalar(lit > 0.02 ? 1 : 0.0001);
      packetMesh.setMatrixAt(i, m.compose(p, q, s));
    });
    nodeMesh.instanceMatrix.needsUpdate = true;
    packetMesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { group, points, update };
}

// Isometric neon maze from a seeded depth-first carve; path is the solved route as world points, exit the goal tile.
export function maze({ size = 7, cell = 0.5, wallHeight = 0.42, color = PALETTE.violet, exitColor = PALETTE.amber, seed = 5 } = {}) {
  const r = rand(seed);
  const n = size * 2 + 1;
  const open = Array.from({ length: n }, () => new Array(n).fill(false));
  const stack = [[0, 0]];
  open[1][1] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy, dx, dy])
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < size && ny < size && !open[ny * 2 + 1][nx * 2 + 1]);
    if (!next.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = next[Math.floor(r() * next.length)];
    open[y * 2 + 1 + dy][x * 2 + 1 + dx] = true;
    open[ny * 2 + 1][nx * 2 + 1] = true;
    stack.push([nx, ny]);
  }
  const half = (n * cell) / 2;
  const at = (gx, gy, y = 0) => new THREE.Vector3(gx * cell - half + cell / 2, y, gy * cell - half + cell / 2);
  const walls = [];
  for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) if (!open[gy][gx]) walls.push([gx, gy]);

  const group = new THREE.Group();
  const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(cell, wallHeight, cell), neon(color, { bottom: -wallHeight / 2, top: wallHeight / 2, rimGain: 1.2 }), walls.length);
  const capMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(cell * 0.98, 0.025, cell * 0.98), glow(color, 1.7), walls.length);
  const m = new THREE.Matrix4();
  walls.forEach(([gx, gy], k) => {
    wallMesh.setMatrixAt(k, m.makeTranslation(at(gx, gy, wallHeight / 2)));
    capMesh.setMatrixAt(k, m.makeTranslation(at(gx, gy, wallHeight + 0.012)));
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(n * cell, n * cell), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.08) }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.005;
  const exit = new THREE.Mesh(new THREE.BoxGeometry(cell * 0.8, 0.06, cell * 0.8), glow(exitColor, 2.6));
  exit.position.copy(at(n - 2, n - 2, 0.04));
  const exitPool = halo(exitColor, cell * 2, 1.2);
  exitPool.position.copy(at(n - 2, n - 2, 0.02));
  group.add(floor, wallMesh, capMesh, exit, exitPool);

  // breadth-first route from the first cell to the exit cell
  const prev = new Map([["1,1", null]]);
  const queue = [[1, 1]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = (x + dx) + "," + (y + dy);
      if (open[y + dy]?.[x + dx] && !prev.has(key)) { prev.set(key, [x, y]); queue.push([x + dx, y + dy]); }
    }
  }
  const path = [];
  for (let node = [n - 2, n - 2]; node; node = prev.get(node[0] + "," + node[1])) path.unshift(at(node[0], node[1], 0.12));
  const start = at(1, 1, 0);
  return { group, path, start, exit, update() {} };
}

// Hexagonal core on a plinth, with a spinning ring and light beams rising around it. portal is the core.
export function hexCore({ color = PALETTE.magenta, beamColor = PALETTE.cyan, radius = 0.9, beams = 6 } = {}) {
  const group = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.25, radius * 1.4, 0.35, 6), neon(PALETTE.violet, { bottom: -0.18, top: 0.18 }));
  plinth.position.y = 0.175;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, radius * 1.3, 6, 1, true),
    neon(color, { bottom: -radius * 0.65, top: radius * 0.65, rimGain: 2.4 }));
  shell.material.side = THREE.DoubleSide;
  shell.position.y = 0.35 + radius * 0.65;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, radius * 1.1, 6), glow(color, 2.8));
  core.position.copy(shell.position);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.45, 0.035, 8, 96), glow(beamColor, 2.2));
  ring.position.copy(shell.position);
  ring.rotation.x = Math.PI / 2;
  const beamMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(beamColor).multiplyScalar(1.6), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beamGroup = new THREE.Group();
  for (let k = 0; k < beams; k++) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 5).translate(0, 2.5, 0), beamMaterial);
    const a = (k / beams) * Math.PI * 2;
    beam.position.set(Math.cos(a) * radius * 1.45, 0.35, Math.sin(a) * radius * 1.45);
    beam.rotation.y = -a;
    beamGroup.add(beam);
  }
  group.add(halo(color, radius * 3, 1.3), plinth, shell, core, ring, beamGroup);

  function update(t, { power = 1 } = {}) {
    core.rotation.y = t * 0.8;
    shell.rotation.y = -t * 0.25;
    ring.rotation.z = t * 0.5;
    ring.position.y = shell.position.y + Math.sin(t * 1.6) * 0.12;
    beamGroup.rotation.y = t * 0.3;
    beamMaterial.opacity = power * (0.45 + 0.25 * Math.sin(t * 5));
    core.scale.setScalar(0.9 + 0.1 * power + 0.05 * Math.sin(t * 4));
  }
  update(0);
  return { group, core, portal: () => core, update };
}

function roundedRect(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function windowPainter({ title, lines, accent, seed, badge }) {
  return (g, w, h) => {
    const r = rand(seed);
    g.fillStyle = "#140C30";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#24164F";
    g.fillRect(0, 0, w, 64);
    ["#FF4D6A", "#FFB23D", "#14E3B0"].forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.arc(36 + k * 34, 32, 10, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = "#E9E3FF";
    g.font = '700 30px "Be Vietnam Pro", sans-serif';
    g.textBaseline = "middle";
    if (title) g.fillText(title, 150, 33);
    for (let k = 0; k < lines; k++) {
      g.fillStyle = k === 0 ? accent : "rgba(196,180,255,0.45)";
      const lw = (0.35 + 0.55 * r()) * (w - 96);
      g.beginPath();
      g.roundRect(48, 110 + k * 54, lw, 22, 11);
      g.fill();
    }
    if (badge) {
      g.font = '800 64px "Be Vietnam Pro", sans-serif';
      g.textAlign = "center";
      g.fillStyle = accent;
      g.fillText(badge, w / 2, h - 90);
    }
  };
}

// Floating window with depth; its face is canvas-drawn once. Pass draw(ctx, w, h) for custom content.
export function uiWindow({ width = 2.4, height = 1.6, title = "", lines = 4, color = PALETTE.violet, accent = PALETTE.cyan, badge = "", seed = 9, draw } = {}) {
  const group = new THREE.Group();
  const depth = 0.1;
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(width, height, 0.12), { depth, bevelEnabled: false, curveSegments: 6 }),
    neon(color, { bottom: -height / 2, top: height / 2, rimGain: 1.2 }));
  frame.position.z = -depth;
  const px = 512;
  const texture = canvasTexture(px, Math.round((px * height) / width), draw || windowPainter({ title, lines, accent, seed, badge }));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.1, height - 0.1), new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color(1.3, 1.3, 1.3) }));
  screen.position.z = 0.002;
  screen.userData.portalColor = accent;
  const edge = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(width + 0.05, height + 0.05, 0.14), { depth: 0.02, bevelEnabled: false, curveSegments: 6 }), glow(accent, 1.8));
  edge.position.z = -depth - 0.03;
  const float = new THREE.Group();
  float.add(edge, frame, screen);
  group.add(float);
  return { group, screen, portal: () => screen, update(t) { float.position.y = Math.sin(t * 1.3) * 0.04; } };
}

function codePainter(accent, seed) {
  return (g, w, h) => {
    const r = rand(seed);
    g.fillStyle = "#0E0828";
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 11; k++) {
      const indent = Math.floor(r() * 3) * 34;
      g.fillStyle = r() > 0.7 ? accent : "rgba(196,180,255,0.5)";
      g.beginPath();
      g.roundRect(30 + indent, 24 + k * 28, 60 + r() * (w - 160 - indent), 12, 6);
      g.fill();
    }
  };
}

// Laptop with a hinged lid; update(t, { open }) sets the lid from 0 closed to 1 open.
export function laptop({ color = PALETTE.violet, accent = PALETTE.teal, width = 1.6, seed = 4, draw } = {}) {
  const group = new THREE.Group();
  const depth = width * 0.66;
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, depth), neon(color, { bottom: -0.035, top: 0.035, high: "#3A2580" }));
  base.position.y = 0.035;
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.86, depth * 0.5), glow(color, 0.5));
  keys.rotation.x = -Math.PI / 2;
  keys.position.set(0, 0.072, -depth * 0.08);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.07, -depth / 2);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(width, depth, 0.05).translate(0, depth / 2, -0.025), neon(color, { bottom: 0, top: depth, high: "#3A2580" }));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.9, depth * 0.86),
    new THREE.MeshBasicMaterial({ map: canvasTexture(512, 320, draw || codePainter(accent, seed)), color: new THREE.Color(1.5, 1.5, 1.5) }));
  screen.position.set(0, depth / 2, 0.002);
  screen.userData.portalColor = accent;
  hinge.add(lid, screen);
  group.add(halo(accent, width * 1.1, 0.9), base, keys, hinge);
  function update(t, { open = 1 } = {}) {
    hinge.rotation.x = -(1 - Math.min(1, Math.max(0, open))) * 1.75 + -0.18;
  }
  update(0);
  return { group, screen, portal: () => screen, update };
}

// Server rack whose LEDs blink on a seeded pattern; alert switches the LEDs to red.
export function serverRack({ units = 8, color = PALETTE.violet, ledColor = PALETTE.teal, alertColor = PALETTE.red, seed = 6 } = {}) {
  const group = new THREE.Group();
  const unitH = 0.2;
  const h = units * unitH + 0.16;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.8), neon(color, { bottom: -h / 2, top: h / 2, high: "#3A2580", rimGain: 1.3 }));
  body.position.y = h / 2;
  const slotMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.78, unitH * 0.78, 0.02), new THREE.MeshBasicMaterial({ color: "#0A0618" }), units);
  const perUnit = 4;
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.035, 0.02), glow("#FFFFFF", 1), units * perUnit);
  const okColor = new THREE.Color(ledColor).multiplyScalar(2.6);
  const badColor = new THREE.Color(alertColor).multiplyScalar(2.6);
  const m = new THREE.Matrix4();
  for (let u = 0; u < units; u++) slotMesh.setMatrixAt(u, m.makeTranslation(0, 0.08 + unitH * (u + 0.5), 0.405));
  group.add(halo(ledColor, 1, 0.7), body, slotMesh, leds);
  const r = rand(seed);
  const rates = Array.from({ length: units * perUnit }, () => 2 + r() * 5);
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();

  // update(t, { alert }) — alert 0..1 is the share of LEDs that turn red.
  function update(t, { alert = 0 } = {}) {
    rates.forEach((rate, i) => {
      const u = Math.floor(i / perUnit);
      const on = hash(i, Math.floor(t * rate)) > 0.35;
      p.set(0.2 + (i % perUnit) * 0.07, 0.08 + unitH * (u + 0.5), 0.42);
      s.setScalar(on ? 1 : 0.0001);
      leds.setMatrixAt(i, m.compose(p, q, s));
      leds.setColorAt(i, hash(i, 7) < alert ? badColor : okColor);
    });
    leds.instanceMatrix.needsUpdate = true;
    leds.instanceColor.needsUpdate = true;
  }
  update(0);
  return { group, update };
}
