// Vignette 11: Multi-step elevation cutaway showing 26 m climb above sea level with callout and I-bar.
export async function build(kit) {
  const scene = await kit.stage({
    ground: false,
    fog: "#A9D5F2",
    near: 30,
    far: 105,
    shadow: { size: 1024, range: 24 },
  });
  const camera = kit.camera(38);
  const stepSpec = { x: 1.75, width: 3.3, from: 0.45, to: 2.45, start: 0.2, dur: 2.2 };
  const cut = await kit.cutaway({
    width: 7.8,
    depth: 4.4,
    baseY: -1.6,
    wallHeight: 2.7,
    strata: [
      { height: 0.9, color: "#5D4B41" },
      { height: 0.7, color: "#9C4F36" },
      { height: 0.3, color: "#7DB35A" },
    ],
    chambers: [
      { x: -1.75, width: 3.1, from: 0.45, to: 0.45, start: 0, dur: 1.0, wallRight: true },
      stepSpec,
    ],
  });
  const gauge = new kit.THREE.Mesh(
    new kit.THREE.BoxGeometry(0.18, 0.14, 0.4),
    kit.glow("#FFD166", 1.2),
  );
  scene.add(cut.object, gauge);

  kit.callout({
    from: 0,
    to: 26,
    unit: " m",
    label: "Cao hơn mực nước biển",
    x: 540,
    y: 255,
    start: 0.15,
    dur: 1.8,
  });
  kit.ibar({
    text: "26 m",
    a: [3.2, cut.deckY + 0.45, 2.2],
    b: [3.2, cut.deckY + 2.45, 2.2],
    labelOffset: [-66, 0],
    start: 0.3,
  });

  function update(t) {
    kit.track(camera, t, {
      from: [-2.2, 6.2, 24.5],
      to: [2.2, 6.4, 24.5],
      lookFrom: [0, 4.4, 0],
      lookTo: [0, 4.4, 0],
      dur: 2.8,
    });
    cut.update(t);
    gauge.position.set(1.75, cut.deckY + kit.chamberLevel(t, stepSpec), 2.25);
  }
  return { scene, camera, update, hero: cut.object };
}
