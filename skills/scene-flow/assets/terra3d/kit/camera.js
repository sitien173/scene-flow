// Camera grammar for terra3d: six closed-form moves driven purely by seek time t.
import * as THREE from "three";
import { ease, lerp, progress } from "./motion.js";

const v3 = p => (p && p.isVector3 ? p : new THREE.Vector3(...(p || [0, 0, 0])));
const tmpLook = new THREE.Vector3();

function applyPose(camera, t, defaults, opts = {}) {
  const {
    from = defaults.from,
    to = defaults.to,
    look = defaults.look,
    lookFrom = opts.lookFrom || look,
    lookTo = opts.lookTo || look,
    up = defaults.up || [0, 1, 0],
    start = 0,
    dur = 4,
    curve = "inOut",
  } = opts;
  const x = ease(progress(t, start, dur), curve);
  camera.up.set(up[0], up[1], up[2]);
  camera.position.lerpVectors(v3(from), v3(to), x);
  tmpLook.lerpVectors(v3(lookFrom), v3(lookTo), x);
  camera.lookAt(tmpLook);
}

// Aerial push-in / flyover across landscape or ocean.
export function drone(camera, t, opts = {}) {
  applyPose(camera, t, {
    from: [0, 13, 24],
    to: [0, 8.5, 11],
    look: [0, 0.8, 0],
  }, opts);
}

// Arc around a center point; supports eased start/end angles as well as legacy speed-based orbit.
export function orbit(camera, t, opts = {}) {
  const {
    center = [0, 1, 0],
    radius = 10,
    height = 4,
    fromAngle = -0.45,
    toAngle = 0.45,
    fromRadius = radius,
    toRadius = radius,
    fromHeight = height,
    toHeight = height,
    look,
    angle = 0,
    speed,
    start = 0,
    dur = 4,
    curve = "inOut",
  } = opts;
  const c = v3(center);
  const useLegacy = speed !== undefined && opts.fromAngle === undefined && opts.toAngle === undefined;
  const x = ease(progress(t, start, dur), curve);
  const a = useLegacy ? angle + speed * t : lerp(fromAngle, toAngle, x);
  const r = useLegacy ? radius : lerp(fromRadius, toRadius, x);
  const h = useLegacy ? height : lerp(fromHeight, toHeight, x);
  camera.up.set(0, 1, 0);
  camera.position.set(c.x + Math.sin(a) * r, c.y + h, c.z + Math.cos(a) * r);
  camera.lookAt(look ? v3(look) : c);
}

// Lateral tracking move alongside a subject or terrain feature.
export function track(camera, t, opts = {}) {
  applyPose(camera, t, {
    from: [-7, 3.2, 10],
    to: [7, 3.2, 10],
    look: [0, 1, 0],
  }, {
    lookFrom: opts.lookFrom || opts.look || [-3.5, 1, 0],
    lookTo: opts.lookTo || opts.look || [3.5, 1, 0],
    ...opts,
  });
}

// Overhead nadir shot looking down with a non-collinear up vector to avoid gimbal flip.
export function topdown(camera, t, opts = {}) {
  applyPose(camera, t, {
    from: [0, 22, 3],
    to: [0, 16, -3],
    look: [0, 0, 0],
    up: [0, 0, -1],
  }, {
    lookFrom: opts.lookFrom || opts.look || [0, 0, 3],
    lookTo: opts.lookTo || opts.look || [0, 0, -3],
    ...opts,
  });
}

// Low ground-level dolly near eye or hull height.
export function ground(camera, t, opts = {}) {
  applyPose(camera, t, {
    from: [-2.2, 1.5, 9.5],
    to: [0.4, 1.6, 5.2],
    look: [0, 1.4, 0],
  }, opts);
}

// Vertical crane rise (or descent) revealing scale.
export function crane(camera, t, opts = {}) {
  applyPose(camera, t, {
    from: [0, 2.0, 11.5],
    to: [0, 11.5, 15.5],
    look: [0, 1.5, 0],
  }, opts);
}
