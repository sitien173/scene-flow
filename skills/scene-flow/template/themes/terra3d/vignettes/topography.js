// Vignette 6: Top-down terrain map survey with canvasTexture contour plate, pill label, and span marker.
export async function build(kit) {
  const { THREE } = kit;
  const scene = await kit.stage({ ground: false, shadow: { size: 1024, range: 28 } });
  const camera = kit.camera(38);
  const land = await kit.terrain({
    seed: 29,
    size: 80,
    segments: 80,
    river: true,
    lake: false,
    cutWalls: true,
    rocks: true,
  });

  const tex = kit.canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#DCE8C8";
    ctx.fillRect(0, 0, w, h);

    // Subtle topographic survey grid.
    ctx.strokeStyle = "rgba(22, 50, 74, 0.12)";
    ctx.lineWidth = 1.5;
    for (let x = 32; x < w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x, h - 12);
      ctx.stroke();
    }
    for (let y = 32; y < h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(12, y);
      ctx.lineTo(w - 12, y);
      ctx.stroke();
    }

    // Layered elevation contour bands (left and right ridges around the central cut).
    const drawContour = (cx, cy, rx, ry, rot, fill, stroke) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    };
    drawContour(122, 122, 92, 66, -0.25, "#B6D28B", "#5F9342");
    drawContour(114, 118, 64, 44, -0.25, "#9BC16B", "#4B7C32");
    drawContour(106, 114, 34, 23, -0.25, "#C29164", "#8A5632");

    drawContour(392, 134, 96, 68, 0.22, "#B6D28B", "#5F9342");
    drawContour(402, 138, 64, 44, 0.22, "#9BC16B", "#4B7C32");
    drawContour(410, 142, 32, 22, 0.22, "#C29164", "#8A5632");

    // Winding canal/river channel across the contour plate.
    ctx.beginPath();
    ctx.moveTo(222, 10);
    ctx.bezierCurveTo(234, 84, 286, 170, 266, h - 10);
    ctx.strokeStyle = "#1E78AD";
    ctx.lineWidth = 26;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.strokeStyle = "#6EC4F0";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Crisp plate frame.
    ctx.strokeStyle = "#16324A";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  });

  const plateY = Math.max(kit.terrainHeight(-2.5, -2.6, { seed: 29, river: true, lake: false }),
                          kit.terrainHeight(2.5, -2.6, { seed: 29, river: true, lake: false }), 2.0) + 2.2;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.18, 2.3),
    kit.matte("#FFFFFF", { map: tex, roughness: 0.6 }),
  );
  plate.position.set(0, plateY, -2.6);
  plate.castShadow = true;
  scene.add(land.object, plate);

  kit.pill({
    text: "Eo đất Panama",
    at: [0, plateY + 0.2, -3.75],
    offset: [0, -34],
    start: 0.12,
  });

  kit.span({
    text: "Kênh dài 80 km",
    a: [-3.2, plateY + 0.3, -0.5],
    b: [3.2, plateY + 0.3, -0.5],
    labelOffset: [0, 30],
    start: 0.2,
  });

  function update(t) {
    kit.topdown(camera, t, {
      from: [0, 29, 2.2],
      to: [0, 26, 0.4],
      lookFrom: [0, 0, 1.8],
      lookTo: [0, 0, 0.4],
      dur: 2.0,
    });
    land.update(t);
  }
  return { scene, camera, update, hero: plate };
}
