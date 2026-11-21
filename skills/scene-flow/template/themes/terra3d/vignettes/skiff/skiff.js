// Small sailing skiff facing +Z, built as one vertex-colored BufferGeometry so kit.fleet can instance it:
// tapered hull, deck, a mainsail and a small jib. Pass skiff(kit).geometry to kit.fleet({ geometry }).
export function skiff(kit) {
  const { THREE } = kit;
  const tris = [];
  const cols = [];
  const tri = (a, b, c, color) => {
    tris.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) cols.push(...color);
  };
  const hullC = [0.55, 0.34, 0.18];
  const deckC = [0.76, 0.56, 0.36];
  const sailC = [0.97, 0.95, 0.9];
  const jibC = [0.93, 0.62, 0.42];
  const w = 0.28;
  const h = 0.24;
  const bow = [0, h, 0.72];
  const bowB = [0, 0, 0.52];
  const sl = [-w, h, -0.56];
  const sr = [w, h, -0.56];
  const slB = [-w * 0.7, 0, -0.46];
  const srB = [w * 0.7, 0, -0.46];
  tri(bow, sl, sr, deckC);
  tri(bow, bowB, sl, hullC);
  tri(bowB, slB, sl, hullC);
  tri(bow, sr, bowB, hullC);
  tri(bowB, sr, srB, hullC);
  tri(sl, slB, sr, hullC);
  tri(sr, slB, srB, hullC);
  // Both sails are double-sided so they read from either side of the fleet.
  const mastBase = [0, h, 0.05];
  const mastTop = [0, h + 1.05, 0.0];
  const boomEnd = [0, h + 0.14, -0.44];
  tri(mastBase, mastTop, boomEnd, sailC);
  tri(mastBase, boomEnd, mastTop, sailC);
  const jibTop = [0, h + 0.8, 0.04];
  const jibFoot = [0, h + 0.04, 0.62];
  const jibBack = [0, h + 0.08, 0.1];
  tri(jibTop, jibFoot, jibBack, jibC);
  tri(jibTop, jibBack, jibFoot, jibC);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(tris, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  geometry.computeVertexNormals();
  return { geometry };
}
