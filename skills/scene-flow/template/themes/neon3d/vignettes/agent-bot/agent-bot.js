// A hovering AI agent: rounded head with a visor face of two pill eyes, an antenna with a glowing tip,
// two floating hands, and a hover ring. Pops in, hovers, hops, looks, squints, and raises its hands.
export function agentBot(kit, { color = kit.PALETTE.violet, eyeColor = kit.PALETTE.cyan, size = 1, seed = 1 } = {}) {
  const { THREE, PALETTE } = kit;
  const r = kit.rand(seed);
  const phase = r() * Math.PI * 2;
  const blinkEvery = 2.6 + r() * 1.6;
  const blinkPhase = r() * blinkEvery;

  const group = new THREE.Group();
  group.scale.setScalar(size);
  const rig = new THREE.Group();
  group.add(rig);

  // Head: a box with rounded edges, pushed onto a sphere near its corners.
  const head = new THREE.BoxGeometry(1.2, 0.95, 0.95, 10, 10, 10);
  const p = new THREE.Vector3();
  const core = new THREE.Vector3();
  const pos = head.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    core.set(THREE.MathUtils.clamp(p.x, -0.38, 0.38), THREE.MathUtils.clamp(p.y, -0.255, 0.255), THREE.MathUtils.clamp(p.z, -0.255, 0.255));
    p.sub(core).normalize().multiplyScalar(0.22).add(core);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  head.computeVertexNormals();
  head.translate(0, 1.05, 0);
  const body = new THREE.Mesh(head, kit.neon(color, { bottom: 0.55, top: 1.55, rimGain: 1.9 }));
  rig.add(body);

  // Visor: a dark rounded panel that carries the face.
  const visorShape = new THREE.Shape();
  const vw = 0.46, vh = 0.27, vr = 0.16;
  visorShape.moveTo(-vw + vr, -vh);
  visorShape.lineTo(vw - vr, -vh);
  visorShape.quadraticCurveTo(vw, -vh, vw, -vh + vr);
  visorShape.lineTo(vw, vh - vr);
  visorShape.quadraticCurveTo(vw, vh, vw - vr, vh);
  visorShape.lineTo(-vw + vr, vh);
  visorShape.quadraticCurveTo(-vw, vh, -vw, vh - vr);
  visorShape.lineTo(-vw, -vh + vr);
  visorShape.quadraticCurveTo(-vw, -vh, -vw + vr, -vh);
  const visor = new THREE.Mesh(new THREE.ShapeGeometry(visorShape, 12), new THREE.MeshBasicMaterial({ color: PALETTE.night }));
  visor.position.set(0, 1.05, 0.481);
  visor.userData.portalColor = eyeColor;
  rig.add(visor);

  const face = new THREE.Group();
  face.position.set(0, 1.05, 0.49);
  const eyes = [-1, 1].map(side => {
    const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.12, 4, 12), kit.glow(eyeColor, 2.4));
    eye.position.x = side * 0.17;
    face.add(eye);
    return eye;
  });
  rig.add(face);

  // Antenna with a glowing tip.
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8), kit.neon(color, { bottom: 1.5, top: 1.85 }));
  stalk.position.y = 1.68;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), kit.glow(eyeColor, 2.8));
  tip.position.y = 1.88;
  rig.add(stalk, tip);

  // Floating hands: flattened spheres beside the head.
  const hands = [-1, 1].map(side => {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), kit.neon(color, { bottom: 0.4, top: 0.9, rimGain: 2.1 }));
    hand.scale.set(1, 0.85, 0.8);
    hand.userData.side = side;
    rig.add(hand);
    return hand;
  });

  // Hover ring under the head, and a light pool on the ground.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 48), kit.glow(eyeColor, 2.2));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.36;
  rig.add(ring);
  const pool = kit.halo(eyeColor, 0.9, 1.1);
  group.add(pool);

  const top = new THREE.Vector3(0, 1.95, 0);

  // update(t, { popAt, hop, look: [x, y], squint, cheer, hover })
  // hop is the start time of a jump; look is -1..1 in face space; squint and cheer are 0..1.
  function update(t, { popAt, hop, look, squint = 0, cheer = 0, hover = 1 } = {}) {
    const s = popAt === undefined ? 1 : Math.max(0.0001, kit.pop(t, popAt, 0.6));
    let y = 0.12 + Math.sin(t * 2.1 + phase) * 0.06 * hover;
    let tilt = Math.sin(t * 1.3 + phase) * 0.05 * hover;
    if (hop !== undefined) {
      const x = kit.progress(t, hop, 0.62);
      if (x > 0 && x < 1) {
        y += Math.sin(Math.PI * x) * 0.9;
        tilt += Math.sin(Math.PI * 2 * x) * 0.18;
      }
    }
    rig.position.y = y;
    rig.rotation.z = tilt;
    rig.scale.setScalar(s);
    pool.scale.setScalar(s * (1 - Math.min(0.6, y * 0.5)));

    const cycle = (t + blinkPhase) % blinkEvery;
    const blink = cycle < 0.16 ? Math.sin(Math.PI * cycle / 0.16) : 0;
    const open = Math.max(0.08, (1 - blink) * (1 - 0.75 * squint));
    const [lx, ly] = look || [Math.sin(t * 0.7 + phase) * 0.35, Math.sin(t * 0.43 + phase * 2) * 0.2];
    face.position.x = THREE.MathUtils.clamp(lx, -1, 1) * 0.13;
    face.position.y = 1.05 + THREE.MathUtils.clamp(ly, -1, 1) * 0.07;
    for (const eye of eyes) eye.scale.set(1, open, 1);

    const sway = Math.sin(t * 2.6 + phase);
    for (const hand of hands) {
      const side = hand.userData.side;
      hand.position.set(side * (0.82 + 0.05 * sway * side), 0.78 + 0.62 * cheer + 0.05 * Math.sin(t * 2.6 + phase + side), 0.12);
    }
    tip.scale.setScalar(1 + 0.25 * Math.max(0, Math.sin(t * 5 + phase)));
    ring.scale.setScalar(1 + 0.08 * Math.sin(t * 4.2 + phase));
  }
  update(0);
  return { group, hero: body, visor, top, update, portal: () => visor };
}
