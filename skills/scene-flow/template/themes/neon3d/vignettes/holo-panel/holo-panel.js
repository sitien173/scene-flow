// A floating hologram panel: glowing frame, title bar, scrolling code lines, an optional stamp, and a base emitter
// that projects it. The screen is the fly-in portal.
export function holoPanel(kit, { width = 2, height = 1.25, title = "", lines = 4, accent = kit.PALETTE.cyan, stamp = "", seed = 1 } = {}) {
  const { THREE, PALETTE } = kit;
  const r = kit.rand(seed);
  const widths = Array.from({ length: 24 }, () => 0.35 + r() * 0.6);
  const indents = Array.from({ length: 24 }, () => Math.floor(r() * 3));
  const accentHex = new THREE.Color(accent).getStyle();

  const texture = kit.canvasTexture(512, Math.round(512 * height / width), (g, w, h) => {
    g.fillStyle = "rgba(11,8,32,0.92)";
    g.fillRect(0, 0, w, h);
    g.fillStyle = accentHex;
    g.globalAlpha = 0.22;
    g.fillRect(0, 0, w, 64);
    g.globalAlpha = 1;
    g.font = "600 34px 'Be Vietnam Pro', sans-serif";
    g.fillStyle = PALETTE.ink;
    g.textBaseline = "middle";
    g.fillText(title, 28, 34);
    [PALETTE.red, PALETTE.amber, PALETTE.teal].forEach((c, k) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(w - 40 - k * 30, 32, 9, 0, Math.PI * 2);
      g.fill();
    });
    if (stamp) {
      g.font = "800 92px 'Be Vietnam Pro', sans-serif";
      g.textAlign = "center";
      g.fillStyle = accentHex;
      g.fillText(stamp, w / 2, 64 + (h - 64) / 2);
    }
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: true }));
  screen.userData.portalColor = accent;

  const group = new THREE.Group();
  group.add(screen);

  // Frame: four thin glowing bars.
  const bar = kit.glow(accent, 2.4);
  for (const [w, h, x, y] of [[width + 0.06, 0.03, 0, height / 2], [width + 0.06, 0.03, 0, -height / 2],
    [0.03, height, -width / 2, 0], [0.03, height, width / 2, 0]]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), bar);
    edge.position.set(x, y, 0.005);
    group.add(edge);
  }

  // Code lines as thin glowing strips that scroll upward inside the body area.
  const bodyTop = height / 2 - 0.16;
  const bodyBottom = -height / 2 + 0.08;
  const lineGap = (bodyTop - bodyBottom) / Math.max(lines, 1);
  const strips = stamp ? [] : Array.from({ length: lines }, (_, k) => {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.045), kit.glow(k % 3 === 1 ? accent : PALETTE.ink, k % 3 === 1 ? 1.8 : 0.8, { opacity: 0.9 }));
    group.add(strip);
    return { strip, k };
  });

  // Emitter under the panel and the faint light cone that joins them.
  const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.06, 24), kit.glow(accent, 2));
  emitter.position.y = -height / 2 - 0.45;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.42, 0.16, 0.42, 24, 1, true),
    kit.glow(accent, 1.2, { opacity: 0.12 }));
  cone.position.y = -height / 2 - 0.22;
  cone.material.side = THREE.DoubleSide;
  cone.material.depthWrite = false;
  group.add(emitter, cone);

  // update(t, { lit }) — lit 0..1 dims the code lines; lines scroll as a pure function of t.
  function update(t, { lit = 1 } = {}) {
    const scroll = t * 0.9;
    for (const { strip, k } of strips) {
      const row = Math.floor(scroll) + k;
      const frac = scroll % 1;
      const i = ((row % 24) + 24) % 24;
      const w = (width - 0.5) * widths[i];
      strip.scale.x = w;
      strip.position.set(-width / 2 + 0.22 + indents[i] * 0.14 + w / 2, bodyTop - (k + 1 - frac) * lineGap + lineGap / 2, 0.01);
      strip.material.opacity = 0.9 * lit * Math.min(1, (k + 1 - frac) * 1.5, (lines - k + frac) * 1.5);
    }
    cone.material.opacity = 0.08 + 0.05 * Math.sin(t * 3 + seed);
  }
  update(0);
  return { group, hero: screen, screen, update, portal: () => screen };
}
