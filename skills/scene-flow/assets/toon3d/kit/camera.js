// Camera grammar for toon3d: three closed-form moves, each a function of seek time t.
import { dolly, lerp, ease, progress } from "./motion.js";

// High three-quarter explainer view, the reference's default. A slow settle toward the subject.
export function iso(camera, t, opts = {}) {
  dolly(camera, t, {
    from: [11.4, 16.2, 16.2], to: [9.6, 13.8, 13.8], look: [0, 1.4, 0],
    start: 0, dur: 4, ...opts,
  });
}

// Straight push toward a subject, eased, for a close read of one part.
export function push(camera, t, opts = {}) {
  dolly(camera, t, {
    from: [0, 6, 16], to: [0, 4.2, 9], look: [0, 2, 0],
    start: 0, dur: 3, ...opts,
  });
}

// Whip: a fast, eased sweep that starts at `start` and lasts `dur` seconds. It holds at `to` after it ends.
// The reference cuts between views with these sweeps, with no hard cut.
export function whip(camera, t, { from, to, look = [0, 1, 0], lookFrom, start = 0, dur = 0.3, curve = "inOut" } = {}) {
  dolly(camera, t, { from, to, look, lookFrom, start, dur, curve });
}

// Camera chain: a crane to the first pose, then whip sweeps. Each whip is centred on its peak time and lasts `frames` frames
// at `fps`; a pose holds until the next whip starts. Whips with no `frames` last 10 frames.
export function chain(camera, t, { crane: c, whips, fps = 30 }) {
  const dur = w => (w.frames || 10) / fps;
  const begin = w => w.peak - dur(w) / 2;
  if (t < begin(whips[0])) {
    crane(camera, t, { from: c.from, to: c.to, lookFrom: c.lookFrom, look: c.look, start: 0, dur: c.dur, lift: c.lift });
    return;
  }
  let k = 0;
  while (k + 1 < whips.length && t >= begin(whips[k + 1])) k++;
  const prev = k === 0 ? c : whips[k - 1];
  const w = whips[k];
  whip(camera, t, { from: prev.to, lookFrom: prev.look, to: w.to, look: w.look, start: begin(w), dur: dur(w) });
}

// Crane: a slow rise on an arc, from `from` to `to`, lifted by `lift` metres at mid-move, as a camera on a jib. Holds at `to`.
export function crane(camera, t, { from, to, look = [0, 1, 0], lookFrom, start = 0, dur = 4, lift = 0.8 } = {}) {
  const x = ease(progress(t, start, dur));
  const p = [lerp(from[0], to[0], x), lerp(from[1], to[1], x) + lift * Math.sin(Math.PI * x), lerp(from[2], to[2], x)];
  const l0 = lookFrom || look;
  camera.up.set(0, 1, 0);
  camera.position.set(p[0], p[1], p[2]);
  camera.lookAt(lerp(l0[0], look[0], x), lerp(l0[1], look[1], x), lerp(l0[2], look[2], x));
}

// Arc around a centre point, from one angle to another; the height and radius stay fixed.
export function orbit(camera, t, { center = [0, 1.5, 0], radius = 11, height = 7, fromAngle = -0.6, toAngle = 0.6, start = 0, dur = 4 } = {}) {
  const a = lerp(fromAngle, toAngle, ease(progress(t, start, dur)));
  camera.up.set(0, 1, 0);
  camera.position.set(center[0] + Math.sin(a) * radius, center[1] + height, center[2] + Math.cos(a) * radius);
  camera.lookAt(center[0], center[1], center[2]);
}
