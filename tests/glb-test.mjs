#!/usr/bin/env node
// Tests each 3D kit's glb.js against a tiny GLB built here: one cached load per URL, clip-name errors that
// name the model and the vignette, clones, and clip poses that match after seeking a, b, a.
import { registerHooks } from "node:module";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = join(ROOT, "skills", "scene-flow", "assets", "vendor", "three");
const threeUrl = pathToFileURL(join(VENDOR, "three.module.js")).href;
const addonsUrl = pathToFileURL(join(VENDOR, "addons")).href + "/";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "three") return { shortCircuit: true, url: threeUrl };
    if (specifier.startsWith("three/addons/")) return { shortCircuit: true, url: addonsUrl + specifier.slice(13) };
    return next(specifier, context);
  },
});

// FileLoader reports progress with a browser-only event class.
globalThis.ProgressEvent ??= class extends Event {
  constructor(type, init = {}) { super(type); Object.assign(this, init); }
};

// One triangle under node "Box", and clip "Move" that slides it from x = 0 to x = 2 over 1 s.
function makeGlb() {
  const floats = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2, 0, 0];
  const bin = Buffer.alloc(floats.length * 4);
  floats.forEach((v, i) => bin.writeFloatLE(v, i * 4));
  const gltf = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "Box", mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 8 },
      { buffer: 0, byteOffset: 44, byteLength: 24 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 2, type: "SCALAR", min: [0], max: [1] },
      { bufferView: 2, componentType: 5126, count: 2, type: "VEC3" },
    ],
    animations: [{
      name: "Move",
      samplers: [{ input: 1, output: 2, interpolation: "LINEAR" }],
      channels: [{ sampler: 0, target: { node: 0, path: "translation" } }],
    }],
  };
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.write("glTF", 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(type, 4);
    return Buffer.concat([head, data]);
  };
  return Buffer.concat([header, chunk(0x4e4f534a, json), chunk(0x004e4942, bin)]);
}

const glb = makeGlb();
let requests = 0;
const server = createServer((req, res) => {
  requests++;
  res.writeHead(200, { "Content-Type": "model/gltf-binary", "Content-Length": glb.length }).end(glb);
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const base = "http://127.0.0.1:" + server.address().port + "/";

try {
  for (const theme of ["neon3d", "atlas3d", "terra3d"]) {
    const kit = await import(pathToFileURL(join(ROOT, "skills", "scene-flow", "assets", theme, "kit", "glb.js")).href);
    const url = base + theme + "/box.glb";
    const before = requests;
    const first = kit.loadGlb(url);
    assert.equal(kit.loadGlb(url), first, theme + ": loadGlb must return one cached promise per URL");
    const gltf = await first;
    assert.equal(requests - before, 1, theme + ": loadGlb must fetch each URL once");

    const names = gltf.animations.map(a => a.name);
    assert.deepEqual(names, ["Move"], theme + ": fixture clips");
    kit.validateClip("box.glb", "Move", "v1", names);
    assert.throws(() => kit.validateClip("box.glb", "Jump", "v1", names),
      e => e.message.includes("box.glb") && e.message.includes("v1") && e.message.includes("Jump"),
      theme + ": validateClip must name the model, the vignette, and the clip");

    const a = kit.cloneGlb(gltf);
    const b = kit.cloneGlb(gltf);
    assert.notEqual(a, b);
    assert.ok(a.getObjectByName("Box") && b.getObjectByName("Box"), theme + ": clones keep their nodes");

    const box = a.getObjectByName("Box");
    const anim = kit.clipPose(a, gltf, "Move");
    anim.pose(0.25);
    const x1 = box.position.x;
    anim.pose(0.8);
    const x2 = box.position.x;
    anim.pose(0.25);
    assert.ok(Math.abs(x1 - 0.5) < 1e-5, theme + ": pose(0.25) puts Box at x = 0.5, got " + x1);
    assert.ok(Math.abs(x2 - 1.6) < 1e-5, theme + ": pose(0.8) puts Box at x = 1.6, got " + x2);
    assert.equal(box.position.x, x1, theme + ": seeking 0.25, 0.8, 0.25 must give the same pose");
    assert.throws(() => kit.clipPose(b, gltf, "Jump"), /Jump/, theme + ": clipPose must reject an unknown clip");
    console.log(theme + " glb.js ok");
  }
} finally {
  server.close();
}
