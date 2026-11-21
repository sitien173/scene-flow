// A slatted wooden shipping crate with dark corner posts and a rope tied around it.
// Stands on the map facing the camera; only pop-in and pop-out move it.
export function cargoCrate(kit, opts = {}) {
  const { THREE, look } = kit;
  const group = new THREE.Group();
  group.userData.atlasHero = "cargo-crate";
  const { pivot, baseScale } = kit.place(group, opts, { mapFacing: true, mapScale: 1.38, lift: 0.22 });
  const body = new THREE.Group();
  body.position.y = 0.22;
  pivot.add(body);

  const w = 0.46, h = 0.4, d = 0.4;
  look.addToonWithHull(body, new THREE.BoxGeometry(w, h, d), "#B9844A", { thickness: 0.02 });
  // Three raised slats on the front and back read as planks at map distance.
  const slatMat = look.toonMaterial("#D29B5B");
  for (const z of [d / 2 + 0.008, -d / 2 - 0.008]) {
    for (const y of [-0.12, 0, 0.12]) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.09, 0.016), slatMat);
      slat.position.set(0, y, z);
      body.add(slat);
    }
  }
  const postMat = look.toonMaterial("#5A3822");
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, h + 0.02, 0.05), postMat);
    post.position.set(x * (w / 2 - 0.01), 0, z * (d / 2 - 0.01));
    body.add(post);
  }
  const rope = new THREE.Mesh(new THREE.BoxGeometry(0.035, h + 0.03, d + 0.04), look.toonMaterial("#E6C77E"));
  body.add(rope);
  const lid = look.addToonWithHull(body, new THREE.BoxGeometry(w + 0.04, 0.05, d + 0.04), "#8C5E33", { thickness: 0.014 });
  lid.position.y = h / 2 + 0.02;

  function update(t) {
    kit.popWindow(group, Number.isFinite(t) ? t : 0, { ...opts, baseScale });
  }

  update((opts.at ?? 0) + (opts.popDur ?? 0.45));
  return kit.hero({ group, hero: group, update });
}
