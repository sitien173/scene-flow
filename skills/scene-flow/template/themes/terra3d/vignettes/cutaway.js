// Vignette 13: Cross-section cutaway with rising chamber, ribbed miter lock gate, callout, and I-bar / span markers.
export async function build(kit) {
  const scene = await kit.stage({
    ground: false,
    fog: "#A9D5F2",
    near: 30,
    far: 105,
    shadow: { size: 1024, range: 24 },
  });
  const camera = kit.camera(38);
  const gateAt = kit.beat("gate");
  const cut = await kit.cutaway({
    width: 7.4,
    depth: 4.2,
    baseY: -1.6,
    wallHeight: 2.6,
    strata: [
      { height: 0.9, color: "#5D4B41" },
      { height: 0.7, color: "#9C4F36" },
      { height: 0.3, color: "#7DB35A" },
    ],
    chambers: [
      { x: -1.5, width: 3.0, from: 0.5, to: 2.2, start: 0.2, dur: 2.3 },
      { x: 1.85, width: 2.8, from: 2.1, to: 2.1, start: 0, dur: 1.0 },
    ],
    gates: [
      { x: 0.25, depth: 1.35, jambs: true, jambWidth: 0.36, from: 0.0, to: 1.15, start: gateAt, dur: 1.1 },
    ],
  });
  scene.add(cut.object);

  kit.callout({
    from: 0,
    to: 200,
    unit: " triệu lít",
    label: "Nước nâng mỗi lượt tàu",
    x: 540,
    y: 255,
    start: 0.15,
    dur: 2.2,
  });
  kit.ibar({
    text: "26 m",
    a: [-2.8, cut.deckY, 2.15],
    b: [-2.8, cut.deckY + 2.3, 2.15],
    labelOffset: [62, 0],
    start: 0.2,
  });
  kit.span({
    text: "60 m",
    a: [-2.8, cut.deckY + 2.75, 1.8],
    b: [0.25, cut.deckY + 2.75, 1.8],
    labelOffset: [0, -32],
    start: 0.35,
  });

  function update(t) {
    kit.track(camera, t, {
      from: [-3.2, 7.6, 26.2],
      to: [2.2, 7.8, 25.8],
      lookFrom: [-0.2, 5.5, 0],
      lookTo: [0.2, 5.5, 0],
      dur: 3.6,
    });
    cut.update(t);
  }
  return { scene, camera, update, hero: cut.object };
}
