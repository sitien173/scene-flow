// GLB loading for project models: one cached load per URL, clip-name checks, skeleton-safe clones, and seek-safe clip posing.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const loader = new GLTFLoader();
const cache = new Map();

// url is page-relative, such as "./vignettes/ship/ship.glb".
export function loadGlb(url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
}

// Throws when clipName is not one of availableNames, naming the model and the vignette.
export function validateClip(modelName, clipName, vignetteId, availableNames) {
  if (!clipName) return;
  if (!availableNames.includes(clipName)) {
    throw new Error(`vignette ${vignetteId} asks for unknown clip "${clipName}" in ${modelName} (has ${availableNames.join(", ") || "no clips"})`);
  }
}

// A copy of the GLB scene that can sit beside other copies; skinned meshes keep their own skeletons.
export function cloneGlb(gltf) {
  return SkeletonUtils.clone(gltf.scene);
}

// Poses root with a named clip at a time: pose(t) sets the clip time, never a time delta, so seeks in any order match.
export function clipPose(root, gltf, clipName, { speed = 1, phase = 0, loop = true } = {}) {
  const clip = THREE.AnimationClip.findByName(gltf.animations, clipName);
  if (!clip) throw new Error(`no clip "${clipName}" (has ${gltf.animations.map(a => a.name).join(", ") || "no clips"})`);
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.play();
  action.paused = true;
  const d = clip.duration;
  function pose(t) {
    const x = t * speed + phase;
    action.time = d > 0 ? (loop ? ((x % d) + d) % d : Math.min(d, Math.max(0, x))) : 0;
    mixer.update(0);
  }
  pose(0);
  return { mixer, clip, pose };
}
