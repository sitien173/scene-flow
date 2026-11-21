// The toon3d kit handed to every vignette's build(kit). It holds the look, the stage, the camera moves, and the pill label.
// It holds no characters or objects; those are models under vignettes/.
import * as THREE from "three";
import { PALETTE, toon, ink, shadows, panelTexture, stage, concreteTexture, road, lawn } from "./look.js";
import { clamp01, lerp, ease, progress, pop, popIn, rand, dolly } from "./motion.js";
import { iso, push, orbit, whip, chain, crane } from "./camera.js";
import { rain, ripples, sun, cableLights } from "./fx.js";
import { pill, flash, counterTags, projectPoint } from "./overlay.js";
import { loadGlb, validateClip, cloneGlb, clipPose } from "./glb.js";

export function createKit({ id, beats = {}, layer = null }) {
  const overlays = [];
  return {
    THREE, PALETTE, id, layer,
    toon, ink, shadows, panelTexture, stage, concreteTexture, road, lawn,
    clamp01, lerp, ease, progress, pop, popIn, rand, dolly,
    iso, push, orbit, whip, chain, crane,
    rain, ripples, sun, cableLights,
    projectPoint,
    loadGlb, validateClip, cloneGlb, clipPose,
    pill: opts => {
      const item = pill(layer, opts);
      overlays.push(item);
      return item;
    },
    // Numbered counter: a white number over each anchor, and a yellow multiplier badge. A DOM overlay, so its edges are checkable.
    counter: opts => {
      const item = counterTags(layer, opts);
      overlays.push(item);
      return item;
    },
    flash: opts => {
      const item = flash(layer, opts);
      overlays.push(item);
      return item;
    },
    updateOverlays(t, camera) {
      for (let i = 0; i < overlays.length; i++) overlays[i].update(t, camera);
    },
    // Portrait camera: 1080 x 1920.
    camera: (fov = 36) => new THREE.PerspectiveCamera(fov, 1080 / 1920, 0.1, 160),
    // Seconds from the vignette start to a beat named in vignettes.json.
    beat(name) {
      if (!(name in beats)) throw new Error("toon3d: vignette " + id + " has no beat " + JSON.stringify(name));
      return beats[name];
    },
  };
}
