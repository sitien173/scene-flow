// Sentence 2 onward: pans from France to Iberia, fills a stencil-clipped polygon region, labels it, and draws a route.
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);

  const camera = kit.camera(35);
  const startPose = kit.view(-1.5, 42.2, 0.85, 20);
  const endPose = kit.view(-1.8, 41.8, 0.92, 18);
  kit.applyView(camera, startPose);

  kit.map.fill("sample-triangle", { at: 1.1, dur: 0.45, color: "orange" });
  kit.map.label("sample-triangle", "Vùng mẫu", { at: 1.35, dur: 0.35, offset: [0, 56] });
  kit.map.route([[2.35, 48.85], [-1.0, 44.5], [-3.70, 40.42]], { at: 1.5, dur: 2.0 });

  const marker = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.12, 16),
    kit.look.toonMaterial(kit.PALETTE.ink),
  );
  post.position.y = 0.06;
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12),
    kit.look.toonMaterial(kit.PALETTE.red),
  );
  top.position.y = 0.28;
  marker.add(post, top);
  marker.position.copy(kit.lonLatToWorld(-1.5, 41.6, 0.09));
  scene.add(marker);

  function update(t) {
    kit.move(camera, t, startPose, endPose, 6.0, { start: 1.0 });
    const s = kit.pop(t, 0.9, 0.45);
    marker.scale.setScalar(Math.max(0.001, s));
    marker.visible = s > 0.01;
  }

  return { scene, camera, update, hero: marker };
}
