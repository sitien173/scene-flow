// Actors for terra3d: cached GLB ship & humans (with civilian/worker look and clip validation), code-built container ship, and locomotive.
import * as THREE from "three";
import { followPath as applyPathTransform, rand } from "./motion.js";
import { loadGlb, validateClip, cloneGlb } from "./glb.js";

export { loadGlb, validateClip };

export const HIDDEN_NODES = {
  "Knight.glb": [
    "1H_Sword_Offhand", "Badge_Shield", "Rectangle_Shield", "Round_Shield", "Spike_Shield",
    "1H_Sword", "2H_Sword", "Knight_Helmet", "Knight_Cape",
  ],
  "Mage.glb": [
    "Spellbook", "Spellbook_open", "1H_Wand", "2H_Staff", "Mage_Hat", "Mage_Cape",
  ],
};

function makeHardHat(color = "#F6C431") {
  const hat = new THREE.Group();
  hat.name = "terra3d_hard_hat";
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, flatShading: true });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat);
  dome.position.y = 0.02;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.52, 0.05, 14), mat);
  brim.position.y = 0.02;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.62), mat);
  ridge.position.y = 0.41;
  hat.add(dome, brim, ridge);
  return hat;
}

// Animated KayKit human reskinned as a civilian worker/engineer (accessories hidden, work clothes + optional hard hat).
export async function human({
  model = "Knight.glb",
  clip = "Idle",
  vignetteId = "unknown",
  clipNames = null,
  scale = 1,
  speed = 1,
  phase = 0,
  shirtColor,
  sleeveColor,
  pantsColor = "#2B4A6F",
  hardHat = true,
  hatColor = "#F6C431",
  position = [0, 0, 0],
  rotationY = 0,
  from = null,
  to = null,
  start = 0,
  dur = 4,
  curve = "linear",
  shadow = true,
} = {}) {
  const modelName = model.endsWith(".glb") ? model : model + ".glb";
  if (clipNames) {
    validateClip(modelName, clip, vignetteId, clipNames);
  }
  const url = model.includes("/") ? model : `./assets/terra3d/models/${modelName}`;
  const gltf = await loadGlb(url);
  const available = gltf.animations.map(a => a.name);
  validateClip(modelName, clip, vignetteId, available);

  const root = new THREE.Group();
  const clone = cloneGlb(gltf);
  clone.scale.setScalar(scale);
  root.position.set(position[0], position[1], position[2]);
  root.rotation.y = rotationY;
  root.add(clone);

  const hiddenList = HIDDEN_NODES[modelName] || [];
  const defaultShirt = modelName === "Mage.glb" ? "#2E7CC4" : "#F27D24";
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor || defaultShirt, roughness: 0.78, flatShading: true });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: sleeveColor || shirtColor || defaultShirt, roughness: 0.8, flatShading: true });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.85, flatShading: true });

  let headBone = null;
  clone.traverse(node => {
    if (hiddenList.includes(node.name)) {
      node.visible = false;
      return;
    }
    if (node.name === "head") headBone = node;
    if (node.isMesh) {
      node.castShadow = !!shadow;
      node.receiveShadow = !!shadow;
      if (node.name.endsWith("_Body")) node.material = shirtMat;
      else if (node.name.endsWith("_ArmLeft") || node.name.endsWith("_ArmRight")) node.material = sleeveMat;
      else if (node.name.endsWith("_LegLeft") || node.name.endsWith("_LegRight")) node.material = pantsMat;
    }
  });

  if (hardHat && headBone) {
    const hat = makeHardHat(hatColor);
    hat.position.set(0, 0.72, 0.02);
    hat.traverse(m => { if (m.isMesh) { m.castShadow = !!shadow; m.receiveShadow = !!shadow; } });
    headBone.add(hat);
  }

  const mixer = new THREE.AnimationMixer(clone);
  const animClip = THREE.AnimationClip.findByName(gltf.animations, clip);
  const action = animClip ? mixer.clipAction(animClip) : null;
  const duration = animClip ? animClip.duration : 0;
  if (action) {
    action.play();
    action.paused = true;
  }

  function update(t) {
    applyPathTransform(root, t, { from, to, start, dur, curve });
    if (action) {
      action.time = duration > 0 ? (((t * speed + phase) % duration) + duration) % duration : 0;
      mixer.update(0);
    }
  }
  update(0);
  return { object: root, model: clone, mixer, hiddenNodes: hiddenList, update };
}

