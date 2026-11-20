// Sentences 12-13: Wide North Atlantic view showing Paris signing and ratification route to Washington.
export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);
  scene.add(kit.map.group);

  const camera = kit.camera(35);
  const parisPose = kit.view(2.35, 48.86, 0.65, 20);
  const washPose = kit.view(-77.04, 38.9, 0.65, 20);
  kit.applyView(camera, parisPose);

  const ratifyAt = kit.beat("ratify");
  const moveDur = 1.4;

  kit.map.label([2.35, 48.86], "Paris, 30/4/1803", {
    at: 0.15,
    dur: 0.35,
    until: ratifyAt + 0.25,
    offset: [0, -32],
  });
  kit.map.route(
    [[2.35, 48.86], [0.1, 49.5], [-38.0, 45.0], [-77.04, 38.9]],
    { at: ratifyAt, dur: moveDur, persist: false },
  );
  kit.map.label([-77.04, 38.9], "Washington, 20/10/1803", {
    at: ratifyAt + 1.25,
    dur: 0.25,
    offset: [0, 36],
  });

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const ship = kit.props.sailingShip({
    scale: 2.2,
    position: kit.lonLatToWorld(-10.0, 47.0, 0.015),
    rotationY: -1.45,
    at: ratifyAt + 0.05,
    popDur: 0.35,
  });

  layerGroup.add(ship.group);

  function update(t) {
    kit.move(camera, t, parisPose, washPose, moveDur, { start: ratifyAt });
    const u = kit.ease(kit.progress(t, ratifyAt, moveDur), "inOut");
    const shipLon = kit.lerp(-6.0, -70.0, u);
    const shipLat = kit.lerp(48.0, 39.2, u);
    ship.group.position.copy(kit.lonLatToWorld(shipLon, shipLat, 0.015));
    ship.update(t);
  }

  return {
    scene,
    camera,
    update,
    hero: [ship.group],
  };
}
