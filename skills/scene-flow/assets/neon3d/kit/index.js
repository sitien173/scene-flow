// The neon3d kit handed to every vignette's build(kit).
import * as THREE from "three";
import { PALETTE, stage, neon, glow, halo, canvasTexture } from "./look.js";
import { blob } from "./blob.js";
import { network, maze, hexCore, uiWindow, laptop, serverRack } from "./props.js";
import { loadGlb, validateClip, cloneGlb, clipPose } from "./glb.js";
import { clamp01, lerp, ease, progress, pop, rand, dolly, orbit, pixels, trail, type } from "./motion.js";

export function createKit({ id, beats = {}, layer }) {
  return {
    THREE, PALETTE, id, layer,
    stage, neon, glow, halo, canvasTexture,
    blob, network, maze, hexCore, uiWindow, laptop, serverRack,
    clamp01, lerp, ease, progress, pop, rand, dolly, orbit, pixels, trail,
    loadGlb, validateClip, cloneGlb, clipPose,
    type: (text, options) => type(layer, text, options),
    // Portrait camera: 1080 x 1920.
    camera: (fov = 40) => new THREE.PerspectiveCamera(fov, 1080 / 1920, 0.1, 120),
    // Seconds from the vignette start to a beat named in vignettes.json.
    beat(name) {
      if (!(name in beats)) throw new Error("neon3d: vignette " + id + " has no beat " + JSON.stringify(name));
      return beats[name];
    },
  };
}
