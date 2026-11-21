// Sentences 14-17: Louisiana territory fill, size, price per acre, and westward expansion arrow.
import { priceTag } from "./price-tag/price-tag.js";
import { mapArrow } from "./map-arrow/map-arrow.js";
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);
  scene.add(kit.map.group);

  const camera = kit.camera(35);
  const startPose = kit.view(-98, 41, 0.48, 20);
  const endPose = kit.view(-98.5, 40.5, 0.52, 19);
  kit.applyView(camera, startPose);

  const fillAt = kit.beat("fill");
  const acreAt = kit.beat("acre");
  const doubleAt = kit.beat("double");

  kit.map.fill("louisiana", { at: fillAt, dur: 0.55, color: "orange", persist: true });
  kit.map.label([-100, 44.5], "Louisiana", { at: fillAt + 0.1, dur: 0.35, offset: [0, -24] });
  kit.map.label([-100, 40.0], "828.000 dặm vuông", { at: fillAt + 0.25, dur: 0.35, offset: [0, 0] });

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const tagText = "4 xu/mẫu Anh";
  const tag = priceTag(kit, {
    text: tagText,
    scale: 2.5,
    position: kit.lonLatToWorld(-96.5, 34.2, 0.09),
    rotationY: 0.1,
    at: acreAt,
    popDur: 0.45,
  });

  // Fit the Vietnamese unit label cleanly inside the priceTag face canvas without clipping.
  const tagCanvas = document.createElement("canvas");
  tagCanvas.width = 512;
  tagCanvas.height = 256;
  const g = tagCanvas.getContext("2d");
  g.fillStyle = kit.PALETTE.paper;
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = kit.PALETTE.ink;
  g.lineWidth = 14;
  g.strokeRect(14, 14, 484, 228);
  g.fillStyle = kit.PALETTE.red;
  g.fillRect(14, 14, 84, 228);
  g.fillStyle = kit.PALETTE.paper;
  g.beginPath();
  g.arc(56, 128, 18, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = kit.PALETTE.ink;
  g.lineWidth = 6;
  g.stroke();
  g.fillStyle = kit.PALETTE.ink;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let fontSize = 60;
  g.font = `900 ${fontSize}px sans-serif`;
  while (g.measureText(tagText).width > 368 && fontSize > 36) {
    fontSize -= 2;
    g.font = `900 ${fontSize}px sans-serif`;
  }
  g.fillText(tagText, (512 + 84) / 2 + 4, 132);
  const fittedTex = new THREE.CanvasTexture(tagCanvas);
  fittedTex.colorSpace = THREE.SRGBColorSpace;
  tag.group.traverse(obj => {
    if (obj.isMesh && obj.material && obj.material.map && obj.geometry?.type === "PlaneGeometry") {
      obj.material.map = fittedTex;
      obj.material.needsUpdate = true;
    }
  });

  const arrow = mapArrow(kit, {
    pointing: "left",
    scale: 2.3,
    position: kit.lonLatToWorld(-104.5, 42.0, 0.09),
    rotationY: 0,
    at: doubleAt,
    popDur: 0.4,
  });

  layerGroup.add(tag.group, arrow.group);

  function update(t) {
    kit.move(camera, t, startPose, endPose, 8.5, { start: 1.2 });
    tag.update(t);
    arrow.update(t);
  }

  return {
    scene,
    camera,
    update,
    hero: [tag.group, arrow.group],
  };
}
