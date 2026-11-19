// Cross-section cutaway kit: stacked soil strata, concrete lock walls, rising water chambers, and hinged lock gates.
import * as THREE from "three";
import { loadTexture, PALETTE } from "./look.js";
import { ease, lerp, progress } from "./motion.js";

const DEFAULT_STRATA = [
  { height: 1.1, color: "#6F584A" },
  { height: 0.9, color: "#9C4F36" },
  { height: 0.35, color: "#7DB35A" },
];

// Closed-form water height for a lock chamber at time t.
export function chamberLevel(t, { from = 0.4, to = 2.4, start = 0, dur = 2.5, curve = "inOut" } = {}) {
  return lerp(from, to, ease(progress(t, start, dur), curve));
}

// Closed-form miter-gate swing angle (radians) at time t.
export function gateAngle(t, { from = 0, to = 1.15, start = 0, dur = 1.2, curve = "inOut" } = {}) {
  return lerp(from, to, ease(progress(t, start, dur), curve));
}

// Builds a cross-section cutaway block with strata, back/side lock walls, water chambers, and hinged gates.
export async function cutaway({
  width = 12.0,
  depth = 5.2,
  baseY = -2.2,
  strata = DEFAULT_STRATA,
  chambers = [],
  gates = [],
  wallColor = "#9AA3AD",
  waterColor = PALETTE.water,
  gateColor = "#4C5C6E",
  backWall = true,
  backThickness = 0.55,
  wallHeight = 2.8,
  shadow = true,
} = {}) {
  const group = new THREE.Group();
  const textures = await Promise.all(
    strata.map(s => (s.texture ? loadTexture(s.texture, { repeat: s.repeat || [3, 1] }) : Promise.resolve(null))),
  );

  // Soil and rock strata base layers visible across the front cutaway face.
  let curY = baseY;
  for (let i = 0; i < strata.length; i++) {
    const s = strata[i];
    const h = s.height;
    const mat = new THREE.MeshStandardMaterial({
      color: s.color || "#8A6552",
      map: textures[i],
      roughness: s.roughness ?? 0.92,
      metalness: 0,
      flatShading: true,
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, h, depth), mat);
    slab.position.set(0, curY + h * 0.5, 0);
    slab.receiveShadow = !!shadow;
    slab.castShadow = !!shadow;
    group.add(slab);
    curY += h;
  }
  const deckY = curY;

  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor,
    roughness: 0.82,
    metalness: 0.05,
    flatShading: true,
  });

  if (backWall) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, backThickness), wallMat);
    back.position.set(0, deckY + wallHeight * 0.5, -depth * 0.5 + backThickness * 0.5);
    back.castShadow = !!shadow;
    back.receiveShadow = !!shadow;
    group.add(back);
  }

  // Side concrete retaining piers framing the cutaway chamber(s).
  const pierW = 0.65;
  for (const side of [-1, 1]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(pierW, wallHeight, depth), wallMat);
    pier.position.set(side * (width * 0.5 - pierW * 0.5), deckY + wallHeight * 0.5, 0);
    pier.castShadow = !!shadow;
    pier.receiveShadow = !!shadow;
    group.add(pier);
  }

  // Optional divider walls between chambers (if chamber.dividerLeft / dividerRight is set)
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  unitBox.translate(0, 0.5, 0);

  const builtChambers = chambers.map(spec => {
    const cWidth = spec.width ?? (width - pierW * 2);
    const cDepth = spec.depth ?? (depth - backThickness);
    const minY = spec.minY ?? deckY;
    const cz = spec.z ?? (backWall ? backThickness * 0.5 : 0);
    const cx = spec.x ?? 0;

    const waterMat = new THREE.MeshStandardMaterial({
      color: spec.color || waterColor,
      roughness: 0.16,
      metalness: 0.1,
      transparent: true,
      opacity: spec.opacity ?? 0.78,
    });
    const mesh = new THREE.Mesh(unitBox, waterMat);
    mesh.position.set(cx, minY, cz);
    mesh.scale.set(cWidth, Math.max(0.001, spec.from ?? 0.4), cDepth);
    mesh.renderOrder = 2;
    mesh.receiveShadow = !!shadow;
    group.add(mesh);

    // Thin bright waterline rim on the cutaway front face for crisp legibility.
    const capMat = new THREE.MeshBasicMaterial({ color: "#B8E6FF", transparent: true, opacity: 0.85 });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(cWidth, 0.06, cDepth), capMat);
    cap.position.set(cx, minY, cz);
    cap.renderOrder = 3;
    group.add(cap);

    if (spec.wallRight) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.42, wallHeight, cDepth), wallMat);
      div.position.set(cx + cWidth * 0.5 + 0.21, deckY + wallHeight * 0.5, cz);
      div.castShadow = !!shadow;
      div.receiveShadow = !!shadow;
      group.add(div);
    }

    return { spec, mesh, cap, minY };
  });

  const gateMat = new THREE.MeshStandardMaterial({
    color: gateColor,
    roughness: 0.55,
    metalness: 0.35,
    flatShading: true,
  });
  const ribMat = new THREE.MeshStandardMaterial({
    color: "#22303E",
    roughness: 0.5,
    metalness: 0.45,
    flatShading: true,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: "#F4B942",
    roughness: 0.48,
    metalness: 0.15,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: "#BAC4CF",
    roughness: 0.45,
    metalness: 0.4,
    flatShading: true,
  });

  const builtGates = gates.map(spec => {
    const gHeight = spec.height ?? wallHeight * 0.96;
    const gDepth = spec.depth ?? (depth - backThickness) * 0.48;
    const gThick = spec.thickness ?? 0.22;
    const gx = spec.x ?? 0;
    const gy = spec.y ?? deckY;
    const gz = spec.z ?? (backWall ? backThickness * 0.5 : 0);
    const hingeMode = spec.hinge ?? "both";
    const pivots = [];

    const makeLeaf = (pivotZ, spanZ, dir) => {
      const pivot = new THREE.Group();
      pivot.position.set(gx, gy, pivotZ);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(gThick, gHeight, spanZ), gateMat);
      leaf.position.set(0, gHeight * 0.5, dir * spanZ * 0.5);
      leaf.castShadow = !!shadow;
      leaf.receiveShadow = !!shadow;
      pivot.add(leaf);

      // Horizontal structural ribs and top catwalk rail so each leaf reads as a lock gate.
      for (const f of [0.22, 0.5, 0.78]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(gThick + 0.09, 0.11, spanZ * 0.96), ribMat);
        rib.position.set(0, gHeight * f, dir * spanZ * 0.5);
        rib.castShadow = !!shadow;
        pivot.add(rib);
      }
      const miterPost = new THREE.Mesh(new THREE.BoxGeometry(gThick + 0.06, gHeight, 0.09), trimMat);
      miterPost.position.set(0, gHeight * 0.5, dir * (spanZ - 0.045));
      pivot.add(miterPost);

      const catwalk = new THREE.Mesh(new THREE.BoxGeometry(gThick + 0.18, 0.08, spanZ), ribMat);
      catwalk.position.set(0, gHeight + 0.04, dir * spanZ * 0.5);
      pivot.add(catwalk);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, spanZ * 0.96), railMat);
      rail.position.set(0, gHeight + 0.24, dir * spanZ * 0.5);
      pivot.add(rail);
      for (const pf of [0.1, 0.5, 0.9]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), railMat);
        post.position.set(0, gHeight + 0.14, dir * spanZ * pf);
        pivot.add(post);
      }

      group.add(pivot);
      pivots.push({ pivot, sign: dir });
    };

    if (hingeMode === "both") {
      const halfSpan = gDepth;
      makeLeaf(gz - halfSpan, halfSpan, 1);
      makeLeaf(gz + halfSpan, halfSpan, -1);
    } else if (hingeMode === "right") {
      makeLeaf(gz + gDepth * 0.5, gDepth, -1);
    } else {
      makeLeaf(gz - gDepth * 0.5, gDepth, 1);
    }
    if (spec.jambs) {
      const cz = backWall ? backThickness * 0.5 : 0;
      const cDepth = depth - (backWall ? backThickness : 0);
      const zMin = cz - cDepth * 0.5;
      const zMax = cz + cDepth * 0.5;
      const openMin = hingeMode === "both" ? gz - gDepth : gz - gDepth * 0.5;
      const openMax = hingeMode === "both" ? gz + gDepth : gz + gDepth * 0.5;
      const jambW = spec.jambWidth ?? 0.36;
      for (const [aZ, bZ, hingeZ] of [[zMin, openMin, openMin], [openMax, zMax, openMax]]) {
        const len = bZ - aZ;
        if (len > 0.02) {
          const jamb = new THREE.Mesh(new THREE.BoxGeometry(jambW, wallHeight, len), wallMat);
          jamb.position.set(gx, deckY + wallHeight * 0.5, (aZ + bZ) * 0.5);
          jamb.castShadow = !!shadow;
          jamb.receiveShadow = !!shadow;
          group.add(jamb);

          const coping = new THREE.Mesh(new THREE.BoxGeometry(jambW + 0.14, 0.14, len + 0.04), trimMat);
          coping.position.set(gx, deckY + wallHeight + 0.07, (aZ + bZ) * 0.5);
          coping.castShadow = !!shadow;
          group.add(coping);

          const hingeDir = hingeZ === openMin ? -1 : 1;
          const pintle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, wallHeight * 0.96, 8), ribMat);
          pintle.position.set(gx, deckY + wallHeight * 0.48, hingeZ + hingeDir * 0.04);
          group.add(pintle);
        }
      }
    }
    return { spec, pivots };
  });

  function waterLevelAt(index, t) {
    const entry = builtChambers[index];
    if (!entry) throw new Error("terra3d: cutaway has no chamber " + index);
    return chamberLevel(t, entry.spec);
  }

  function update(t) {
    for (let i = 0; i < builtChambers.length; i++) {
      const { spec, mesh, cap, minY } = builtChambers[i];
      const h = Math.max(0.001, chamberLevel(t, spec));
      mesh.scale.y = h;
      cap.position.y = minY + h;
    }
    for (let i = 0; i < builtGates.length; i++) {
      const { spec, pivots } = builtGates[i];
      const angle = gateAngle(t, spec);
      for (let j = 0; j < pivots.length; j++) {
        pivots[j].pivot.rotation.y = pivots[j].sign * angle;
      }
    }
  }
  update(0);

  return {
    object: group,
    deckY,
    chambers: builtChambers,
    gates: builtGates,
    waterLevelAt,
    update,
  };
}
