// Vignette roof: the toon3d demo sample, one continuous shot with no hard cut. The shot opens on the house front from the street
// at a high angle, a crane rises to the roof, then six whip sweeps move between steep, close views, each started on a sentence
// beat with the frame count measured in research/theme-toon3d/SHOTS.md (19, 10, 7, 7, 10, 9 frames at 30 fps). The kit parts run
// here: panel pop-in, the numbered counter with the x10 badge, the striped cable with lights, rain, ripples with debris, the violet
// flash before the last whip, and pills with dots. Every value is a function of seek time.
import * as THREE from "three";
import { house } from "./house/house.js";
import { panelArray } from "./panel-array/panel-array.js";
import { trees } from "./tree/tree.js";
import { utility } from "./utility/utility.js";

const FPS = 30;
const DEG = Math.PI / 180;
const COLS = 10; // ten panels in the string, so the badge reads x10
const ARRAY_AT = [0, 2.6, -6]; // the array group: its deck top sits at y 2.8
const CABLE = [[-3.0, 3.4, -3.4], [-1.5, 3.5, -3.4], [0, 3.4, -3.4], [1.5, 3.5, -3.4], [3.0, 3.4, -3.4]]; // 6 m, 12 bulbs: 0.55 m apart

// A camera pose on a steep arc. `look` is the point aimed at, `yaw` 0 looks from +z, `pitch` is the angle above the ground,
// and `dist` is metres from the target. Returns the camera position and aim.
function pose(look, yaw, pitch, dist) {
  const c = Math.cos(pitch * DEG);
  return { look, to: [look[0] + dist * Math.sin(yaw * DEG) * c, look[1] + dist * Math.sin(pitch * DEG), look[2] + dist * Math.cos(yaw * DEG) * c] };
}
// The opening: the house front from above and in front, as the reference's 1.0 s frame: lawn and trees at the top, roof and
// facade in the middle, street at the bottom.
const EXTERIOR = pose([0, 1.5, 0.5], 0, 38, 12);
const OVERVIEW = pose([0, 3.6, -4], 14, 46, 10);
// Whip poses, in the order of the beats in vignettes.json. Each is a steep, close view. The rain and tenx distances put the
// largest panel row at the measured reference width (SPEC.md, Gaps against the reference); the cable distance puts the bulb
// spacing at the measured lamp spacing.
const WHIP_POSES = {
  cable: pose([0, 3.4, -3.4], 8, 48, 8.0),
  series: pose([1.0, 3.2, -5.5], -14, 50, 6.0),
  tenx: pose([0, 3.0, -6], 32, 50, 5.6),
  rain: pose([-0.6, 3.6, -5.4], -6, 46, 4.2),
  tilt: pose([-0.5, 2.6, -5.5], 48, 46, 4.5),
  close: pose([-0.5, 2.2, -4], 0, 50, 6.0),
};
const WHIPS = [["cable", 19], ["series", 10], ["tenx", 7], ["rain", 7], ["tilt", 10], ["close", 9]];

// Points along each polyline every 0.1 m, so the caption clearance check tests the whole line.
function densify(points, step = 0.1) {
  const out = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = new THREE.Vector3(...points[i]);
    const b = new THREE.Vector3(...points[i + 1]);
    const n = Math.max(1, Math.ceil(a.distanceTo(b) / step));
    for (let k = 0; k < n; k++) out.push(a.clone().lerp(b, k / n));
  }
  out.push(new THREE.Vector3(...points[points.length - 1]));
  return out;
}

