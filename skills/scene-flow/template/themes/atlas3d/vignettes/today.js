// Sentences 18-21: Wider view of the persistent Louisiana territory with modern states and Indigenous impact labels.
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);
  scene.add(kit.map.group);

  const camera = kit.camera(35);
  const startPose = kit.view(-98, 40.5, 0.42, 20);
  const endPose = kit.view(-98, 40.2, 0.45, 19);
  kit.applyView(camera, startPose);

  const nativeAt = kit.beat("native");
  const impactAt = kit.beat("impact");

  kit.map.label([-100, 44.5], "15 bang ngày nay", { at: 0.35, dur: 0.35, offset: [0, -28] });
  kit.map.label([-100, 39.5], "Hàng chục bộ tộc bản địa", { at: nativeAt, dur: 0.35, offset: [0, 0] });
  kit.map.label([-100, 34.5], "Bị bỏ qua", { at: impactAt, dur: 0.35, offset: [0, 28] });

  const arrow = kit.props.arrow({
    pointing: "down",
    scale: 2.3,
    position: kit.lonLatToWorld(-93, 44.5, 0.09),
    rotationY: 0,
    at: 0.35,
    popDur: 0.4,
  });
  scene.add(arrow.group);

  function update(t) {
    kit.move(camera, t, startPose, endPose, 9.5, { start: 1.0 });
    arrow.update(t);
  }

  return {
    scene,
    camera,
    update,
    hero: [arrow.group],
  };
}
