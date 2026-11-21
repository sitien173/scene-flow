// A chibi townsperson for the atlas3d map: bell-shaped coat, big round head, mitten hands, and an ink
// outline on every part. One body, five outfits picked by role. Expressions and gestures are pure functions
// of time, so any frame can be seeked in any order.
const ROLES = {
  king: { coat: "#3B6FA0", trim: "#F0B429", hat: "crown", hatColor: "#F0B429", accent: "#BD4B3B", cape: "#BD4B3B" },
  soldier: { coat: "#BD4B3B", trim: "#F3EEE4", hat: "bicorne", hatColor: "#1A1612", accent: "#F0B429" },
  merchant: { coat: "#D9832B", trim: "#F6EEDC", hat: "cap", hatColor: "#2C8276", accent: "#2C8276" },
  diplomat: { coat: "#2C8276", trim: "#F3EEE4", hat: "tricorne", hatColor: "#1A1612", accent: "#F0B429" },
  farmer: { coat: "#4D8450", trim: "#F6EEDC", hat: "straw", hatColor: "#FFE28A", accent: "#BD4B3B" },
};
const EXPRESSIONS = ["neutral", "smile", "angry", "shocked"];
const GESTURES = ["idle", "wave", "point", "hold", "shrug"];
const SKIN = "#F2C9A5";

