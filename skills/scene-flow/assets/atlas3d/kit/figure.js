// Chibi toon figure builder: original roly-poly proportions (~45% head), 4 expressions, 5 keyframe gestures, data-declared costumes, 6 presets, and inverted-hull outlines.
import * as THREE from "three";
import { PALETTE, toonMaterial, addToonWithHull } from "./look.js";
import { attachMapDiorama } from "./map.js";
import { clamp01, ease, lerp, pop, progress } from "./motion.js";

export const FIGURE_PRESETS = ["king", "soldier", "merchant", "farmer", "diplomat", "businessperson"];
export const FIGURE_EXPRESSIONS = ["neutral", "smile", "angry", "shocked"];
export const FIGURE_GESTURES = ["idle", "wave", "point", "hold", "shrug"];

const SKIN_TONE = "#F2C9A5";
const CHEEK_TONE = "#E88B7C";

// Costumes declared purely as data for the shared builder.
export const COSTUMES = {
  king: {
    torso: PALETTE.blue,
    pants: PALETTE.ink,
    boots: PALETTE.ink,
    collar: PALETTE.white,
    sash: PALETTE.route,
    cape: PALETTE.red,
    hat: { kind: "crown", color: PALETTE.route, band: PALETTE.red },
  },
  soldier: {
    torso: PALETTE.red,
    pants: PALETTE.ink,
    boots: PALETTE.ink,
    strap: PALETTE.white,
    belt: PALETTE.ink,
    buckle: PALETTE.route,
    hat: { kind: "shako", color: PALETTE.ink, band: PALETTE.route, plume: PALETTE.white },
  },
  merchant: {
    torso: PALETTE.paper,
    vest: PALETTE.orange,
    pants: "#57483A",
    boots: PALETTE.ink,
    sash: PALETTE.teal,
    hat: { kind: "beret", color: PALETTE.teal, feather: PALETTE.route },
  },
  farmer: {
    torso: PALETTE.paper,
    overalls: PALETTE.green,
    pants: PALETTE.green,
    boots: "#4B382A",
    hat: { kind: "straw", color: PALETTE.routeGlow, band: PALETTE.red },
  },
  diplomat: {
    torso: PALETTE.teal,
    pants: PALETTE.ink,
    boots: PALETTE.ink,
    cravat: PALETTE.white,
    sash: PALETTE.route,
    hat: { kind: "tophat", color: PALETTE.ink, band: PALETTE.route },
  },
  businessperson: {
    torso: PALETTE.ink,
    shirt: PALETTE.white,
    tie: PALETTE.red,
    pants: "#2C2E35",
    boots: PALETTE.ink,
    hat: { kind: "hairPart", color: "#3A2D24" },
  },
};

