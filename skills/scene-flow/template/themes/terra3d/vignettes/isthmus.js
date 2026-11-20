// Vignette 5: Zoomed globe pass over the narrow isthmus with sleek routeArc and ocean pills.
export async function build(kit) {
  const scene = await kit.stage({
    sky: "#08121F",
    env: true,
    envIntensity: 0.75,
    ground: false,
    fog: false,
    sunPos: [-10, 12, 14],
    sunIntensity: 2.3,
    hemiIntensity: 0.75,
    shadow: false,
  });
  const camera = kit.camera(38);
  const earth = await kit.globe({
    radius: 3.2,
    labels: [
      { text: "Đại Tây Dương", lat: 13.5, lon: -74.0, lift: 1.04 },
      { text: "Thái Bình Dương", lat: 4.5, lon: -85.0, lift: 1.04 },
    ],
  });
  const canalArc = kit.routeArc({
    from: [11.5, -77.5],
    to: [7.2, -81.8],
    radius: 3.2,
    height: 0.09,
    radiusTube: 0.008,
    color: "#FFD166",
    start: 0.25,
    dur: 1.6,
  });
  const marker = new kit.THREE.Mesh(
    new kit.THREE.OctahedronGeometry(0.032, 0),
    kit.glow("#FFD166", 1.2),
  );
  marker.position.copy(kit.latLonToVec3(9.1, -79.7, 3.26));
  earth.object.add(canalArc.group, marker);
  scene.add(earth.object);

  kit.pill({ text: "Đại Tây Dương", at: earth.anchors[0].position, offset: [90, -35], start: 0.2 });
  kit.pill({ text: "Thái Bình Dương", at: earth.anchors[1].position, offset: [-20, 330], start: 0.6 });

  function update(t) {
    kit.globeZoom(camera, t, {
      fromLatLon: [4.0, -76.0],
      toLatLon: [0.8, -80.5],
      radius: 3.2,
      fromDist: 10.2,
      toDist: 8.2,
      lookSurface: 0.35,
      dur: 3.2,
    });
    earth.update(t, camera);
    canalArc.update(t, camera);
  }
  return { scene, camera, update, hero: marker };
}
