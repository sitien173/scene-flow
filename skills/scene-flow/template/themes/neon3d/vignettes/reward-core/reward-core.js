// A reward crystal: a faceted gem spinning above a stepped pedestal, with two orbit rings and a light beam.
export function rewardCore(kit, { color = kit.PALETTE.amber, beamColor = kit.PALETTE.magenta, radius = 0.8 } = {}) {
  const { THREE } = kit;
  const group = new THREE.Group();

  const steps = [[radius * 1.25, 0.16], [radius * 0.95, 0.14]];
  let y = 0;
  for (const [rad, h] of steps) {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.92, rad, h, 6), kit.neon(color, { high: beamColor, bottom: 0, top: 0.3, rimGain: 1.4 }));
    tier.position.y = y + h / 2;
    group.add(tier);
    y += h;
  }
  const deck = y;
  const pool = kit.halo(color, radius * 2.2, 1.1);
  group.add(pool);

  const gemY = deck + radius * 1.35;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.62, 0), kit.neon(color, { bottom: gemY - radius * 0.6, top: gemY + radius * 0.6, rimGain: 2.4, glow: 0.4 }));
  gem.scale.y = 1.45;
  gem.position.y = gemY;
  gem.userData.portalColor = color;
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.22, 0), kit.glow("#FFFFFF", 2.6));
  heart.position.y = gemY;
  group.add(gem, heart);

  const rings = [0, 1].map(k => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * (1.0 + 0.25 * k), 0.022, 8, 72), kit.glow(k ? beamColor : color, 2.2));
    ring.position.y = gemY;
    group.add(ring);
    return ring;
  });

  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.12, radius * 0.32, 6, 24, 1, true), kit.glow(beamColor, 1.6, { opacity: 0.25 }));
  beam.material.side = THREE.DoubleSide;
  beam.material.depthWrite = false;
  beam.position.y = gemY + 3;
  group.add(beam);

  // update(t, { power }) — power 1 is idle; above 1 spins faster and brightens the beam.
  function update(t, { power = 1 } = {}) {
    gem.rotation.y = t * 0.8 * power;
    gem.position.y = gemY + 0.06 * Math.sin(t * 1.8);
    heart.position.y = gem.position.y;
    heart.scale.setScalar(1 + 0.2 * power * Math.max(0, Math.sin(t * 4)));
    rings[0].rotation.set(Math.PI / 2 + 0.35 * Math.sin(t * 0.7), t * 0.9 * power, 0);
    rings[1].rotation.set(Math.PI / 2 - 0.5, -t * 0.6 * power, 0.3 * Math.sin(t * 0.5));
    beam.material.opacity = Math.min(0.6, 0.18 * power + 0.05 * Math.sin(t * 6));
    pool.scale.setScalar(0.9 + 0.15 * power);
  }
  update(0);
  return { group, hero: gem, gem, update, portal: () => gem };
}