// Keyframe tables over normalized cycle phase u in [0, 1). Pure function of time.
const GESTURE_KEYS = {
  idle: {
    period: 1.4,
    keys: [
      { u: 0.0, bodyY: 0.0, bodyScaleY: 0.97, bodyScaleXZ: 1.02, torsoRotX: 0.0, torsoRotZ: 0.0, headRotX: 0.02, headRotY: 0.0, headRotZ: 0.0, lArmX: -0.06, lArmZ: 0.14, rArmX: 0.06, rArmZ: -0.14 },
      { u: 0.5, bodyY: 0.042, bodyScaleY: 1.03, bodyScaleXZ: 0.98, torsoRotX: 0.0, torsoRotZ: 0.0, headRotX: -0.03, headRotY: 0.0, headRotZ: 0.03, lArmX: 0.08, lArmZ: 0.18, rArmX: -0.08, rArmZ: -0.18 },
    ],
  },
  wave: {
    period: 1.05,
    keys: [
      { u: 0.0, bodyY: 0.0, bodyScaleY: 0.98, bodyScaleXZ: 1.01, torsoRotX: 0.0, torsoRotZ: -0.03, headRotX: -0.02, headRotY: 0.0, headRotZ: -0.08, lArmX: 0.05, lArmZ: 0.2, rArmX: -0.28, rArmZ: -2.18 },
      { u: 0.5, bodyY: 0.04, bodyScaleY: 1.03, bodyScaleXZ: 0.98, torsoRotX: 0.0, torsoRotZ: 0.04, headRotX: -0.05, headRotY: 0.0, headRotZ: 0.09, lArmX: -0.08, lArmZ: 0.25, rArmX: -0.42, rArmZ: -2.68 },
    ],
  },
  point: {
    period: 1.2,
    keys: [
      { u: 0.0, bodyY: 0.0, bodyScaleY: 0.99, bodyScaleXZ: 1.01, torsoRotX: 0.07, torsoRotZ: 0.0, headRotX: -0.04, headRotY: -0.08, headRotZ: 0.0, lArmX: 0.16, lArmZ: 0.18, rArmX: -1.32, rArmZ: -0.22 },
      { u: 0.5, bodyY: 0.024, bodyScaleY: 1.01, bodyScaleXZ: 0.99, torsoRotX: 0.1, torsoRotZ: 0.0, headRotX: -0.06, headRotY: -0.1, headRotZ: 0.02, lArmX: 0.2, lArmZ: 0.2, rArmX: -1.5, rArmZ: -0.26 },
    ],
  },
  hold: {
    period: 1.6,
    keys: [
      { u: 0.0, bodyY: 0.0, bodyScaleY: 0.98, bodyScaleXZ: 1.01, torsoRotX: 0.03, torsoRotZ: 0.0, headRotX: 0.02, headRotY: 0.0, headRotZ: 0.0, lArmX: -0.82, lArmZ: -0.28, rArmX: -1.04, rArmZ: 0.34 },
      { u: 0.5, bodyY: 0.026, bodyScaleY: 1.02, bodyScaleXZ: 0.99, torsoRotX: 0.01, torsoRotZ: 0.0, headRotX: -0.02, headRotY: 0.0, headRotZ: 0.02, lArmX: -0.9, lArmZ: -0.3, rArmX: -1.12, rArmZ: 0.36 },
    ],
  },
  shrug: {
    period: 1.35,
    keys: [
      { u: 0.0, bodyY: 0.01, bodyScaleY: 0.98, bodyScaleXZ: 1.02, torsoRotX: -0.02, torsoRotZ: 0.0, headRotX: 0.04, headRotY: 0.0, headRotZ: 0.12, lArmX: -0.38, lArmZ: 0.86, rArmX: -0.38, rArmZ: -0.86 },
      { u: 0.5, bodyY: 0.046, bodyScaleY: 1.03, bodyScaleXZ: 0.98, torsoRotX: -0.04, torsoRotZ: 0.0, headRotX: 0.02, headRotY: 0.05, headRotZ: -0.1, lArmX: -0.52, lArmZ: 1.04, rArmX: -0.52, rArmZ: -1.04 },
    ],
  },
};

function evalKeyframes(gestureName, t) {
  const spec = GESTURE_KEYS[gestureName] || GESTURE_KEYS.idle;
  const period = spec.period;
  const phase = (((t % period) + period) % period) / period;
  const keys = spec.keys;
  if (keys.length === 1) return keys[0];
  let i0 = 0;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].u <= phase) i0 = i;
  }
  const i1 = (i0 + 1) % keys.length;
  const k0 = keys[i0];
  const k1 = keys[i1];
  const span = i1 > i0 ? k1.u - k0.u : 1 - k0.u + k1.u;
  const local = i1 > i0 ? phase - k0.u : (phase >= k0.u ? phase - k0.u : 1 - k0.u + phase);
  const w = ease(clamp01(local / Math.max(span, 1e-4)), "inOut");
  const out = {};
  for (const prop of Object.keys(k0)) {
    if (prop === "u") continue;
    out[prop] = lerp(k0[prop], k1[prop], w);
  }
  return out;
}

