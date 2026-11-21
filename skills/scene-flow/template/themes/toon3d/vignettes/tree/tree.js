// Sample prop for toon3d: a round-canopy tree with a brown trunk. Static, so update() does nothing.
// Positions are fixed behind and beside the house, so the scene is the same on every render.
const SITE = [
  { x: -4.4, z: -2.6, scale: 1.1 },
  { x: 4.2, z: -3.4, scale: 0.95 },
  { x: -5.8, z: 1.2, scale: 0.8 },
];

export function tree(kit, { x = 0, z = 0, scale = 1 } = {}) {
  const { THREE, PALETTE, toon, ink } = kit;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 10), toon(PALETTE.trunk));
  trunk.position.y = 0.8;
  group.add(trunk);
  const canopy = toon(PALETTE.canopy);
  for (const [bx, by, bz, r] of [[0, 2.2, 0, 0.95], [-0.55, 1.9, 0.25, 0.7], [0.55, 2.0, -0.2, 0.75]]) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), canopy);
    blob.position.set(bx, by, bz);
    group.add(blob);
  }
  ink(group, 0.014);
  return { group, update() {} };
}

// The three trees of the site, as groups ready to add to a vignette's scene.
export function trees(kit) {
  return SITE.map(site => tree(kit, site).group);
}
