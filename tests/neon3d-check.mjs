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

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
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
  walk(resolve(projectDir, "assets", "neon3d"));
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
  profile = mkdtempSync(resolve(tmpdir(), "neon3d-check-"));
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
        pageErrors.push("exception: " + (details.exception?.description || details.text).split("\n")[0]);
      } else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        pageErrors.push("console.error: " + message.params.args.map(arg => arg.value ?? arg.description ?? "").join(" ").split("\n")[0]);
      }
      for (const waiter of eventWaiters) waiter(message);
    }
  };

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false }, sessionId);
  const loaded = waitForEvent("Page.loadEventFired", sessionId);
  await send("Page.navigate", { url: "http://127.0.0.1:" + port + "/index.html" }, sessionId);
  await loaded;
  const ready = await evaluate(`window.__hf?.buildReady?.neon3d
    ? Promise.race([window.__hf.buildReady.neon3d.then(() => "ok", error => "rejected: " + (error && error.message || error)),
        new Promise(resolve => setTimeout(() => resolve("timed out after 180 s"), 180000))])
    : "window.__hf.buildReady.neon3d is missing"`, sessionId, true);
  if (ready !== "ok") throw new Error("neon3d buildReady " + ready + (pageErrors.length ? "; " + [...new Set(pageErrors)].join("; ") : ""));

  // Each call renders a handful of frames; software WebGL needs seconds per frame, so one call per vignette.
  await evaluate(`(() => {
    const neon = window.__neon3d;
    const vignettes = neon.vignettes;
    const mid = v => (v.t + v.end) / 2;
    window.__neon3dCheck = {
      count: vignettes.length,
      vignette(k) {
        const v = vignettes[k];
        const len = v.end - v.t;
        const samples = [0.25, 0.5, 0.85].map(f => v.t + f * len).map(time => ({ time, ...neon.pixels(time) }));
        neon.pixels(mid(vignettes[(k + Math.ceil(vignettes.length / 2)) % vignettes.length]));
        const again = neon.pixels(samples[1].time);
        const rects = [];
        for (const f of [0.3, 0.55, 0.8]) for (const r of neon.heroRects(v.t + f * len)) rects.push({ time: v.t + f * len, ...r });
        const t0 = performance.now();
        neon.renderAt(mid(v) + 1 / 30);
        neon.renderAt(mid(v) + 2 / 30);
        const ms = (performance.now() - t0) / 2;
        return { id: v.id, t: v.t, end: v.end, kind: v.in.kind, samples, first: samples[1].hash, again: again.hash, rects, info: neon.info(), ms };
      },
      transition(k) {
        const v = vignettes[k];
        const time = v.in.kind === "fly" ? v.t - v.in.dur / 2 : v.t;
        const a = neon.pixels(time);
        neon.pixels(mid(vignettes[k - 1]));
        const b = neon.pixels(time);
        return { id: v.id, kind: v.in.kind, time, a: a.hash, b: b.hash, mean: a.mean, std: a.std };
      },
    };
    return true;
  })()`, sessionId);
  const report = await evaluate(`(() => {
    const rectOf = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const captionRects = [...document.querySelectorAll("#kara .kc")].map(rectOf).filter(r => r.width > 0 && r.height > 0);
    const watermarks = ["#watermark-top", "#watermark-bottom"].map(s => ({ selector: s, el: document.querySelector(s) }))
      .filter(w => w.el).map(w => ({ selector: w.selector, rect: rectOf(w.el) }));
    return { captionRects, captions: captionRects.length, watermarks, count: window.__neon3dCheck.count, vignettes: [], transitions: [] };
  })()`, sessionId);
  for (let k = 0; k < report.count; k++) report.vignettes.push(await evaluate("window.__neon3dCheck.vignette(" + k + ")", sessionId));
  for (let k = 1; k < report.count; k++) report.transitions.push(await evaluate("window.__neon3dCheck.transition(" + k + ")", sessionId));

  const overlaps = (a, b) => a.x < b.right && a.x + a.width > b.left && a.y < b.bottom && a.y + a.height > b.top;
  console.log("vignette     in     start    end   mean   std  calls  triangles   ms/frame");
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
    const s = v.samples[1];
    console.log([v.id.padEnd(10), v.kind.padEnd(6), v.t.toFixed(2).padStart(6), v.end.toFixed(2).padStart(6), s.mean.toFixed(1).padStart(6),
      s.std.toFixed(1).padStart(5), String(v.info.calls).padStart(6), String(v.info.triangles).padStart(10), v.ms.toFixed(1).padStart(10)].join(" ")
      + (own.length ? "  FAILED" : ""));
    for (const problem of [...new Set(own)]) failures.push(v.id + ": " + problem);
  }
  for (const t of report.transitions) {
    if (t.a !== t.b) failures.push(t.id + ": " + t.kind + " transition at " + t.time.toFixed(2) + "s is not deterministic");
    if (t.std < 2 && t.mean < 3) failures.push(t.id + ": " + t.kind + " transition at " + t.time.toFixed(2) + "s renders a blank frame");
  }
  console.log("transitions checked: " + report.transitions.length + "; caption lines: " + report.captions);
  for (const error of [...new Set(pageErrors)]) failures.push(error);
  if (failures.length) {
    console.log("NEON3D CHECK: FAILED - " + failures.join("; "));
    process.exitCode = 1;
  } else {
    console.log("NEON3D CHECK: PASSED");
  }
}

try {
  await main();
} catch (error) {
  console.log("NEON3D CHECK: FAILED - " + error.message);
  process.exitCode = 1;
} finally {
  socket?.close();
  browser?.kill();
  if (profile) rmSync(profile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(() => resolveClose()));
}
