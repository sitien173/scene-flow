// Vignette 1: Blue Marble globe in upper safe zone with sleek route arcs, beacon markers, pills, and globeZoom.
export async function build(kit) {
  const scene = await kit.stage({
    sky: "#08121F",
    env: true,
    envIntensity: 0.75,
    ground: false,
    fog: false,
    sunPos: [-12, 10, 14],
    sunIntensity: 2.3,
    hemiIntensity: 0.75,
    shadow: false,
  });
  const camera = kit.camera(38);
  const earth = await kit.globe({
    radius: 1.9,
    arcs: [
      { from: [40.7, -74.0], to: [9.1, -79.7], height: 0.4, radiusTube: 0.014, color: "#FFD166", start: 0.1, dur: 1.3 },
      { from: [9.1, -79.7], to: [37.8, -122.4], height: 0.44, radiusTube: 0.014, color: "#5CE1E6", start: 1.0, dur: 1.4 },
    ],
    labels: [
      { text: "Panama", lat: 9.1, lon: -79.7, lift: 1.05 },
      { text: "New York", lat: 40.7, lon: -74.0, lift: 1.05 },
    ],
  });
  const beaconMat = kit.glow("#FFD166", 1.3);
  const panamaPt = kit.latLonToVec3(9.1, -79.7, 1.94);
  const beacon = new kit.THREE.Mesh(new kit.THREE.SphereGeometry(0.06, 12, 10), beaconMat);
  beacon.position.copy(panamaPt);
  earth.object.add(beacon);
  scene.add(earth.object);

  kit.pill({ text: "New York", at: earth.anchors[1].position, offset: [80, -30], start: 0.2 });
  kit.pill({ text: "Panama", at: earth.anchors[0].position, offset: [90, 48], start: 0.7 });
  kit.beat("route");

  function update(t) {
    kit.globeZoom(camera, t, {
      fromLatLon: [22, -62],
      toLatLon: [16, -82],
      radius: 1.9,
      fromDist: 23.0,
      toDist: 21.0,
      lookSurface: 0.15,
      lookOffset: [0, 3.7, 0],
      dur: 2.7,
    });
    earth.update(t, camera);
  }
  return { scene, camera, update, hero: earth.object };
}