// Cached GLB sailing ship actor with optional path travel and heightAt wave motion.
export async function shipGlb({
  url = "./assets/terra3d/models/ship-large.glb",
  scale = 0.55,
  position = [0, 0, 0],
  rotationY = 0,
  from = null,
  to = null,
  start = 0,
  dur = 5,
  curve = "linear",
  heightAt = null,
  waterLevel = 0,
  shadow = true,
} = {}) {
  const gltf = await loadGlb(url);
  const root = new THREE.Group();
  const clone = cloneGlb(gltf);
  clone.scale.setScalar(scale);
  clone.traverse(node => {
    if (node.isMesh) {
      node.castShadow = !!shadow;
      node.receiveShadow = !!shadow;
    }
  });
  root.position.set(position[0], position[1], position[2]);
  root.rotation.y = rotationY;
  root.add(clone);

  function update(t) {
    if (from && to) {
      applyPathTransform(root, t, { from, to, start, dur, curve, heightAt, waterLevel });
    } else if (heightAt) {
      const y = heightAt(root.position.x, root.position.z, t);
      root.position.y = y + (position[1] - waterLevel);
    }
  }
  update(0);
  return { object: root, update };
}

// Code-built container ship with tapered bow, stern bridge, and one InstancedMesh of seeded containers.
export function containerShip({
  length = 12.5,
  beam = 2.8,
  hullHeight = 1.15,
  hullColor = "#1F3B57",
  deckColor = "#B84A39",
  cabinColor = "#F1F5F9",
  rows = 5,
  cols = 3,
  layers = 3,
  seed = 71,
  position = [0, 0, 0],
  rotationY = 0,
  from = null,
  to = null,
  start = 0,
  dur = 5,
  curve = "linear",
  heightAt = null,
  waterLevel = 0,
  shadow = true,
} = {}) {
  const root = new THREE.Group();
  root.position.set(position[0], position[1], position[2]);
  root.rotation.y = rotationY;

  const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.72, metalness: 0.1, flatShading: true });
  const deckMat = new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.8, flatShading: true });
  const cabinMat = new THREE.MeshStandardMaterial({ color: cabinColor, roughness: 0.65, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: "#1B2B3A", roughness: 0.5, flatShading: true });

  const bodyLen = length * 0.78;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(beam, hullHeight, bodyLen), hullMat);
  hull.position.set(0, hullHeight * 0.4, -length * 0.08);
  hull.castShadow = !!shadow;
  hull.receiveShadow = !!shadow;
  root.add(hull);

  // Tapered bow prism (+Z forward).
  const bowLen = length * 0.24;
  const bowGeom = new THREE.ConeGeometry(beam * 0.52, bowLen, 4);
  bowGeom.rotateY(Math.PI * 0.25);
  bowGeom.rotateX(Math.PI * 0.5);
  bowGeom.scale(1.0, hullHeight / (beam * 0.72), 1.0);
  const bow = new THREE.Mesh(bowGeom, hullMat);
  bow.position.set(0, hullHeight * 0.4, bodyLen * 0.5 - length * 0.08 + bowLen * 0.42);
  bow.castShadow = !!shadow;
  bow.receiveShadow = !!shadow;
  root.add(bow);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.94, 0.12, bodyLen * 0.94), deckMat);
  deck.position.set(0, hullHeight * 0.95, -length * 0.08);
  deck.receiveShadow = !!shadow;
  root.add(deck);

  // Stern bridge superstructure + funnel.
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.82, 1.45, 1.35), cabinMat);
  bridge.position.set(0, hullHeight * 0.95 + 0.72, -bodyLen * 0.5 - length * 0.08 + 0.85);
  bridge.castShadow = !!shadow;
  root.add(bridge);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.84, 0.28, 0.85), darkMat);
  glass.position.set(0, hullHeight * 0.95 + 1.15, bridge.position.z + 0.28);
  root.add(glass);

  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8), deckMat);
  funnel.position.set(0, hullHeight * 0.95 + 1.75, bridge.position.z - 0.25);
  funnel.castShadow = !!shadow;
  root.add(funnel);

  // Instanced containers on deck, seeded deterministically.
  const r = rand(seed);
  const palette = ["#E05A47", "#3A86C8", "#E6A83A", "#46A06C", "#7D6B9E"].map(c => new THREE.Color(c));
  const cw = (beam * 0.82) / cols;
  const cl = (bodyLen * 0.72) / rows;
  const ch = 0.48;
  const maxCount = rows * cols * layers;
  const cGeom = new THREE.BoxGeometry(cw * 0.9, ch * 0.92, cl * 0.92);
  const cMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.08, flatShading: true });
  const containers = new THREE.InstancedMesh(cGeom, cMat, maxCount);
  containers.castShadow = !!shadow;
  containers.receiveShadow = !!shadow;

  const m = new THREE.Matrix4();
  let idx = 0;
  const zStart = -bodyLen * 0.5 - length * 0.08 + 2.15;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const stackH = 1 + Math.floor(r() * layers);
      for (let ly = 0; ly < stackH; ly++) {
        const x = (col - (cols - 1) * 0.5) * cw;
        const y = hullHeight + 0.08 + (ly + 0.5) * ch;
        const z = zStart + row * cl;
        m.makeTranslation(x, y, z);
        containers.setMatrixAt(idx, m);
        containers.setColorAt(idx, palette[Math.floor(r() * palette.length)]);
        idx++;
      }
    }
  }
  containers.count = idx;
  containers.instanceMatrix.needsUpdate = true;
  if (containers.instanceColor) containers.instanceColor.needsUpdate = true;
  root.add(containers);

  function update(t) {
    if (from && to) {
      applyPathTransform(root, t, { from, to, start, dur, curve, heightAt, waterLevel });
    } else if (heightAt) {
      const y = heightAt(root.position.x, root.position.z, t);
      root.position.y = y + (position[1] - waterLevel);
    }
  }
  update(0);
  return { object: root, containers, update };
}

