// A chain of thought as a floating graph: seeded glowing nodes on a sphere shell, joined to their nearest
// neighbours, with signal sparks running along the edges. A few accent nodes mark suspect thoughts.
export function thoughtGraph(kit, { color = kit.PALETTE.cyan, accent = kit.PALETTE.magenta, nodes = 14, radius = 1.2, center = [0, 1.8, 0], seed = 1 } = {}) {
  const { THREE } = kit;
  const r = kit.rand(seed);
  const group = new THREE.Group();
  group.position.set(...center);

  // Points spread on a sphere by a golden-angle spiral, jittered by the seed.
  const points = Array.from({ length: nodes }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / nodes;
    const rad = Math.sqrt(1 - y * y);
    const a = i * 2.39996 + r() * 0.5;
    return new THREE.Vector3(Math.cos(a) * rad, y * 0.8, Math.sin(a) * rad).multiplyScalar(radius * (0.8 + r() * 0.3));
  });
  const suspect = points.map(() => r() < 0.25);

  const edges = [];
  points.forEach((p, i) => {
    points.map((q, j) => [p.distanceTo(q), j]).filter(([, j]) => j > i).sort((a, b) => a[0] - b[0]).slice(0, 2)
      .forEach(([, j]) => edges.push([i, j]));
  });
  const linePos = new Float32Array(edges.length * 6);
  edges.forEach(([i, j], k) => { points[i].toArray(linePos, k * 6); points[j].toArray(linePos, k * 6 + 3); });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.4), transparent: true, opacity: 0.6 }));
  group.add(lines);

  const nodeMeshes = points.map((p, i) => {
    const node = new THREE.Mesh(new THREE.IcosahedronGeometry(suspect[i] ? 0.11 : 0.08, 1), kit.glow(suspect[i] ? accent : color, 2.4));
    node.position.copy(p);
    group.add(node);
    return node;
  });

  const sparks = edges.map(([i, j], k) => {
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), kit.glow("#FFFFFF", 3));
    group.add(spark);
    return { spark, a: points[i], b: points[j], rate: 0.4 + (k % 5) * 0.12, phase: k * 0.37 };
  });

  const nodeColor = nodeMeshes.map((n) => n.material.color.clone());

  // update(t, { lit }) — lit 0..1 dims nodes, edges, and sparks; the graph turns slowly.
  function update(t, { lit = 1 } = {}) {
    group.rotation.y = t * 0.18;
    lines.material.opacity = 0.6 * lit;
    nodeMeshes.forEach((n, i) => {
      n.material.color.copy(nodeColor[i]).multiplyScalar(Math.max(0.08, lit) * (0.85 + 0.15 * Math.sin(t * 3 + i)));
    });
    for (const s of sparks) {
      const x = (t * s.rate + s.phase) % 1;
      s.spark.position.lerpVectors(s.a, s.b, x);
      s.spark.visible = lit > 0.2;
    }
  }
  update(0);
  return { group, hero: group, nodes: nodeMeshes, update };
}
