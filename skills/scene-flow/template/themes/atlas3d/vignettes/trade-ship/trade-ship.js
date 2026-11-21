// A two-masted trade ship with a raised stern, square sails, and a pennant. It sits flat on the sea
// rather than facing the camera, and rocks on the waves as a pure function of time.
export function tradeShip(kit, opts = {}) {
  const { THREE, look } = kit;
  const group = new THREE.Group();
  group.userData.atlasHero = "trade-ship";
  const { pivot, baseScale } = kit.place(group, opts, { mapFacing: false, mapScale: 1.32, lift: 0 });
  const body = new THREE.Group();
  pivot.add(body);
  const wood = "#7A4E2D", sail = look.PALETTE.white;

  // Hull: a top-view outline extruded downward, bow toward +z.
  const outline = new THREE.Shape();
  outline.moveTo(0, 0.34);
  outline.quadraticCurveTo(0.15, 0.16, 0.14, -0.18);
  outline.lineTo(0.12, -0.24);
  outline.lineTo(-0.12, -0.24);
  outline.lineTo(-0.14, -0.18);
  outline.quadraticCurveTo(-0.15, 0.16, 0, 0.34);
  const hullGeo = new THREE.ExtrudeGeometry(outline, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 });
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.translate(0, 0.16, 0);
  look.addToonWithHull(body, hullGeo, wood, { thickness: 0.018 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.5), look.toonMaterial(look.PALETTE.route));
  stripe.position.set(0, 0.1, 0.02);
  body.add(stripe);
  const stern = look.addToonWithHull(body, new THREE.BoxGeometry(0.22, 0.08, 0.12), "#8C5E33", { thickness: 0.014 });
  stern.position.set(0, 0.2, -0.17);

  const masts = [[0.16, 0.5, 0.2], [-0.08, 0.4, 0.15]].map(([z, height, sailW]) => {
    const mast = look.addToonWithHull(body, new THREE.CylinderGeometry(0.018, 0.022, height, 8), "#5A3822", { thickness: 0.01 });
    mast.position.set(0, 0.16 + height / 2, z);
    // Fore-and-aft sails along the keel, schooner style, so a side-on ship shows them broadside.
    const sheet = look.addToonWithHull(body, new THREE.BoxGeometry(0.03, height * 0.5, sailW), sail, { thickness: 0.012 });
    sheet.position.set(0, 0.2 + height * 0.55, z - sailW / 2 - 0.02);
    sheet.rotation.y = 0.08;
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, sailW + 0.06, 6), look.toonMaterial("#5A3822"));
    yard.rotation.x = Math.PI / 2;
    yard.position.set(0, 0.2 + height * 0.8, z - sailW / 2 - 0.02);
    body.add(yard);
    return mast;
  });
  const pennant = look.addToonWithHull(body, new THREE.ConeGeometry(0.03, 0.12, 6), look.PALETTE.red, { thickness: 0.01 });
  pennant.rotation.x = Math.PI / 2;
  pennant.position.set(0, 0.16 + 0.5 + 0.02, masts[0].position.z - 0.06);

  function update(t) {
    const time = Number.isFinite(t) ? t : 0;
    const s = kit.popWindow(group, time, { ...opts, baseScale });
    if (s <= 0) return;
    body.rotation.z = Math.sin(time * 2.4) * 0.06;
    body.rotation.x = Math.cos(time * 1.9) * 0.04;
    body.position.y = Math.sin(time * 2.4 + 0.6) * 0.018;
  }

  update((opts.at ?? 0) + (opts.popDur ?? 0.45));
  return kit.hero({ group, hero: group, update });
}
