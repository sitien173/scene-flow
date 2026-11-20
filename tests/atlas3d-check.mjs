#!/usr/bin/env node
import { createReadStream, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";

const projectDir = resolve(process.argv[2] || ".");
const chromePath = process.env.CHROME_PATH;
if (!existsSync(resolve(projectDir, "index.html"))) throw new Error("project index.html not found: " + projectDir);
if (!chromePath || !existsSync(chromePath)) throw new Error("set CHROME_PATH to an installed chrome-headless-shell");

const backdropVignette = JSON.parse(readFileSync(resolve(projectDir, "vignettes.json"), "utf8")).vignettes
  .find(v => v.kind === "backdrop");

const mimeTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".mp3": "audio/mpeg", ".svg": "image/svg+xml",
  ".wav": "audio/wav", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2",
};
const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname).replace(/^\/+/, "") || "index.html";
  } catch {
    response.writeHead(400).end("bad request");
    return;
  }
  if (backdropVignette && pathname === "__test_hung_backdrop__/vignettes/" + backdropVignette.id + ".js") {
    const stub = `export function build(kit) {
  const scene = new kit.THREE.Scene();
  kit.backdrop(scene, {
    image: ${JSON.stringify(backdropVignette.image)},
    loader: { loadAsync: () => new Promise(() => {}) },
  });
  const camera = kit.camera(35);
  return { scene, camera, update() {} };
}`;
    response.writeHead(200, { "Cache-Control": "no-store", "Content-Length": Buffer.byteLength(stub), "Content-Type": "text/javascript; charset=utf-8" });
    response.end(stub);
    return;
  }
  if (pathname.startsWith("__test_hung_backdrop__/")) {
    pathname = pathname.slice("__test_hung_backdrop__/".length) || "index.html";
  }
  const file = resolve(projectDir, pathname);
  if (file !== projectDir && !file.startsWith(projectDir + sep)) {
    response.writeHead(403).end("forbidden");
    return;
  }
  let size;
  try {
    size = statSync(file).size;
  } catch {
    response.writeHead(404).end("not found");
    return;
  }
  response.writeHead(200, { "Cache-Control": "no-store", "Content-Length": size,
    "Content-Type": mimeTypes[extname(file).toLowerCase()] || "application/octet-stream" });
  createReadStream(file).pipe(response);
});

let browser;
let socket;
let profile;
let pending = new Map();
let eventWaiters = new Set();
let commandId = 0;

function waitForDevTools(child) {
  return new Promise((resolveEndpoint, reject) => {
    let stderr = "";
    const timeout = setTimeout(() => reject(new Error("timed out waiting for Chrome DevTools")), 20000);
    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timeout);
        resolveEndpoint(match[1]);
      }
    });
    child.once("exit", code => {
      clearTimeout(timeout);
      reject(new Error("Chrome exited before DevTools started (" + code + ")"));
    });
  });
}

function send(method, params = {}, sessionId) {
  return new Promise((resolveMessage, rejectMessage) => {
    const id = ++commandId;
    const timeout = setTimeout(() => {
      pending.delete(id);
      rejectMessage(new Error("DevTools command timed out: " + method));
    }, 200000);
    pending.set(id, { resolveMessage, rejectMessage, timeout });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

function waitForEvent(method, sessionId, timeoutMs = 60000) {
  return new Promise((resolveEvent, rejectEvent) => {
    const waiter = message => {
      if (message.method !== method || message.sessionId !== sessionId) return;
      clearTimeout(timeout);
      eventWaiters.delete(waiter);
      resolveEvent(message.params);
    };
    const timeout = setTimeout(() => {
      eventWaiters.delete(waiter);
      rejectEvent(new Error("DevTools event timed out: " + method));
    }, timeoutMs);
    eventWaiters.add(waiter);
  });
}

function evaluate(expression, sessionId, awaitPromise = false) {
  return send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise }, sessionId).then(result => {
    if (result.exceptionDetails) {
      throw new Error("page evaluation failed: " +
        (result.exceptionDetails.exception?.description || result.exceptionDetails.text));
    }
    return result.result.value;
  });
}

// Mirrors NEON_BANNED in skills/scene-flow/scripts/build.py: frames must depend on seek time only.
const BANNED = [/\brandom\b/, /\bDate\b/, /\bperformance\b/, /requestAnimationFrame/, /setAnimationLoop/, /setTimeout/,
  /setInterval/, /\bClock\b/, /\bTimer\b/, /getDelta/, /GlitchPass/, /FilmPass/, /\bfetch\b/, /XMLHttpRequest/,
  /WebSocket/, /\b(?:https?|wss?):/];
const EDGE = 24;

function sources() {
  const files = [];
  const walk = dir => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".js")) files.push(path);
    }
  };
  walk(resolve(projectDir, "vignettes"));
  walk(resolve(projectDir, "assets", "atlas3d", "kit"));
  return files;
}