export function townsfolk(kit, opts = {}) {
  const { THREE, look } = kit;
  const { role = "merchant", expression = "neutral", gesture = "idle", at = 0, popDur = 0.45 } = opts;
  const style = ROLES[role];
  if (!style) throw new Error("townsfolk: unknown role " + JSON.stringify(role) + " (expected " + Object.keys(ROLES).join(", ") + ")");
  const ink = look.PALETTE.ink;
  const line = 0.02;

  const group = new THREE.Group();
  group.userData.atlasHero = "townsfolk";
  const { pivot, baseScale } = kit.place(group, opts, { mapFacing: true, mapScale: 1.15, lift: 0.14 });
  const body = new THREE.Group();
  pivot.add(body);
  const hull = (parent, geo, color, extra = {}) => look.addToonWithHull(parent, geo, color, { thickness: line, ...extra });
  const flat = (parent, geo, color) => { const m = new THREE.Mesh(geo, look.toonMaterial(color)); parent.add(m); return m; };

  // Shoes, then a bell coat turned from a profile curve so the hem flares out over them.
  for (const side of [-1, 1]) {
    // minY stops the hull at the sole, which sits at y = 0.023, so it never z-fights with the map.
    const shoe = hull(body, new THREE.SphereGeometry(0.07, 12, 8), ink, { minY: -0.07, thickness: line * 0.8 });
    shoe.scale.set(0.9, 0.6, 1.25);
    shoe.position.set(side * 0.09, 0.065, 0.03);
  }
  const profile = [[0.0, 0.08], [0.25, 0.08], [0.27, 0.12], [0.24, 0.3], [0.19, 0.46], [0.12, 0.55], [0.0, 0.57]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const coat = hull(body, new THREE.LatheGeometry(profile, 20), style.coat, { minY: 0.01 });
  const hem = flat(body, new THREE.TorusGeometry(0.255, 0.02, 6, 24), style.trim);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.11;
  const buttons = [0.22, 0.32, 0.42].map((y) => {
    const b = flat(body, new THREE.SphereGeometry(0.018, 8, 6), style.trim);
    b.position.set(0, y, 0.255 - (y - 0.2) * 0.33);
    return b;
  });
  if (style.cape) {
    const cape = hull(body, new THREE.CylinderGeometry(0.16, 0.29, 0.44, 16, 1, true, Math.PI * 0.7, Math.PI * 0.6), style.cape, { thickness: line * 0.7 });
    cape.position.set(0, 0.33, -0.02);
    cape.material.side = THREE.DoubleSide;
  }

  // Arms hang from shoulder pivots; the mitten is a child so gestures move it with the sleeve.
  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.17, 0.47, 0);
    body.add(shoulder);
    const sleeve = hull(shoulder, new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), style.coat, { thickness: line * 0.75 });
    sleeve.position.set(side * 0.03, -0.09, 0);
    const mitten = hull(shoulder, new THREE.SphereGeometry(0.055, 10, 8), SKIN, { thickness: line * 0.7 });
    mitten.position.set(side * 0.04, -0.19, 0.01);
    return shoulder;
  });
  const hand = new THREE.Group();
  hand.position.set(0.04, -0.22, 0.07);
  arms[1].add(hand);

  // Head: 0.46 wide on a 1.0 tall figure, the chibi ratio the atlas3d guide asks for.
  const neck = new THREE.Group();
  neck.position.set(0, 0.55, 0);
  body.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.22;
  neck.add(head);
  hull(head, new THREE.SphereGeometry(0.23, 22, 16), SKIN).scale.set(1.04, 0.97, 0.98);
  const eyes = [-1, 1].map((side) => {
    const eye = flat(head, new THREE.SphereGeometry(0.03, 10, 8), ink);
    eye.scale.set(0.85, 1.2, 0.4);
    eye.position.set(side * 0.08, 0.015, 0.216);
    const glint = flat(head, new THREE.SphereGeometry(0.009, 6, 4), "#FFFFFF");
    glint.position.set(side * 0.08 + 0.008, 0.03, 0.228);
    return eye;
  });
  const brows = [-1, 1].map((side) => {
    const brow = flat(head, new THREE.CapsuleGeometry(0.01, 0.05, 2, 6), ink);
    brow.rotation.z = Math.PI / 2;
    brow.position.set(side * 0.085, 0.08, 0.212);
    return brow;
  });
  const blush = [-1, 1].map((side) => {
    const c = flat(head, new THREE.SphereGeometry(0.03, 8, 6), "#E88B7C");
    c.scale.set(1.3, 0.7, 0.3);
    c.position.set(side * 0.135, -0.035, 0.192);
    return c;
  });
  const mouths = {
    neutral: flat(head, new THREE.CapsuleGeometry(0.008, 0.04, 2, 6), ink),
    smile: flat(head, new THREE.TorusGeometry(0.04, 0.01, 6, 12, Math.PI), ink),
    angry: flat(head, new THREE.TorusGeometry(0.038, 0.01, 6, 12, Math.PI), ink),
    shocked: flat(head, new THREE.SphereGeometry(0.036, 12, 8), "#7A2E26"),
  };
  mouths.neutral.rotation.z = Math.PI / 2;
  mouths.neutral.position.set(0, -0.065, 0.214);
  mouths.smile.rotation.z = Math.PI;
  mouths.smile.position.set(0, -0.045, 0.216);
  mouths.angry.position.set(0, -0.09, 0.214);
  mouths.shocked.scale.set(0.8, 1.15, 0.35);
  mouths.shocked.position.set(0, -0.07, 0.212);

  // Hats sit on the crown of the head at y = 0.19.
  const top = 0.19;
  if (style.hat === "crown") {
    const band = hull(head, new THREE.CylinderGeometry(0.13, 0.12, 0.07, 16), style.hatColor);
    band.position.y = top + 0.02;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const point = hull(head, new THREE.ConeGeometry(0.028, 0.07, 6), style.hatColor, { thickness: line * 0.6 });
      point.position.set(Math.cos(a) * 0.11, top + 0.085, Math.sin(a) * 0.11);
    }
    flat(head, new THREE.SphereGeometry(0.022, 8, 6), style.accent).position.set(0, top + 0.02, 0.125);
  } else if (style.hat === "bicorne" || style.hat === "tricorne") {
    const brim = hull(head, new THREE.CylinderGeometry(0.25, 0.25, 0.03, style.hat === "tricorne" ? 3 : 24), style.hatColor);
    brim.position.y = top;
    if (style.hat === "bicorne") brim.scale.set(1.25, 1, 0.55);
    else brim.rotation.y = Math.PI;
    const crown = hull(head, new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), style.hatColor);
    crown.position.y = top;
    crown.scale.set(1, 0.75, 1);
    flat(head, new THREE.SphereGeometry(0.03, 8, 6), style.accent).position.set(0, top + 0.06, 0.14);
  } else if (style.hat === "cap") {
    const crown = hull(head, new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), style.hatColor);
    crown.position.y = top - 0.06;
    crown.scale.set(1.12, 0.6, 1.12);
    const peak = hull(head, new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16, 1, false, -Math.PI / 2, Math.PI), style.hatColor);
    peak.position.set(0, top - 0.05, 0.13);
  } else if (style.hat === "straw") {
    const brim = hull(head, new THREE.CylinderGeometry(0.3, 0.31, 0.02, 24), style.hatColor);
    brim.position.y = top - 0.01;
    const crown = hull(head, new THREE.CylinderGeometry(0.13, 0.15, 0.1, 18), style.hatColor);
    crown.position.y = top + 0.045;
    flat(head, new THREE.CylinderGeometry(0.152, 0.152, 0.025, 18), style.accent).position.y = top + 0.01;
  }

  function setExpression(name) {
    if (!EXPRESSIONS.includes(name)) throw new Error("townsfolk: unknown expression " + JSON.stringify(name));
    for (const [key, mesh] of Object.entries(mouths)) mesh.visible = key === name;
    for (const c of blush) c.visible = name === "smile";
    const tilt = { neutral: 0, smile: 0.15, angry: -0.4, shocked: 0.22 }[name];
    const lift = { neutral: 0.08, smile: 0.09, angry: 0.066, shocked: 0.105 }[name];
    brows.forEach((b, i) => { b.position.y = lift; b.rotation.z = Math.PI / 2 + (i ? -tilt : tilt); });
    eyes.forEach((e) => e.scale.set(0.85, name === "shocked" ? 1.45 : 1.2, 0.4));
  }

  // Each gesture is a rest pose plus a small loop: [left arm x, left arm z, right arm x, right arm z, head z].
  const POSES = {
    idle: { rest: [0, 0.16, 0, -0.16, 0], swing: [0.08, 0.03, -0.08, -0.03, 0.03], rate: 4.5 },
    wave: { rest: [0, 0.2, -0.3, -2.4, -0.06], swing: [0, 0.03, 0, -0.28, 0.08], rate: 6 },
    point: { rest: [0.15, 0.18, -1.4, -0.24, 0], swing: [0, 0, -0.08, 0, 0.02], rate: 5 },
    hold: { rest: [-0.85, -0.3, -1.05, 0.34, 0], swing: [-0.04, 0, -0.04, 0, 0.02], rate: 4 },
    shrug: { rest: [-0.45, 0.95, -0.45, -0.95, 0.1], swing: [-0.06, 0.1, -0.06, -0.1, -0.12], rate: 4.6 },
  };

  function update(t, overrides = {}) {
    const s = kit.popWindow(group, t, { ...opts, baseScale });
    if (s <= 0) return;
    const name = overrides.gesture || gesture;
    if (!GESTURES.includes(name)) throw new Error("townsfolk: unknown gesture " + JSON.stringify(name));
    setExpression(overrides.expression || expression);
    const pose = POSES[name];
    const w = Math.sin(Math.max(0, t - at) * pose.rate) * 0.5 + 0.5;
    const p = pose.rest.map((r, i) => r + pose.swing[i] * w);
    arms[0].rotation.set(p[0], 0, p[1]);
    arms[1].rotation.set(p[2], 0, p[3]);
    neck.rotation.set(0, 0, p[4]);
    body.position.y = 0.035 * w;
    body.scale.set(1.02 - 0.04 * w, 0.97 + 0.06 * w, 1.02 - 0.04 * w);
  }

  update(at + popDur);
  return kit.hero({ group, hero: group, hand, update, setExpression, role });
}
