// A paper luggage-style price tag: notched left end, an eyelet with a short string, and the price printed
// on both faces. opts.text is the price, opts.accent the band color, opts.tilt the hang angle.
export function priceTag(kit, opts = {}) {
  const { THREE, look } = kit;
  const { text = "$15M", accent = look.PALETTE.red, tilt = -0.14 } = opts;
  const group = new THREE.Group();
  group.userData.atlasHero = "price-tag";
  const { pivot, baseScale } = kit.place(group, opts, { mapFacing: true, mapScale: 1.38, lift: 0.08 });
  const holder = new THREE.Group();
  holder.rotation.z = tilt;
  pivot.add(holder);

  // Outline: a rectangle whose left end is cut to a point, like a shipping tag.
  const W = 0.78, H = 0.38, notch = 0.12;
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2 + notch, H / 2);
  shape.lineTo(W / 2, H / 2);
  shape.lineTo(W / 2, -H / 2);
  shape.lineTo(-W / 2 + notch, -H / 2);
  shape.lineTo(-W / 2, 0);
  shape.closePath();
  const slabGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
  slabGeo.translate(0, 0.32, -0.025);
  look.addToonWithHull(holder, slabGeo, look.PALETTE.paper, { thickness: 0.02 });

  const tex = look.canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = look.PALETTE.paper;
    g.fillRect(0, 0, w, h);
    g.fillStyle = accent;
    g.fillRect(96, 0, 22, h);
    g.fillStyle = look.PALETTE.ink;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `900 ${text.length > 6 ? 76 : 100}px sans-serif`;
    g.fillText(text, (w + 118) / 2, h / 2 + 4);
  });
  const faceGeo = new THREE.PlaneGeometry(W - notch, H * 0.92);
  const faceMat = new THREE.MeshBasicMaterial({ map: tex });
  for (const side of [1, -1]) {
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(notch / 2, 0.32, side * 0.027);
    if (side < 0) face.rotation.y = Math.PI;
    holder.add(face);
  }

  const eyelet = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 16), look.toonMaterial(look.PALETTE.route));
  eyelet.position.set(-W / 2 + 0.1, 0.32, 0.03);
  holder.add(eyelet);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.2, 6), look.toonMaterial(look.PALETTE.ink));
  string.rotation.z = Math.PI / 3;
  string.position.set(-W / 2 + 0.02, 0.37, 0.03);
  holder.add(string);

  function update(t) {
    const time = Number.isFinite(t) ? t : 0;
    const s = kit.popWindow(group, time, { ...opts, baseScale });
    if (s <= 0) return;
    holder.rotation.z = tilt + Math.sin(time * 2.2) * 0.04;
  }

  update((opts.at ?? 0) + (opts.popDur ?? 0.45));
  return kit.hero({ group, hero: group, update });
}