function addHat(headPivot, hat, thickness) {
  if (!hat) return;
  const yTop = 0.21;
  if (hat.kind === "crown") {
    const base = new THREE.CylinderGeometry(0.14, 0.125, 0.08, 14);
    const m = addToonWithHull(headPivot, base, hat.color, { thickness });
    m.position.set(0, yTop + 0.02, 0);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.13, 0.024, 14), toonMaterial(hat.band));
    band.position.set(0, yTop - 0.004, 0);
    headPivot.add(band);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const tip = addToonWithHull(headPivot, new THREE.ConeGeometry(0.032, 0.075, 8), hat.color, { thickness: thickness * 0.7 });
      tip.position.set(Math.cos(ang) * 0.105, yTop + 0.085, Math.sin(ang) * 0.105);
    }
  } else if (hat.kind === "shako") {
    const brim = addToonWithHull(headPivot, new THREE.CylinderGeometry(0.175, 0.175, 0.022, 16), hat.color, { thickness });
    brim.position.set(0, yTop - 0.01, 0.03);
    const body = addToonWithHull(headPivot, new THREE.CylinderGeometry(0.145, 0.13, 0.17, 16), hat.color, { thickness });
    body.position.set(0, yTop + 0.075, 0);
    const badge = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), toonMaterial(hat.band));
    badge.position.set(0, yTop + 0.085, 0.142);
    const plume = addToonWithHull(headPivot, new THREE.SphereGeometry(0.038, 10, 8), hat.plume, { thickness: thickness * 0.7 });
    plume.scale.set(0.8, 1.5, 0.8);
    plume.position.set(0, yTop + 0.19, 0.03);
    headPivot.add(badge);
  } else if (hat.kind === "beret") {
    const cap = addToonWithHull(headPivot, new THREE.SphereGeometry(0.19, 16, 12), hat.color, { thickness });
    cap.scale.set(1.15, 0.45, 1.12);
    cap.position.set(0.02, yTop + 0.02, -0.01);
    cap.rotation.z = -0.14;
    const feather = addToonWithHull(headPivot, new THREE.ConeGeometry(0.022, 0.14, 8), hat.feather, { thickness: thickness * 0.65 });
    feather.position.set(0.16, yTop + 0.07, -0.02);
    feather.rotation.z = -0.55;
  } else if (hat.kind === "straw") {
    const brim = addToonWithHull(headPivot, new THREE.CylinderGeometry(0.29, 0.305, 0.022, 20), hat.color, { thickness });
    brim.position.set(0, yTop - 0.01, 0);
    const crown = addToonWithHull(headPivot, new THREE.CylinderGeometry(0.135, 0.155, 0.1, 18), hat.color, { thickness });
    crown.position.set(0, yTop + 0.045, 0);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.157, 0.159, 0.026, 18), toonMaterial(hat.band));
    band.position.set(0, yTop + 0.012, 0);
    headPivot.add(band);
  } else if (hat.kind === "tophat") {
    const brim = addToonWithHull(headPivot, new THREE.CylinderGeometry(0.22, 0.22, 0.022, 18), hat.color, { thickness });
    brim.position.set(0, yTop - 0.01, 0);
    const crown = addToonWithHull(headPivot, new THREE.CylinderGeometry(0.15, 0.14, 0.19, 18), hat.color, { thickness });
    crown.position.set(0, yTop + 0.085, 0);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.144, 0.143, 0.032, 18), toonMaterial(hat.band));
    band.position.set(0, yTop + 0.016, 0);
    headPivot.add(band);
  } else if (hat.kind === "hairPart") {
    const cap = addToonWithHull(headPivot, new THREE.SphereGeometry(0.232, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hat.color, { thickness: thickness * 0.85 });
    cap.scale.set(1.04, 0.92, 0.98);
    cap.position.set(0, 0.02, -0.015);
    cap.rotation.x = -0.18;
    const tuft = addToonWithHull(headPivot, new THREE.SphereGeometry(0.068, 10, 8), hat.color, { thickness: thickness * 0.7 });
    tuft.scale.set(1.3, 0.65, 0.9);
    tuft.position.set(-0.06, 0.21, 0.08);
    tuft.rotation.z = 0.25;
  }
}