// Code-built industrial locomotive (+ optional freight cars) traveling cleanly along a line.
export function locomotive({
  cars = 1,
  bodyColor = "#D95D39",
  trimColor = "#F4C95D",
  darkColor = "#2B3440",
  position = [0, 0, 0],
  rotationY = 0,
  from = null,
  to = null,
  start = 0,
  dur = 4,
  curve = "linear",
  shadow = true,
} = {}) {
  const root = new THREE.Group();
  root.position.set(position[0], position[1], position[2]);
  root.rotation.y = rotationY;

  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.65, metalness: 0.12, flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.55, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: darkColor, roughness: 0.7, metalness: 0.2, flatShading: true });

  // Engine unit facing +Z.
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 3.2), darkMat);
  chassis.position.set(0, 0.34, 0);
  chassis.castShadow = !!shadow;
  root.add(chassis);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.85, 1.9), bodyMat);
  hood.position.set(0, 0.88, 0.45);
  hood.castShadow = !!shadow;
  root.add(hood);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.14, 1.94), trimMat);
  stripe.position.set(0, 0.82, 0.45);
  root.add(stripe);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.15, 0.98), bodyMat);
  cab.position.set(0, 1.03, -0.95);
  cab.castShadow = !!shadow;
  root.add(cab);

  const windowBand = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.34, 0.72), darkMat);
  windowBand.position.set(0, 1.28, -0.92);
  root.add(windowBand);

  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.42, 8), darkMat);
  stack.position.set(0, 1.48, 0.85);
  stack.castShadow = !!shadow;
  root.add(stack);

  const wheelGeom = new THREE.CylinderGeometry(0.22, 0.22, 1.16, 10);
  wheelGeom.rotateZ(Math.PI * 0.5);
  for (const wz of [-1.05, -0.35, 0.45, 1.1]) {
    const axle = new THREE.Mesh(wheelGeom, darkMat);
    axle.position.set(0, 0.22, wz);
    axle.castShadow = !!shadow;
    root.add(axle);
  }

  for (let c = 0; c < cars; c++) {
    const cz = -3.3 - c * 2.9;
    const flat = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.22, 2.5), darkMat);
    flat.position.set(0, 0.34, cz);
    flat.castShadow = !!shadow;
    root.add(flat);

    const cargo = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 2.0), trimMat);
    cargo.position.set(0, 0.8, cz);
    cargo.castShadow = !!shadow;
    root.add(cargo);

    for (const wz of [cz - 0.75, cz + 0.75]) {
      const axle = new THREE.Mesh(wheelGeom, darkMat);
      axle.position.set(0, 0.22, wz);
      root.add(axle);
    }
  }

  function update(t) {
    applyPathTransform(root, t, { from, to, start, dur, curve });
  }
  update(0);
  return { object: root, update };
}
