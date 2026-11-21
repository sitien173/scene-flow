// A server tower: a dark cabinet with glowing blade slots and status LEDs that blink in a seeded pattern
// and turn red, blade by blade, as alert rises.
export function serverTower(kit, { units = 8, color = kit.PALETTE.violet, ledColor = kit.PALETTE.teal, alertColor = kit.PALETTE.red, seed = 1 } = {}) {
  const { THREE } = kit;
  const r = kit.rand(seed);
  const unitH = 0.2;
  const h = units * unitH + 0.2;
  const group = new THREE.Group();

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.7), kit.neon(color, { bottom: 0, top: h, rimGain: 1.5 }));
  cabinet.position.y = h / 2;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.05, 0.76), kit.glow(color, 1.8));
  cap.position.y = h + 0.025;
  group.add(cabinet, cap, kit.halo(color, 0.9, 0.9));

  const idle = new THREE.Color(ledColor).multiplyScalar(2.2);
  const hot = new THREE.Color(alertColor).multiplyScalar(2.6);
  const blades = Array.from({ length: units }, (_, k) => {
    const yk = 0.15 + k * unitH + unitH / 2;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.035, 0.01), new THREE.MeshBasicMaterial({ color: idle.clone().multiplyScalar(0.5) }));
    slot.position.set(-0.06, yk, 0.356);
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: idle.clone() }));
    led.position.set(0.34, yk, 0.357);
    group.add(slot, led);
    return { slot, led, rate: 2 + r() * 5, phase: r() * 6.28, order: r() };
  });

  // update(t, { alert }) — alert 0..1; a blade turns red once alert passes its seeded order.
  function update(t, { alert = 0 } = {}) {
    for (const b of blades) {
      const red = alert > b.order * 0.9 ? 1 : 0;
      const on = Math.sin(t * b.rate + b.phase) > -0.3 ? 1 : 0.25;
      b.led.material.color.copy(red ? hot : idle).multiplyScalar(red ? 1 : on);
      b.slot.material.color.copy(red ? hot : idle).multiplyScalar(0.45 + 0.1 * Math.sin(t * 2 + b.phase));
    }
  }
  update(0);
  return { group, hero: cabinet, update };
}