export async function build(kit) {
  const { PALETTE, toon } = kit;
  const scene = await kit.stage();
  const camera = kit.camera(36);
  const arr = panelArray(kit, { cols: COLS, rows: 1, tank: true, inverter: false });
  arr.group.position.set(ARRAY_AT[0], ARRAY_AT[1], ARRAY_AT[2]);
  const house0 = house(kit, { panelStart: kit.beat("panel") });
  // The deck slab joins the house roof to the array deck. Its top sits 0.02 below the array deck, so the two never share a face.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(12, 0.16, 8.4), toon(PALETTE.roof, kit.concreteTexture(12, 8.4)));
  deck.position.set(0, 2.7, -5.8);
  const onArray = p => new THREE.Vector3(p.x + ARRAY_AT[0], p.y + ARRAY_AT[1], p.z + ARRAY_AT[2]);

  const panelStart = kit.beat("panel");
  const panelItems = arr.panels.map((mesh, i) => ({ mesh, start: panelStart + i * 0.2 }));
  // One counter tag per panel, on the panel's top face, and the x10 badge over the fourth panel.
  const anchors = arr.panels.map(mesh => onArray(mesh.position).add(new THREE.Vector3(0, 0.12, 0)));
  const count = kit.counter({
    anchors, start: panelStart, step: 0.2, end: kit.beat("rain"), badge: "×10",
    badgeAnchor: anchors[3], badgeOffset: [220, -150], badgeStart: kit.beat("tenx"), badgeEnd: kit.beat("rain"),
  });
  const cable = kit.cableLights({ points: CABLE, bulbs: 12, start: kit.beat("cable"), step: 0.2 });
  const shower = kit.rain({ start: kit.beat("rain"), box: [-6, 2.8, -10, 6, 12, -2], count: 90, width: 0.045, len: 0.7 });
  const rings = kit.ripples({ center: onArray(arr.anchors.array).add(new THREE.Vector3(0, 0, -0.9)).toArray(), spread: [3.2, 0, 0.0], y: 0.25, start: kit.beat("ripple"), count: 4, radius: 0.26, aspect: 0.92, debris: 16, chipSize: 0.022, color: "#8CAFC8", opacity: 1 });
  const disc = kit.sun();
  // Ground for the opening: concrete from the house to the lawn, the street in front of the house, the lawn behind it.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 11), toon(PALETTE.concrete, kit.concreteTexture(240, 11)));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -2.5);
  const street = kit.road({ z0: 3, depth: 60 });
  const lawn = kit.lawn({ z0: -8, depth: 30 });
  const utilities = utility(kit);
  scene.add(house0.group, arr.group, deck, cable.object, shower.object, rings.object, disc.object, ground, street, lawn, utilities.group, ...trees(kit));

  // The whip chain. The crane runs from the opening to the roof and ends when the first whip begins; each whip is centred on
  // its beat with the measured frame count. The flash is the frame before the last whip.
  const whips = WHIPS.map(([name, frames]) => ({ peak: kit.beat(name), frames, to: WHIP_POSES[name].to, look: WHIP_POSES[name].look }));
  const first = whips[0];
  const crane = { from: EXTERIOR.to, lookFrom: EXTERIOR.look, to: OVERVIEW.to, look: OVERVIEW.look, lift: 0.6, dur: first.peak - (first.frames / FPS) / 2 };
  const cableAt = first.peak - (first.frames / FPS) / 2; // the cable appears when the first whip starts
  const last = whips[whips.length - 1];
  kit.flash({ at: last.peak - (last.frames / FPS) / 2 - 1 / FPS, frames: 1, fps: FPS, color: PALETTE.flash });

  kit.pill({ text: "Tấm pin", at: onArray(arr.anchors.array), offset: [-200, -230], start: panelStart, end: panelStart + 2.6 });
  kit.pill({ text: "Dây điện", at: new THREE.Vector3(...CABLE[2]).add(new THREE.Vector3(0, 0.12, 0)), offset: [150, -150], start: kit.beat("cable"), end: kit.beat("cable") + 2.4 });
  kit.pill({ text: "Nối tiếp", at: onArray(arr.anchors.array), offset: [0, -200], start: kit.beat("series"), end: kit.beat("series") + 2.4 });
  kit.pill({ text: "Nước rơi", at: new THREE.Vector3(0, 3.1, -6), offset: [0, -200], start: kit.beat("rain"), end: kit.beat("rain") + 2.2 });

  function update(t) {
    kit.chain(camera, t, { crane, whips, fps: FPS });
    kit.popIn(panelItems, t);
    house0.update(t);
    count.update(t, camera);
    cable.object.visible = t >= cableAt;
    cable.update(t);
    shower.update(t, camera);
    rings.update(t);
    disc.object.visible = t >= kit.beat("close");
    if (t >= kit.beat("close")) disc.update(t, camera);
  }
  // Scene lines for the caption clearance check: the poles and wires always, the array cable only once it is shown.
  const wires = utilities.lines.map(line => densify(line));
  const cableLine = densify(CABLE);
  return { scene, camera, update, lines: t => (t >= cableAt ? [...wires, cableLine] : wires) };
}
