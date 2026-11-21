// Sentences 7-8: Gulf coast view showing Jefferson's initial offer for New Orleans and Florida.
import { townsfolk } from "./townsfolk/townsfolk.js";
import { coinSack } from "./coin-sack/coin-sack.js";
import { priceTag } from "./price-tag/price-tag.js";
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);
  scene.add(kit.map.group);

  const camera = kit.camera(35);
  const startPose = kit.view(-86.8, 30.2, 0.78, 20);
  const endPose = kit.view(-87.2, 30.0, 0.84, 19);
  kit.applyView(camera, startPose);

  const noAt = kit.beat("no");
  const flAt = kit.beat("fl");
  const maxAt = kit.beat("max");

  kit.map.label([-90.07, 29.95], "New Orleans", { at: noAt, dur: 0.35, offset: [0, 36] });
  kit.map.label([-84.0, 30.4], "Florida", { at: flAt, dur: 0.35, offset: [0, 40] });

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const diplomat = townsfolk(kit, {
    role: "diplomat",
    expression: "neutral",
    gesture: "point",
    scale: 1.6,
    position: kit.lonLatToWorld(-83.8, 32.2, 0.09),
    rotationY: -0.35,
    at: 0.35,
    popDur: 0.45,
  });

  const tag = priceTag(kit, {
    text: "10 triệu $",
    scale: 1.55,
    position: kit.lonLatToWorld(-89.5, 32.8, 0.09),
    rotationY: 0.15,
    at: maxAt,
    popDur: 0.4,
  });

  const bag = coinSack(kit, {
    scale: 1.45,
    position: kit.lonLatToWorld(-86.6, 31.6, 0.09),
    rotationY: -0.2,
    at: maxAt + 0.15,
    popDur: 0.4,
  });

  layerGroup.add(diplomat.group, tag.group, bag.group);

  function update(t) {
    kit.move(camera, t, startPose, endPose, 5.0, { start: 1.0 });
    diplomat.update(t);
    tag.update(t);
    bag.update(t);
  }

  return {
    scene,
    camera,
    update,
    hero: [diplomat.group, tag.group, bag.group],
  };
}