function banScan() {
  const problems = [];
  for (const file of sources()) {
    const text = readFileSync(file, "utf8");
    for (const pattern of BANNED) {
      const match = pattern.exec(text);
      if (match) problems.push(relative(projectDir, file) + ":" + (text.slice(0, match.index).split("\n").length) + " uses " + match[0]);
    }
  }
  return problems;
}

async function main() {
  const failures = [];
  const banned = banScan();
  if (banned.length) failures.push("banned API: " + banned.join(", "));
  console.log("ban scan: " + (banned.length ? banned.length + " problem(s)" : "clean over " + sources().length + " file(s)"));

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const port = server.address().port;
  profile = mkdtempSync(resolve(tmpdir(), "atlas3d-check-"));
  browser = spawn(chromePath, ["--remote-debugging-port=0", "--no-first-run", "--hide-scrollbars", "--mute-audio",
    "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    "--user-data-dir=" + profile, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const endpoint = await waitForDevTools(browser);
  socket = new WebSocket(endpoint);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.onopen = resolveOpen;
    socket.onerror = () => rejectOpen(new Error("could not connect to Chrome DevTools"));
  });
  const pageErrors = [];
  const hungErrors = [];
  let mainSessionId = null;
  let hungSessionId = null;
  const routeError = (sid, text) => {
    if (sid && sid === hungSessionId) hungErrors.push(text);
    else if (!sid || sid === mainSessionId) pageErrors.push(text);
  };
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(entry.timeout);
      if (message.error) entry.rejectMessage(new Error(message.error.message));
      else entry.resolveMessage(message.result);
    } else if (message.method) {
      if (message.method === "Runtime.exceptionThrown") {
        const details = message.params.exceptionDetails;
        routeError(message.sessionId, "exception: " + (details.exception?.description || details.text).split("\n")[0]);
      } else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        routeError(message.sessionId, "console.error: " + message.params.args.map(arg => arg.value ?? arg.description ?? "").join(" ").split("\n")[0]);
      } else if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
        const entry = message.params.entry;
        routeError(message.sessionId, "log: " + entry.text.split("\n")[0] + (entry.url ? " " + entry.url : ""));
      }
      for (const waiter of eventWaiters) waiter(message);
    }
  };

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  mainSessionId = sessionId;
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  // Failed module and resource loads are reported on the Log domain, not as console.error.
  await send("Log.enable", {}, sessionId);
  await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false }, sessionId);
  const loaded = waitForEvent("Page.loadEventFired", sessionId);
  await send("Page.navigate", { url: "http://127.0.0.1:" + port + "/index.html" }, sessionId);
  await loaded;
  const ready = await evaluate(`window.__hf?.buildReady?.atlas3d
    ? Promise.race([window.__hf.buildReady.atlas3d.then(() => "ok", error => "rejected: " + (error && error.message || error)),
        new Promise(resolve => setTimeout(() => resolve("timed out after 180 s"), 180000))])
    : "window.__hf.buildReady.atlas3d is missing"`, sessionId, true);
  if (ready !== "ok") throw new Error("atlas3d buildReady " + ready + (pageErrors.length ? "; " + [...new Set(pageErrors)].join("; ") : ""));

  // Each call renders a handful of frames; software WebGL needs seconds per frame, so one call per vignette.
  await evaluate(`(() => {
    const atlas = window.__atlas3d;
    const vignettes = atlas.vignettes;
    const mid = v => (v.t + v.end) / 2;
    window.__atlas3dCheck = {
      count: vignettes.length,
      vignette(k) {
        const v = vignettes[k];
        const len = v.end - v.t;
        const samples = [0.25, 0.5, 0.85].map(f => v.t + f * len).map(time => ({ time, ...atlas.pixels(time) }));
        atlas.pixels(mid(vignettes[(k + Math.ceil(vignettes.length / 2)) % vignettes.length]));
        const again = atlas.pixels(samples[1].time);
        const rects = [];
        for (const f of [0.3, 0.55, 0.8]) for (const r of atlas.heroRects(v.t + f * len)) rects.push({ time: v.t + f * len, ...r });
        const audit = typeof atlas.heroAudit === "function" ? atlas.heroAudit(k) : { supported: false };
        const t0 = performance.now();
        atlas.renderAt(mid(v) + 1 / 30);
        atlas.renderAt(mid(v) + 2 / 30);
        const ms = (performance.now() - t0) / 2;
        return { id: v.id, t: v.t, end: v.end, kind: v.kind, transition: v.in.kind, samples, first: samples[1].hash, again: again.hash, rects, audit, info: atlas.info(), ms };
      },
      transition(k) {
        const v = vignettes[k];
        const prev = vignettes[k - 1];
        const dur = v.in.kind === "pan" ? v.in.dur : 0;
        // A pan is sampled inside its ease window, not at its edges. Frames are rendered forward, then in
        // reverse with no call in between, so every frame is re-rendered after an odd number of seeks.
        const times = dur > 0 ? [0.2, 0.5, 0.8].map(f => v.t + f * dur) : [v.t];
        const forward = times.map(time => atlas.pixels(time));
        const reverse = [...times].reverse().map(time => atlas.pixels(time)).reverse();
        const frames = forward.map((f, i) => ({ time: times[i], hash: f.hash, again: reverse[i].hash, mean: f.mean, std: f.std }));
        return { id: v.id, kind: v.in.kind, frames };
      },
      mapOrderTimes() {
        const mapVignettes = vignettes.filter(v => (v.kind || "map") === "map");
        const timesSet = new Set();
        for (const v of mapVignettes) {
          const len = v.end - v.t;
          for (const f of [0.1, 0.5, 0.9]) timesSet.add(Number((v.t + f * len).toFixed(4)));
          for (const bt of Object.values(v.beats || {})) {
            if (bt + 0.25 < v.end) timesSet.add(Number((bt + 0.25).toFixed(4)));
          }
        }
        return [...timesSet].sort((a, b) => a - b);
      },
      mapOrderStart() {
        atlas.renderAt(0);
      },
      mapOrderSnap(t) {
        return {
          time: t,
          hash: atlas.pixels(t).hash,
          labels: typeof atlas.labelRects === "function" ? atlas.labelRects(t) : [],
        };
      },
      mapOrderTurn() {
        const mapVignettes = vignettes.filter(v => (v.kind || "map") === "map");
        const lastMap = mapVignettes[mapVignettes.length - 1];
        atlas.renderAt(Math.max(lastMap.t, lastMap.end - 0.05));
      },
      mapColors(k) {
        if (typeof atlas.mapProbe !== "function" || typeof atlas.pixelAt !== "function") return { supported: false, sample: null };
        const v = vignettes[k];
        const time = v.t + 0.85 * (v.end - v.t);
        const probe = atlas.mapProbe(time);
        if (!probe) return { supported: true, sample: null };
        const filled = (probe.filled || []).map(f => ({
          id: f.id, x: f.x, y: f.y, rgb: atlas.pixelAt(f.x, f.y, time),
        }));
        const unfilled = probe.unfilled
          ? { x: probe.unfilled.x, y: probe.unfilled.y, rgb: atlas.pixelAt(probe.unfilled.x, probe.unfilled.y, time) }
          : null;
        return { supported: true, sample: { id: v.id, time, filled, unfilled } };
      },
      mapLabels(k) {
        if (typeof atlas.labelRects !== "function") return { supported: false, frames: [] };
        const v = vignettes[k];
        const len = v.end - v.t;
        const frames = [];
        for (const f of [0.3, 0.55, 0.85]) {
          const time = v.t + f * len;
          frames.push({ id: v.id, time, rects: atlas.labelRects(time) });
        }
        return { supported: true, frames };
      },
      async fovSeek() {
        const { createKit } = await import("atlas3d/kit");
        const kit = createKit({ id: "fov-seek-check" });
        const cam = kit.camera(35);
        const poseA = kit.view(2.3, 46.8, 0.85, 22, { fov: 35 });
        const poseB = kit.view(2.3, 46.5, 0.95, 20, { fov: 35 });
        const poseC = kit.view(-1.5, 42.2, 0.85, 20, { fov: 55 });
        const seek = t => {
          if (t <= 1) kit.move(cam, t, poseA, poseB, 1, { start: 0 });
          else kit.move(cam, t, poseB, poseC, 1, { start: 1 });
          return { fov: cam.fov, m00: cam.projectionMatrix.elements[0] };
        };
        const first = seek(0.5);
        const mid = seek(2.0);
        const again = seek(0.5);
        return { first, mid, again };
      },
      async figureSeek() {
        const kitMod = await import("atlas3d/kit");
        const kit = kitMod.createKit({ id: "figure-seek-check" });
        if (typeof kit.figure !== "function") {
          return { supported: false, reason: "kit.figure missing" };
        }
        if (typeof kit.prop !== "function" || !Array.isArray(kitMod.PROP_KINDS) || kitMod.PROP_KINDS.length !== 6) {
          return { supported: false, reason: "kit.prop or 6 PROP_KINDS missing" };
        }
        const scene = new kit.THREE.Scene();
        kit.look.lights(scene);
        const fig = kit.figure("king", { expression: "smile", gesture: "wave", at: 0, popDur: 0.3 });
        scene.add(fig.group);
        const probe = t => {
          fig.update(t);
          fig.group.updateMatrixWorld(true);
          const mats = [];
          fig.group.traverse(o => {
            if (o.isMesh) mats.push(o.matrixWorld.elements.map(n => Number(n.toFixed(6))));
          });
          return mats;
        };
        const first = probe(0.65);
        const mid = probe(1.9);
        const again = probe(0.65);
        return {
          supported: true,
          parts: first.length,
          moved: JSON.stringify(first) !== JSON.stringify(mid),
          deterministic: JSON.stringify(first) === JSON.stringify(again),
        };
      },
      async reviewFixChecks() {
        const kitMod = await import("atlas3d/kit");
        const THREE = kitMod.THREE || (await import("three"));
        // Finding 2: options-only kit.backdrop({ plateWidth: 6 }) merges kit image.
        let backdropOptsOk = false;
        let backdropOptsError = null;
        try {
          const bdKit = kitMod.createKit({ id: "bd-opts-regression", image: "backdrops/sample.webp" });
          const bd = bdKit.backdrop({ plateWidth: 6 });
          await bd.ready;
          backdropOptsOk = bd.plate?.geometry?.parameters?.width === 6;
        } catch (err) {
          backdropOptsError = err && err.message ? err.message : String(err);
        }

        // Finding 3: cargoCrate and moneyBag hull minY covers lower half of body.
        const kit = kitMod.createKit({ id: "prop-bounds-check" });
        const crate = kit.props.cargoCrate({ at: 0, popDur: 0.2 });
        crate.update(0.5);
        crate.group.updateMatrixWorld(true);
        const crateMeshes = [];
        crate.group.traverse(o => { if (o.isMesh) crateMeshes.push(o); });
        const crateBody = crateMeshes.find(m => m.material.side !== THREE.BackSide);
        const crateHull = crateMeshes.find(m => m.material.side === THREE.BackSide);
        const crateBodyBox = new THREE.Box3().setFromObject(crateBody);
        const crateHullBox = new THREE.Box3().setFromObject(crateHull);

        const bag = kit.props.moneyBag({ at: 0, popDur: 0.2 });
        bag.update(0.5);
        bag.group.updateMatrixWorld(true);
        let bagSack = null;
        let bagHull = null;
        bag.group.traverse(child => {
          if (!bagSack && child.isMesh && child.children.some(c => c.isMesh && c.material.side === THREE.BackSide)) {
            bagSack = child;
            bagHull = child.children.find(c => c.isMesh && c.material.side === THREE.BackSide);
          }
        });
        const bagBodyBox = new THREE.Box3().setFromObject(bagSack);
        const bagHullBox = new THREE.Box3().setFromObject(bagHull);

        // Finding 4: figure on map faces camera (dot >= 0.85) and is deterministic.
        const map = kitMod.createMap({ regions: [], overlay: null });
        const mapScene = new THREE.Scene();
        mapScene.add(map.group);
        const cam = new THREE.PerspectiveCamera(35, 1080 / 1920, 0.1, 500);
        const pose = kitMod.createKit({ id: "map-pose-check" }).view(2.3, 46.8, 0.85, 22);
        kitMod.createKit({ id: "map-pose-apply" }).applyView(cam, pose);
        const fig = kitMod.createFigure("king", {
          expression: "smile",
          gesture: "idle",
          position: kitMod.createKit({ id: "pos-check" }).lonLatToWorld(0.6, 46.8, 0.145),
          at: 0,
          popDur: 0.2,
        });
        mapScene.add(fig.group);
        fig.update(0.5);
        map.update(0.5, cam);
        fig.group.updateMatrixWorld(true);

        // Head sphere has radius ~0.225 (largest child inside headHolder).
        let headMesh = null;
        fig.group.traverse(o => {
          if (o.isMesh && o.geometry?.type === "SphereGeometry" && Math.abs((o.geometry.parameters?.radius || 0) - 0.225) < 0.01) {
            headMesh = o;
          }
        });
        const headPos = new THREE.Vector3();
        const headQuat = new THREE.Quaternion();
        headMesh.getWorldPosition(headPos);
        headMesh.getWorldQuaternion(headQuat);
        const faceDir = new THREE.Vector3(0, 0, 1).applyQuaternion(headQuat).normalize();
        const toCam = cam.position.clone().sub(headPos).normalize();
        const faceCamDot = faceDir.dot(toCam);

        return {
          backdropOptsOk,
          backdropOptsError,
          crateBodyMinY: Number(crateBodyBox.min.y.toFixed(4)),
          crateHullMinY: Number(crateHullBox.min.y.toFixed(4)),
          bagBodyMinY: Number(bagBodyBox.min.y.toFixed(4)),
          bagHullMinY: Number(bagHullBox.min.y.toFixed(4)),
          faceCamDot: Number(faceCamDot.toFixed(4)),
        };
      },
    };
    return true;
  })()`, sessionId);
  const report = await evaluate(`(() => {
    const rectOf = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const captionRects = [...document.querySelectorAll("#kara .kc")].map(rectOf).filter(r => r.width > 0 && r.height > 0);
    const watermarks = ["#watermark-top", "#watermark-bottom"].map(s => ({ selector: s, el: document.querySelector(s) }))
      .filter(w => w.el).map(w => ({ selector: w.selector, rect: rectOf(w.el) }));
    return { captionRects, captions: captionRects.length, watermarks, count: window.__atlas3dCheck.count, vignettes: [], transitions: [] };
  })()`, sessionId);
  for (let k = 0; k < report.count; k++) report.vignettes.push(await evaluate("window.__atlas3dCheck.vignette(" + k + ")", sessionId));
  for (let k = 1; k < report.count; k++) report.transitions.push(await evaluate("window.__atlas3dCheck.transition(" + k + ")", sessionId));
  // One evaluate per render time, so no single call approaches the Runtime.evaluate timeout.
  const mapIndexes = report.vignettes.map((v, k) => (v.kind || "map") === "map" ? k : -1).filter(k => k >= 0);
  const orderTimes = mapIndexes.length ? await evaluate("window.__atlas3dCheck.mapOrderTimes()", sessionId) : [];
  const snap = t => evaluate("window.__atlas3dCheck.mapOrderSnap(" + t + ")", sessionId);
  report.mapOrder = { count: orderTimes.length, forward: [], backward: [] };
  if (orderTimes.length) {
    await evaluate("window.__atlas3dCheck.mapOrderStart()", sessionId);
    for (const t of orderTimes) report.mapOrder.forward.push(await snap(t));
    await evaluate("window.__atlas3dCheck.mapOrderTurn()", sessionId);
    for (const t of [...orderTimes].reverse()) report.mapOrder.backward.unshift(await snap(t));
  }
  report.mapColors = { supported: true, samples: [] };
  report.mapLabels = { supported: true, frames: [] };
  for (const k of mapIndexes) {
    const colors = await evaluate("window.__atlas3dCheck.mapColors(" + k + ")", sessionId);
    if (!colors.supported) report.mapColors.supported = false;
    else if (colors.sample) report.mapColors.samples.push(colors.sample);
    const labels = await evaluate("window.__atlas3dCheck.mapLabels(" + k + ")", sessionId);
    if (!labels.supported) report.mapLabels.supported = false;
    else report.mapLabels.frames.push(...labels.frames);
  }
  report.fovSeek = await evaluate("window.__atlas3dCheck.fovSeek()", sessionId, true);
  report.figureSeek = await evaluate("window.__atlas3dCheck.figureSeek()", sessionId, true);
  report.reviewFix = await evaluate("window.__atlas3dCheck.reviewFixChecks()", sessionId, true);

  // Finding 1: hung backdrop image load rejects within setup deadline with vignette id and image path.
  let hungReady = "";
  if (backdropVignette) {
    const { targetId: hungTargetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId: hSessionId } = await send("Target.attachToTarget", { targetId: hungTargetId, flatten: true });
    hungSessionId = hSessionId;
    await send("Page.enable", {}, hungSessionId);
    await send("Runtime.enable", {}, hungSessionId);
    await send("Log.enable", {}, hungSessionId);
    await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.__atlas3dSetupTimeoutMs = 2000;" }, hungSessionId);
    const hungLoaded = waitForEvent("Page.loadEventFired", hungSessionId);
    await send("Page.navigate", { url: "http://127.0.0.1:" + port + "/__test_hung_backdrop__/index.html" }, hungSessionId);
    await hungLoaded;
    hungReady = await evaluate(`window.__hf?.buildReady?.atlas3d
      ? Promise.race([
          window.__hf.buildReady.atlas3d.then(() => "ok", error => "rejected: " + (error && error.message || error)),
          new Promise(resolve => setTimeout(() => resolve("timed out after 20 s"), 20000)),
        ])
      : "missing"`, hungSessionId, true);
    await send("Target.closeTarget", { targetId: hungTargetId });
    hungSessionId = null;
  }

  const overlaps = (a, b) => a.x < b.right && a.x + a.width > b.left && a.y < b.bottom && a.y + a.height > b.top;
  console.log("vignette     kind     in     start    end   mean   std  calls  triangles   ms/frame");
  for (const v of report.vignettes) {
    const own = [];
    if (v.first !== v.again) own.push("not deterministic: hash " + v.first + " then " + v.again + " at the same time");
    for (const s of v.samples) {
      if (s.std < 4 || s.mean < 3) own.push("blank frame at " + s.time.toFixed(2) + "s (mean " + s.mean.toFixed(1) + ", std " + s.std.toFixed(1) + ")");
    }
    for (const r of v.rects) {
      const what = r.kind + " at " + r.time.toFixed(2) + "s [" + [r.x, r.y, r.x + r.width, r.y + r.height].map(n => Math.round(n)).join(",") + "]";
      if (r.x < EDGE || r.y < EDGE || r.x + r.width > 1080 - EDGE || r.y + r.height > 1920 - EDGE) own.push(what + " is within " + EDGE + "px of a frame edge");
      if (report.captionRects.some(c => overlaps(r, c))) own.push(what + " intersects the #kara caption band");
      for (const w of report.watermarks) if (overlaps(r, w.rect)) own.push(what + " intersects " + w.selector);
    }
    if (!v.rects.some(r => r.kind === "hero")) own.push("build returned no hero to check");
    if (!v.audit?.supported) own.push("window.__atlas3d.heroAudit missing");
    else if (v.audit.unregistered.length) own.push("unregistered figure/prop hero(es): " + v.audit.unregistered.join(", "));
    const s = v.samples[1];
    console.log([v.id.padEnd(10), v.kind.padEnd(8), v.transition.padEnd(6), v.t.toFixed(2).padStart(6), v.end.toFixed(2).padStart(6), s.mean.toFixed(1).padStart(6),
      s.std.toFixed(1).padStart(5), String(v.info.calls).padStart(6), String(v.info.triangles).padStart(10), v.ms.toFixed(1).padStart(10)].join(" ")
      + (own.length ? "  FAILED" : ""));
    for (const problem of [...new Set(own)]) failures.push(v.id + ": " + problem);
  }
  for (const t of report.transitions) {
    if (!["cut", "pan"].includes(t.kind)) failures.push(t.id + ": transition kind " + t.kind + " is not cut or pan");
    for (const f of t.frames) {
      if (f.hash !== f.again) failures.push(t.id + ": " + t.kind + " transition at " + f.time.toFixed(2) + "s is not deterministic under out-of-order seeks");
      if (f.std < 2 && f.mean < 3) failures.push(t.id + ": " + t.kind + " transition at " + f.time.toFixed(2) + "s renders a blank frame");
    }
  }
  console.log("transitions checked: " + report.transitions.length + "; caption lines: " + report.captions);
  if (!report.mapOrder.count) {
    failures.push("mapOrder: no map vignettes found");
  } else {
    for (let i = 0; i < report.mapOrder.count; i++) {
      const f = report.mapOrder.forward[i];
      const b = report.mapOrder.backward[i];
      if (f.hash !== b.hash) failures.push("mapOrder: pixel hash at " + f.time.toFixed(2) + "s differs forward (" + f.hash + ") vs backward (" + b.hash + ")");
      if (JSON.stringify(f.labels) !== JSON.stringify(b.labels)) failures.push("mapOrder: labels at " + f.time.toFixed(2) + "s differ forward vs backward");
    }
  }
  if (!report.mapColors.supported) {
    failures.push("mapColors: window.__atlas3d.mapProbe/pixelAt missing");
  } else {
    const colorPairs = report.mapColors.samples.filter(s => s.filled.length > 0 && s.unfilled);
    if (!colorPairs.length) failures.push("mapColors: no filled region and unfilled land sample on any map vignette");
    for (const s of colorPairs) {
      const u = s.unfilled.rgb;
      for (const f of s.filled) {
        const diff = Math.abs(f.rgb[0] - u[0]) + Math.abs(f.rgb[1] - u[1]) + Math.abs(f.rgb[2] - u[2]);
        if (diff < 30) failures.push("mapColors: region " + f.id + " at " + s.time.toFixed(2) + "s (" + f.rgb.join(",") + ") does not differ from unfilled land (" + u.join(",") + ")");
      }
    }
  }
  if (!report.mapLabels.supported) {
    failures.push("mapLabels: window.__atlas3d.labelRects missing");
  } else {
    let totalLabels = 0;
    for (const frame of report.mapLabels.frames) {
      totalLabels += frame.rects.length;
      for (const r of frame.rects) {
        const what = "label " + JSON.stringify(r.text) + " at " + frame.time.toFixed(2) + "s [" + [r.x, r.y, r.x + r.width, r.y + r.height].map(n => Math.round(n)).join(",") + "]";
        if (r.x < EDGE || r.y < EDGE || r.x + r.width > 1080 - EDGE || r.y + r.height > 1920 - EDGE) {
          failures.push(frame.id + ": " + what + " is within " + EDGE + "px of a frame edge");
        }
        if (report.captionRects.some(c => overlaps(r, c))) failures.push(frame.id + ": " + what + " intersects the #kara caption band");
        for (const w of report.watermarks) if (overlaps(r, w.rect)) failures.push(frame.id + ": " + what + " intersects " + w.selector);
      }
    }
    if (!totalLabels) failures.push("mapLabels: no DOM map labels visible across map vignettes");
  }
  if (report.fovSeek.first.fov !== 35 || report.fovSeek.mid.fov !== 55 ||
      report.fovSeek.again.fov !== report.fovSeek.first.fov || report.fovSeek.again.m00 !== report.fovSeek.first.m00) {
    failures.push("fovSeek: out-of-order seek 0.5->2->0.5 gave FOV " + report.fovSeek.first.fov + "->" +
      report.fovSeek.mid.fov + "->" + report.fovSeek.again.fov + " (projection m00 " +
      report.fovSeek.first.m00.toFixed(6) + " vs " + report.fovSeek.again.m00.toFixed(6) + ")");
  }
  console.log("map checks: order=" + report.mapOrder.count + ", colorSamples=" + report.mapColors.samples.length +
    ", labelFrames=" + report.mapLabels.frames.length + ", fovSeek=" +
    [report.fovSeek.first.fov, report.fovSeek.mid.fov, report.fovSeek.again.fov].join("->"));
  if (!report.figureSeek.supported) {
    failures.push("figureSeek: " + report.figureSeek.reason);
  } else {
    if (!report.figureSeek.parts || !report.figureSeek.moved) {
      failures.push("figureSeek: figure did not animate mid-gesture");
    }
    if (!report.figureSeek.deterministic) {
      failures.push("figureSeek: out-of-order seek 0.65->1.9->0.65 changed figure part transforms");
    }
    console.log("figure check: parts=" + report.figureSeek.parts + ", moved=" + report.figureSeek.moved +
      ", deterministic=" + report.figureSeek.deterministic);
  }
  const rf = report.reviewFix;
  if (!rf.backdropOptsOk) {
    failures.push("backdropOptionsOnly: " + (rf.backdropOptsError || "plateWidth mismatch"));
  }
  if (!(rf.crateHullMinY <= 0.02 && rf.crateHullMinY <= rf.crateBodyMinY + 0.01)) {
    failures.push("cargoCrate hull minY=" + rf.crateHullMinY + " does not cover body minY=" + rf.crateBodyMinY);
  }
  if (!(rf.bagHullMinY <= 0.02 && rf.bagHullMinY <= rf.bagBodyMinY + 0.02)) {
    failures.push("moneyBag hull minY=" + rf.bagHullMinY + " does not cover body minY=" + rf.bagBodyMinY);
  }
  if (!(rf.faceCamDot >= 0.85)) {
    failures.push("mapFigure faceCamDot=" + rf.faceCamDot + " (< 0.85, character is not facing camera)");
  }
  const figureV = report.vignettes.find(v => v.kind === "map" && v.rects.some(r => r.kind === "hero"));
  if (figureV) {
    const heroHeights = figureV.rects.filter(r => r.kind === "hero").map(r => r.height / 1920);
    const maxFigFrac = Math.max(...heroHeights);
    if (maxFigFrac < 0.10 || maxFigFrac > 0.16) {
      failures.push(figureV.id + " figure height=" + (maxFigFrac * 100).toFixed(1) + "% (expected 10-15% of frame height)");
    }
    console.log("diorama check: " + figureV.id + " faceCamDot=" + rf.faceCamDot + ", maxMapHeroHeight=" + (maxFigFrac * 100).toFixed(1) + "%");
  } else {
    console.log("diorama check skipped: no map vignette adds a figure");
  }
  if (!backdropVignette) {
    console.log("deadline check skipped: no backdrop vignette in vignettes.json");
  } else {
    const names = "'" + backdropVignette.id + "' and '" + backdropVignette.image + "'";
    if (!hungReady.startsWith("rejected:") || !hungReady.includes(backdropVignette.id) || !hungReady.includes(backdropVignette.image)) {
      failures.push("backdropDeadline: expected rejection naming " + names + ", got: " + hungReady);
    }
    if (!hungErrors.some(e => e.includes(backdropVignette.id) && e.includes(backdropVignette.image))) {
      failures.push("backdropDeadline: expected console/log error naming " + names + ", got: " + JSON.stringify(hungErrors));
    }
    console.log("deadline check: " + hungReady + "; errors=" + hungErrors.length);
  }
  for (const error of [...new Set(pageErrors)]) failures.push(error);
  if (failures.length) {
    console.log("ATLAS3D CHECK: FAILED - " + failures.join("; "));
    process.exitCode = 1;
  } else {
    console.log("ATLAS3D CHECK: PASSED");
  }
}

try {
  await main();
} catch (error) {
  console.log("ATLAS3D CHECK: FAILED - " + error.message);
  process.exitCode = 1;
} finally {
  socket?.close();
  browser?.kill();
  if (profile) rmSync(profile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(() => resolveClose()));
}
