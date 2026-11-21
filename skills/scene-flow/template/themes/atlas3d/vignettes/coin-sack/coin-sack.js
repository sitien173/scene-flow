// A plump coin sack tied with a red cord, with a short stack of gold coins leaning on its side.
// Stands on the map facing the camera; only pop-in and pop-out move it.
export function coinSack(kit, opts = {}) {
  const { THREE, look } = kit;
  const group = new THREE.Group();
  group.userData.atlasHero = "coin-sack";
  const { pivot, baseScale } = kit.place(group, opts, { mapFacing: true, mapScale: 1.38, lift: 0.16 });

  const sack = look.addToonWithHull(pivot, new THREE.SphereGeometry(0.23, 18, 14), "#C99A55", { thickness: 0.02 });
  sack.scale.set(1.05, 0.92, 1);
  sack.position.y = 0.22;
  const neck = look.addToonWithHull(pivot, new THREE.CylinderGeometry(0.07, 0.11, 0.09, 14), "#C99A55", { thickness: 0.016 });
  neck.position.y = 0.45;
  const flap = look.addToonWithHull(pivot, new THREE.ConeGeometry(0.13, 0.1, 10, 1, true), "#DDB673", { thickness: 0.014 });
  flap.rotation.x = Math.PI;
  flap.position.y = 0.53;
  flap.material.side = THREE.DoubleSide;
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16), look.toonMaterial(look.PALETTE.red));
  cord.rotation.x = Math.PI / 2;
  cord.position.y = 0.48;
  pivot.add(cord);

  // The "$" is painted on a patch sewn to the front.
  const patchTex = look.canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = look.PALETTE.paper;
    g.fillRect(0, 0, w, h);
    g.fillStyle = look.PALETTE.ink;
    g.font = "900 92px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("$", w / 2, h / 2 + 6);
  });
  const patch = new THREE.Mesh(new THREE.CircleGeometry(0.085, 20), new THREE.MeshBasicMaterial({ map: patchTex }));
  patch.position.set(0, 0.23, 0.236);
  pivot.add(patch);

  for (let i = 0; i < 3; i++) {
    const coin = look.addToonWithHull(pivot, new THREE.CylinderGeometry(0.075, 0.075, 0.026, 18), look.PALETTE.route, { thickness: 0.01, minY: -0.013 });
    coin.position.set(0.27, 0.03 + i * 0.032, 0.08);
    coin.rotation.y = i * 0.5;
  }

  function update(t) {
    kit.popWindow(group, Number.isFinite(t) ? t : 0, { ...opts, baseScale });
  }

  update((opts.at ?? 0) + (opts.popDur ?? 0.45));
  return kit.hero({ group, hero: group, update });
}
