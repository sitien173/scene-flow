// The atlas3d kit handed to every vignette's build(kit).
import * as THREE from "three";
import { clamp01, lerp, ease, progress, pop, rand, dolly, orbit, type } from "./motion.js";
import * as look from "./look.js";
import { createMap, view, applyView, move, lonLatToWorld } from "./map.js";
import { createFigure, FIGURE_PRESETS, FIGURE_EXPRESSIONS, FIGURE_GESTURES, COSTUMES } from "./figure.js";
import { createProp, PROP_KINDS, sailingShip, cargoCrate, moneyBag, priceTag, arrow, riverPath } from "./props.js";
import { createBackdrop } from "./backdrop.js";

export {
  ease,
  createMap,
  createFigure,
  FIGURE_PRESETS,
  FIGURE_EXPRESSIONS,
  FIGURE_GESTURES,
  COSTUMES,
  createProp,
  PROP_KINDS,
  sailingShip,
  cargoCrate,
  moneyBag,
  priceTag,
  arrow,
  riverPath,
  createBackdrop,
};

export function createKit({ id, t = 0, end = Infinity, beats = {}, layer, map = null, image = null }) {
  const heroes = [];
  const readyPromises = [];
  const pendingImages = new Set();
  const registerHero = item => {
    if (item && item.group) heroes.push(item.group);
    return item;
  };

  const scopedMap = map ? {
    group: map.group,
    lonLatToWorld: map.lonLatToWorld,
    regionCenter: map.regionCenter,
    update: (localTime, camera) => map.update(t + localTime, camera),
    fill: (regionId, opts = {}) => map.fill(regionId, {
      ...opts,
      at: t + (opts.at ?? 0),
      until: opts.until !== undefined ? (opts.until === Infinity ? Infinity : t + opts.until) : (opts.persist === false ? end : Infinity),
    }),
    label: (target, text, opts = {}) => map.label(target, text, {
      ...opts,
      at: t + (opts.at ?? 0),
      until: opts.until !== undefined ? (opts.until === Infinity ? Infinity : t + opts.until) : (opts.persist ? Infinity : end),
    }),
    route: (points, opts = {}) => map.route(points, {
      ...opts,
      at: t + (opts.at ?? 0),
      until: opts.until !== undefined ? (opts.until === Infinity ? Infinity : t + opts.until) : (opts.persist === false ? end : Infinity),
    }),
  } : null;

  const props = {
    sailingShip: (opts = {}) => registerHero(sailingShip(opts)),
    cargoCrate: (opts = {}) => registerHero(cargoCrate(opts)),
    moneyBag: (opts = {}) => registerHero(moneyBag(opts)),
    priceTag: (opts = {}) => registerHero(priceTag(opts)),
    arrow: (opts = {}) => registerHero(arrow(opts)),
    riverPath: (opts = {}) => registerHero(riverPath(opts)),
  };

  return {
    THREE, id, layer, image,
    PALETTE: look.PALETTE,
    look,
    map: scopedMap,
    view, applyView, move, lonLatToWorld,
    clamp01, lerp, ease, progress, pop, rand, dolly, orbit,
    type: (text, options) => type(layer, text, options),
    figure: (preset, opts = {}) => registerHero(createFigure(preset, opts)),
    prop: (kind, opts = {}) => registerHero(createProp(kind, opts)),
    props,
    backdrop: (scene, opts = {}) => {
      const hasScene = Boolean(scene && scene.isScene);
      const rawOpts = !hasScene && scene && typeof scene === "object" ? scene : opts;
      const mergedOpts = { image, ...rawOpts };
      const targetScene = hasScene ? scene : (mergedOpts.scene || null);
      const bd = createBackdrop(targetScene, mergedOpts);
      const pendingPath = bd.image || mergedOpts.image;
      if (pendingPath) pendingImages.add(pendingPath);
      readyPromises.push(bd.ready.finally(() => { if (pendingPath) pendingImages.delete(pendingPath); }));
      return bd;
    },
    _heroes: heroes,
    _ready: () => Promise.all(readyPromises),
    _pendingImages: () => [...pendingImages],
    // Portrait camera: 1080 x 1920, default FOV 35 for map framing.
    camera: (fov = 35) => new THREE.PerspectiveCamera(fov, 1080 / 1920, 0.1, 500),
    // Seconds from the vignette start to a beat named in vignettes.json.
    beat(name) {
      if (!(name in beats)) throw new Error("atlas3d: vignette " + id + " has no beat " + JSON.stringify(name));
      return beats[name];
    },
  };
}
