// Two-mast sailing ship from clipper.glb, built in Blender by tests/fixtures/build-clipper-glb.py.
// The Sway clip swings the flag; it is posed from t, so any frame can be seeked in any order.
export async function clipper(kit, opts = {}) {
  const { THREE } = kit;
  const {
    scale = 0.5,
    position = [0, 0, 0],
    rotationY = 0,
    from = null,
    to = null,
    start = 0,
    dur = 5,
    curve = "linear",
    heightAt = null,
    waterLevel = 0,
    shadow = true,
  } = opts;
  const gltf = await kit.loadGlb("./vignettes/clipper/clipper.glb");
  kit.validateClip("clipper", "Sway", kit.id, gltf.animations.map(a => a.name));
  const model = kit.cloneGlb(gltf);
  model.scale.setScalar(scale);
  model.traverse(node => {
    if (node.isMesh) {
      node.castShadow = !!shadow;
      node.receiveShadow = !!shadow;
    }
  });
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;
  group.add(model);
  const sway = kit.clipPose(model, gltf, "Sway");

  function update(t) {
    if (from && to) {
      kit.followPath(group, t, { from, to, start, dur, curve, heightAt, waterLevel });
    } else if (heightAt) {
      group.position.y = heightAt(group.position.x, group.position.z, t) + (position[1] - waterLevel);
    }
    sway.pose(t);
  }
  update(0);
  return { group, hero: group, update };
}