export function createFigure(preset = "diplomat", options = {}) {
  const costume = COSTUMES[preset];
  if (!costume) {
    throw new Error("atlas3d figure: unknown preset " + JSON.stringify(preset) + " (expected one of " + FIGURE_PRESETS.join(", ") + ")");
  }
  const {
    expression: initialExpr = "neutral",
    gesture: initialGesture = "idle",
    scale = 1,
    position = null,
    rotationY = 0,
    at = 0,
    popDur = 0.45,
    outAt = Infinity,
    outDur = 0.35,
    hold = null,
  } = options;

  const thickness = 0.022;
  const root = new THREE.Group();
  root.userData.atlasHero = "figure";
  root.userData.preset = preset;
  if (position) {
    if (Array.isArray(position)) root.position.set(position[0], position[1], position[2]);
    else root.position.copy(position);
  }

  const dioramaPivot = new THREE.Group();
  root.add(dioramaPivot);
  attachMapDiorama(root, dioramaPivot, {
    rotationY,
    mapFacing: options.mapFacing ?? true,
    mapScale: options.mapScale ?? 1.15,
    lift: 0.14,
  });

  const bodyPivot = new THREE.Group();
  dioramaPivot.add(bodyPivot);

  // Feet / boots resting at y = 0.02..0.11 (so inflated hull stays above y = 0 and never z-fights with map).
  for (const side of [-1, 1]) {
    const foot = addToonWithHull(bodyPivot, new THREE.CapsuleGeometry(0.056, 0.04, 6, 10), costume.boots, {
      thickness: thickness * 0.8,
      minY: -0.045,
    });
    foot.rotation.x = Math.PI / 2;
    foot.position.set(side * 0.095, 0.062, 0.02);
  }

  // Roly-poly torso (y = 0.08 to 0.55).
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.1, 0);
  bodyPivot.add(torsoPivot);

  const torsoMesh = addToonWithHull(torsoPivot, new THREE.SphereGeometry(0.245, 18, 14), costume.torso, { thickness });
  torsoMesh.scale.set(1.04, 1.0, 0.94);
  torsoMesh.position.set(0, 0.22, 0);

  // Costume body details (data-driven from COSTUMES).
  if (costume.vest) {
    const vest = addToonWithHull(
      torsoPivot,
      new THREE.SphereGeometry(0.252, 18, 14, 0.45, Math.PI * 1.72, Math.PI * 0.16, Math.PI * 0.68),
      costume.vest,
      { thickness: thickness * 0.7 },
    );
    vest.scale.set(1.04, 1.0, 0.94);
    vest.position.set(0, 0.22, 0);
  }
  if (costume.overalls) {
    const pantsShell = addToonWithHull(
      torsoPivot,
      new THREE.SphereGeometry(0.252, 18, 14, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52),
      costume.overalls,
      { thickness: thickness * 0.7 },
    );
    pantsShell.scale.set(1.04, 1.0, 0.94);
    pantsShell.position.set(0, 0.22, 0);
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.045), toonMaterial(costume.overalls));
    bib.position.set(0, 0.27, 0.215);
    bib.castShadow = true;
    torsoPivot.add(bib);
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.16), toonMaterial(costume.overalls));
      strap.position.set(side * 0.08, 0.36, 0.08);
      strap.rotation.x = 0.25;
      torsoPivot.add(strap);
    }
  }
  if (costume.cape) {
    const cape = addToonWithHull(torsoPivot, new THREE.ConeGeometry(0.27, 0.42, 12, 1, false, Math.PI * 0.65, Math.PI * 0.7), costume.cape, { thickness: thickness * 0.75 });
    cape.position.set(0, 0.2, -0.06);
  }
  if (costume.collar) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.036, 8, 16), toonMaterial(costume.collar));
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.415, 0.01);
    torsoPivot.add(collar);
  }
  if (costume.cravat) {
    const cravat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.045), toonMaterial(costume.cravat));
    cravat.position.set(0, 0.36, 0.21);
    torsoPivot.add(cravat);
  }
  if (costume.shirt) {
    const shirt = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.18, 6), toonMaterial(costume.shirt));
    shirt.rotation.z = Math.PI;
    shirt.position.set(0, 0.34, 0.215);
    torsoPivot.add(shirt);
  }
  if (costume.tie) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.16, 0.025), toonMaterial(costume.tie));
    tie.position.set(0, 0.28, 0.242);
    torsoPivot.add(tie);
  }
  if (costume.strap) {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.02, 8, 18), toonMaterial(costume.strap));
    strap.rotation.set(0.45, 0.1, 0.65);
    strap.position.set(0, 0.24, 0.01);
    torsoPivot.add(strap);
  }
  if (costume.sash || costume.belt) {
    const beltColor = costume.sash || costume.belt;
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.248, 0.248, 0.052, 18), toonMaterial(beltColor));
    belt.scale.set(1.04, 1, 0.95);
    belt.position.set(0, 0.16, 0);
    torsoPivot.add(belt);
    if (costume.buckle) {
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.065, 0.03), toonMaterial(costume.buckle));
      buckle.position.set(0, 0.16, 0.238);
      torsoPivot.add(buckle);
    }
  }

  // Stubby arms pivoted at shoulders.
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.245, 0.35, 0);
    const armColor = costume.vest || costume.overalls ? costume.torso : costume.torso;
    const sleeve = addToonWithHull(pivot, new THREE.CapsuleGeometry(0.054, 0.13, 6, 10), armColor, { thickness: thickness * 0.75 });
    sleeve.position.set(side * 0.015, -0.095, 0);
    const hand = addToonWithHull(pivot, new THREE.SphereGeometry(0.056, 10, 8), SKIN_TONE, { thickness: thickness * 0.7 });
    hand.position.set(side * 0.02, -0.19, 0.01);
    torsoPivot.add(pivot);
    return { pivot, hand };
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  const handAnchor = new THREE.Group();
  handAnchor.position.set(0.02, -0.21, 0.08);
  rightArm.pivot.add(handAnchor);
  if (hold) handAnchor.add(hold);

  // Head pivot at y = 0.55; head diameter = 0.45 (45% of 1.00 canonical height).
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.45, 0);
  torsoPivot.add(headPivot);

  const headCenterY = 0.225;
  const headHolder = new THREE.Group();
  headHolder.position.set(0, headCenterY, 0);
  headPivot.add(headHolder);

  const headMesh = addToonWithHull(headHolder, new THREE.SphereGeometry(0.225, 22, 16), SKIN_TONE, { thickness });
  headMesh.scale.set(1.06, 1.0, 0.98);

  // Facial features: dot eyes, eyebrows, 4 distinct mouth expressions, smile cheeks.
  const eyeGeo = new THREE.SphereGeometry(0.026, 10, 8);
  const eyeMat = toonMaterial(PALETTE.ink);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.scale.set(1, 1.15, 0.45);
    eye.position.set(side * 0.082, 0.01, 0.215);
    headHolder.add(eye);
  }

  const browGeo = new THREE.BoxGeometry(0.068, 0.018, 0.018);
  const browMat = toonMaterial(PALETTE.ink);
  const leftBrow = new THREE.Mesh(browGeo, browMat);
  const rightBrow = new THREE.Mesh(browGeo, browMat);
  leftBrow.position.set(-0.084, 0.068, 0.214);
  rightBrow.position.set(0.084, 0.068, 0.214);
  headHolder.add(leftBrow, rightBrow);

  const cheeks = [];
  const cheekGeo = new THREE.SphereGeometry(0.032, 10, 8);
  const cheekMat = toonMaterial(CHEEK_TONE);
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(cheekGeo, cheekMat);
    cheek.scale.set(1.2, 0.75, 0.3);
    cheek.position.set(side * 0.132, -0.032, 0.195);
    headHolder.add(cheek);
    cheeks.push(cheek);
  }

  const mouthNeutral = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.015, 0.018), browMat);
  mouthNeutral.position.set(0, -0.062, 0.214);

  const mouthSmile = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.011, 8, 14, Math.PI), browMat);
  mouthSmile.rotation.z = Math.PI;
  mouthSmile.position.set(0, -0.042, 0.216);

  const mouthAngry = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.011, 8, 14, Math.PI), browMat);
  mouthAngry.position.set(0, -0.082, 0.216);

  const mouthShocked = new THREE.Group();
  const shockedOuter = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 10), browMat);
  shockedOuter.scale.set(0.82, 1.18, 0.35);
  const shockedInner = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), toonMaterial("#A6443B"));
  shockedInner.scale.set(0.75, 0.85, 0.4);
  shockedInner.position.set(0, -0.008, 0.008);
  mouthShocked.add(shockedOuter, shockedInner);
  mouthShocked.position.set(0, -0.068, 0.214);

  headHolder.add(mouthNeutral, mouthSmile, mouthAngry, mouthShocked);
  addHat(headHolder, costume.hat, thickness);

  function setExpression(name = "neutral") {
    if (!FIGURE_EXPRESSIONS.includes(name)) {
      throw new Error("atlas3d figure: unknown expression " + JSON.stringify(name));
    }
    mouthNeutral.visible = name === "neutral";
    mouthSmile.visible = name === "smile";
    mouthAngry.visible = name === "angry";
    mouthShocked.visible = name === "shocked";
    for (const c of cheeks) c.visible = name === "smile";

    if (name === "neutral") {
      leftBrow.position.y = 0.068;
      rightBrow.position.y = 0.068;
      leftBrow.rotation.z = 0;
      rightBrow.rotation.z = 0;
    } else if (name === "smile") {
      leftBrow.position.y = 0.078;
      rightBrow.position.y = 0.078;
      leftBrow.rotation.z = 0.14;
      rightBrow.rotation.z = -0.14;
    } else if (name === "angry") {
      leftBrow.position.y = 0.056;
      rightBrow.position.y = 0.056;
      leftBrow.rotation.z = -0.38;
      rightBrow.rotation.z = 0.38;
    } else if (name === "shocked") {
      leftBrow.position.y = 0.096;
      rightBrow.position.y = 0.096;
      leftBrow.rotation.z = 0.2;
      rightBrow.rotation.z = -0.2;
    }
  }

  function update(localTime, overrides = null) {
    const t = Number.isFinite(localTime) ? localTime : 0;
    const inS = pop(t, at, popDur);
    const outS = outAt < Infinity ? 1 - ease(progress(t, outAt - outDur, outDur), "in") : 1;
    const s = Math.max(0, inS * outS);

    if (s <= 0.01) {
      root.visible = false;
      root.scale.setScalar(0.001);
      return;
    }
    root.visible = true;
    root.scale.setScalar(scale * s);

    const expr = (overrides && overrides.expression) || initialExpr;
    const gesture = (overrides && overrides.gesture) || initialGesture;
    setExpression(expr);

    const k = evalKeyframes(gesture, Math.max(0, t - at));
    bodyPivot.position.y = k.bodyY;
    bodyPivot.scale.set(k.bodyScaleXZ, k.bodyScaleY, k.bodyScaleXZ);
    torsoPivot.rotation.set(k.torsoRotX, 0, k.torsoRotZ);
    headPivot.rotation.set(k.headRotX, k.headRotY, k.headRotZ);
    leftArm.pivot.rotation.set(k.lArmX, 0, k.lArmZ);
    rightArm.pivot.rotation.set(k.rArmX, 0, k.rArmZ);
  }

  update(at + popDur);
  return { group: root, update, setExpression, handAnchor, preset };
}
