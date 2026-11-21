// A floating maze tile: a seeded perfect maze of glowing walls on a dark slab, a start pad, and a pulsing exit gate.
// Returns the solution path through the cells so a trail can follow it.
export function mazeBoard(kit, { size = 5, cell = 0.3, color = kit.PALETTE.violet, exitColor = kit.PALETTE.amber, seed = 1 } = {}) {
  const { THREE } = kit;
  const r = kit.rand(seed);
  const n = size;
  const span = n * cell;
  const center = (i) => (i + 0.5) * cell - span / 2;

  // Recursive-backtracker maze over n x n cells; walls[k] holds [north, east, south, west].
  const walls = Array.from({ length: n * n }, () => [true, true, true, true]);
  const seen = new Array(n * n).fill(false);
  const parent = new Array(n * n).fill(-1);
  const stack = [0];
  seen[0] = true;
  const steps = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];
  while (stack.length) {
    const k = stack[stack.length - 1];
    const x = k % n, z = Math.floor(k / n);
    const open = steps.filter(([dx, dz]) => {
      const nx = x + dx, nz = z + dz;
      return nx >= 0 && nz >= 0 && nx < n && nz < n && !seen[nz * n + nx];
    });
    if (!open.length) { stack.pop(); continue; }
    const [dx, dz, a, b] = open[Math.floor(r() * open.length)];
    const next = (z + dz) * n + (x + dx);
    walls[k][a] = false;
    walls[next][b] = false;
    seen[next] = true;
    parent[next] = k;
    stack.push(next);
  }

  // Wall segments as one instanced mesh.
  const segs = [];
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const w = walls[z * n + x];
    if (w[0]) segs.push([center(x), center(z) - cell / 2, true]);
    if (w[3]) segs.push([center(x) - cell / 2, center(z), false]);
    if (x === n - 1 && w[1]) segs.push([center(x) + cell / 2, center(z), false]);
    if (z === n - 1 && w[2] && x !== n - 1) segs.push([center(x), center(z) + cell / 2, true]);
  }
  const wallH = cell * 0.7;
  const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(cell + 0.03, wallH, 0.03),
    kit.neon(color, { bottom: 0, top: wallH, rimGain: 2.2 }), segs.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  segs.forEach(([x, z, alongX], i) => {
    q.setFromAxisAngle(up, alongX ? 0 : Math.PI / 2);
    m.compose(new THREE.Vector3(x, wallH / 2, z), q, new THREE.Vector3(1, 1, 1));
    wallMesh.setMatrixAt(i, m);
  });

  const slab = new THREE.Mesh(new THREE.BoxGeometry(span + 0.2, 0.12, span + 0.2), kit.neon(kit.PALETTE.night, { high: color, bottom: -0.12, top: 0, rimGain: 1.2 }));
  slab.position.y = -0.06;
  const start = new THREE.Vector3(center(0), 0, center(0));
  const pad = new THREE.Mesh(new THREE.CircleGeometry(cell * 0.32, 24), kit.glow(kit.PALETTE.cyan, 2));
  pad.rotation.x = -Math.PI / 2;
  pad.position.copy(start).setY(0.01);
  const exit = new THREE.Mesh(new THREE.TorusGeometry(cell * 0.32, cell * 0.07, 10, 32), kit.glow(exitColor, 3));
  exit.position.set(center(n - 1), cell * 0.4, center(n - 1));
  exit.userData.portalColor = exitColor;

  // Solution path from the exit cell back to the start through parent links.
  const path = [];
  for (let k = n * n - 1; k !== -1; k = parent[k]) path.unshift(new THREE.Vector3(center(k % n), 0.05, center(Math.floor(k / n))));

  const group = new THREE.Group();
  group.add(slab, wallMesh, pad, exit);

  // update(t, { alarm }) — alarm 0..1 speeds and swells the exit pulse.
  function update(t, { alarm = 0 } = {}) {
    exit.scale.setScalar(1 + (0.08 + 0.2 * alarm) * Math.sin(t * (3 + 4 * alarm)));
    exit.rotation.y = t * 1.2;
  }
  update(0);
  return { group, hero: group, path, start, exit, update, portal: () => exit };
}
