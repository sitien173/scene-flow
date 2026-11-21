// The terra3d kit handed to every vignette's build(kit).
import * as THREE from "three";
import { PALETTE, stage, matte, glow, canvasTexture, loadTexture, loadSky } from "./look.js";
import { clamp01, lerp, ease, progress, pop, rand, dolly, followPath } from "./motion.js";
import { drone, orbit, track, topdown, ground, crane } from "./camera.js";
import { ocean, oceanMaterial, WAVES, heightAt, gerstnerAt } from "./ocean.js";
import { terrain, terrainHeight, createHeightfield } from "./terrain.js";
import { rain, swarm, fleet } from "./particles.js";
import { globe, routeArc, globeZoom, latLonToVec3 } from "./globe.js";
import { cutaway, chamberLevel, gateAngle } from "./cutaway.js";
import { loadGlb, validateClip, cloneGlb, clipPose } from "./glb.js";
import { callout, pill, ibar, span, countValue, projectPoint } from "./overlay.js";

export function createKit({ id, beats = {}, layer = null }) {
  const overlays = [];
  const trackOverlay = item => {
    overlays.push(item);
    return item;
  };
  return {
    THREE, PALETTE, id, layer,
    stage, matte, glow, canvasTexture, loadTexture, loadSky,
    clamp01, lerp, ease, progress, pop, rand, dolly, followPath,
    drone, orbit, track, topdown, ground, crane,
    ocean, oceanMaterial, WAVES, heightAt, gerstnerAt,
    terrain, terrainHeight, createHeightfield,
    rain, swarm, fleet,
    globe, routeArc, globeZoom, latLonToVec3,
    cutaway, chamberLevel, gateAngle,
    loadGlb, validateClip, cloneGlb, clipPose,
    countValue, projectPoint,
    callout: opts => trackOverlay(callout(layer, opts)),
    pill: opts => trackOverlay(pill(layer, opts)),
    ibar: opts => trackOverlay(ibar(layer, opts)),
    span: opts => trackOverlay(span(layer, opts)),
    updateOverlays(t, camera) {
      for (let i = 0; i < overlays.length; i++) overlays[i].update(t, camera);
    },
    // Portrait camera: 1080 x 1920.
    camera: (fov = 40) => new THREE.PerspectiveCamera(fov, 1080 / 1920, 0.1, 160),
    // Seconds from the vignette start to a beat named in vignettes.json.
    beat(name) {
      if (!(name in beats)) throw new Error("terra3d: vignette " + id + " has no beat " + JSON.stringify(name));
      return beats[name];
    },
  };
}
