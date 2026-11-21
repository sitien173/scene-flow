#!/usr/bin/env node
import { createReadStream, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";

const projectDir = resolve(process.argv[2] || ".");
const chromePath = process.env.CHROME_PATH;
const checkScale = Number(process.env.TOON3D_CHECK_SCALE || "0.5");
if (!existsSync(resolve(projectDir, "index.html"))) throw new Error("project index.html not found: " + projectDir);
if (!chromePath || !existsSync(chromePath)) throw new Error("set CHROME_PATH to an installed chrome-headless-shell");

const mimeTypes = {
  ".css": "text/css; charset=utf-8", ".glb": "model/gltf-binary", ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".mp3": "audio/mpeg", ".png": "image/png", ".svg": "image/svg+xml",
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
  walk(resolve(projectDir, "assets", "toon3d"));
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
  profile = mkdtempSync(resolve(tmpdir(), "toon3d-check-"));
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
  const ready = await evaluate(`window.__hf?.buildReady?.toon3d
    ? Promise.race([window.__hf.buildReady.toon3d.then(() => "ok", error => "rejected: " + (error && error.message || error)),
        new Promise(resolve => setTimeout(() => resolve("timed out after 180 s"), 180000))])
    : "window.__hf.buildReady.toon3d is missing"`, sessionId, true);
  if (ready !== "ok") throw new Error("toon3d buildReady " + ready + (pageErrors.length ? "; " + [...new Set(pageErrors)].join("; ") : ""));

  // Low-resolution mode reduces software WebGL pixel cost while keeping all determinism and overlap checks.
  const res = await evaluate(`window.__toon3d.setScale(${JSON.stringify(checkScale)})`, sessionId);
  console.log("render resolution: " + res.width + "x" + res.height + " (scale " + checkScale + ")");

  await evaluate(`(() => {
    const toon = window.__toon3d;
    const vignettes = toon.vignettes;
    const mid = v => (v.t + v.end) / 2;
    window.__toon3dCheck = {
      count: vignettes.length,
      vignette(k) {
        const v = vignettes[k];
        const len = v.end - v.t;
        const samples = [0.25, 0.5, 0.85].map(f => v.t + f * len).map(time => ({ time, ...toon.pixels(time) }));
        const again = toon.pixels(samples[1].time);
        const t0 = performance.now();
        toon.renderAt(mid(v) + 1 / 30);
        toon.renderAt(mid(v) + 2 / 30);
        const ms = (performance.now() - t0) / 2;
        return { id: v.id, t: v.t, end: v.end, kind: v.in.kind, samples, first: samples[1].hash, again: again.hash, info: toon.info(), ms };
      },
      transition(k) {
        const v = vignettes[k];
        const time = v.t;
        const a = toon.pixels(time);
        toon.pixels(mid(vignettes[k - 1]));
        const b = toon.pixels(time);
        return { id: v.id, kind: v.in.kind, time, a: a.hash, b: b.hash, mean: a.mean, std: a.std };
      },
    };
    return true;
  })()`, sessionId);

  const count = await evaluate("window.__toon3dCheck.count", sessionId);
  const report = { vignettes: [], transitions: [] };
  for (let k = 0; k < count; k++) report.vignettes.push(await evaluate("window.__toon3dCheck.vignette(" + k + ")", sessionId));
  for (let k = 1; k < count; k++) report.transitions.push(await evaluate("window.__toon3dCheck.transition(" + k + ")", sessionId));

  console.log("vignette     in     start    end   mean   std  calls  triangles   ms/frame");
  for (const v of report.vignettes) {
    const own = [];
    if (v.first !== v.again) own.push("not deterministic: hash " + v.first + " then " + v.again + " at the same time");
    for (const s of v.samples) {
      if (s.std < 4 || s.mean < 3) own.push("blank frame at " + s.time.toFixed(2) + "s (mean " + s.mean.toFixed(1) + ", std " + s.std.toFixed(1) + ")");
    }
    const s = v.samples[1];
    console.log([v.id.padEnd(12), v.kind.padEnd(6), v.t.toFixed(2).padStart(6), v.end.toFixed(2).padStart(6), s.mean.toFixed(1).padStart(6),
      s.std.toFixed(1).padStart(5), String(v.info.calls).padStart(6), String(v.info.triangles).padStart(10), v.ms.toFixed(1).padStart(10)].join(" ")
      + (own.length ? "  FAILED" : ""));
    for (const problem of [...new Set(own)]) failures.push(v.id + ": " + problem);
  }
  for (const t of report.transitions) {
    if (t.a !== t.b) failures.push(t.id + ": " + t.kind + " transition at " + t.time.toFixed(2) + "s is not deterministic");
    if (t.std < 2 && t.mean < 3) failures.push(t.id + ": " + t.kind + " transition at " + t.time.toFixed(2) + "s renders a blank frame");
  }

  // Overlay sweep, every 0.1 s over the whole timeline. The captions are seeked the way the HyperFrames runtime seeks them
  // (window.__timelines.main, with .clip visibility from data-start and data-duration), then the renderer is seeked.
  // Checked at each time: (1) every overlay box, meaning a pill, its dot, a counter number, a badge, or the hero, must keep
  // EDGE px from each frame edge; (2) no caption line box may overlap an overlay box; (3) no overlay box may hit a watermark;
  // (4) no scene line (pole, wire, cable, projected by lineSamples) may fall inside a caption line box.
  const sweep = await evaluate(`(() => {
    const toon = window.__toon3d;
    const tl = window.__timelines && window.__timelines.main;
    if (!tl) return { error: "window.__timelines.main is missing, so the captions cannot be seeked" };
    const EDGE = ${EDGE};
    const seek = T => {
      tl.pause();
      tl.seek(T, false);
      for (const el of document.querySelectorAll(".clip[data-start]")) {
        const s = +el.dataset.start, d = +el.dataset.duration || 0;
        el.style.visibility = (T >= s && T < s + d) ? "visible" : "hidden";
      }
      window.dispatchEvent(new CustomEvent("hf-seek", { detail: { time: T } }));
    };
    const shown = el => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.01) return false;
      }
      return true;
    };
    const rectOf = el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; };
    const union = rs => {
      const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y));
      const x1 = Math.max(...rs.map(r => r.x + r.width)), y1 = Math.max(...rs.map(r => r.y + r.height));
      return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    };
    const captionLines = () => [...document.querySelectorAll("#kara .kc")].map(line => {
      const words = [...line.querySelectorAll(".kb")].filter(shown).map(rectOf).filter(r => r.width > 0 && r.height > 0);
      return words.length ? { id: line.id, text: line.textContent.trim().slice(0, 40), ...union(words) } : null;
    }).filter(Boolean);
    const overlays = time => {
      const out = toon.heroRects(time).map(r => ({ kind: r.kind, x: r.x, y: r.y, width: r.width, height: r.height }));
      for (const el of document.querySelectorAll("#toon3d-overlay .toon-num, #toon3d-overlay .toon-badge, #toon3d-overlay .toon-dot, #toon3d-overlay .toon-leader")) {
        const kind = ["num", "badge", "dot", "leader"].find(k => el.classList.contains("toon-" + k));
        if (!shown(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) out.push({ kind, x: r.left, y: r.top, width: r.width, height: r.height });
      }
      return out;
    };
    const watermarks = ["#watermark-top", "#watermark-bottom"].map(s => document.querySelector(s)).filter(Boolean).map(rectOf);
    const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    const fmt = r => "[" + [r.x, r.y, r.x + r.width, r.y + r.height].map(n => Math.round(n)).join(",") + "]";
    const end = toon.vignettes[toon.vignettes.length - 1].end;
    const kinds = {}, edge = [], caption = [], watermark = [], wire = [], lines = new Set();
    let samples = 0, rects = 0;
    for (let i = 0; i <= Math.round(end * 10); i++) {
      const T = i / 10;
      seek(T);
      samples++;
      const list = overlays(T);
      rects += list.length;
      const captions = captionLines();
      for (const c of captions) lines.add(c.id);
      for (const r of list) {
        kinds[r.kind] = (kinds[r.kind] || 0) + 1;
        if (r.x < EDGE || r.y < EDGE || r.x + r.width > 1080 - EDGE || r.y + r.height > 1920 - EDGE) {
          edge.push(r.kind + " at " + T.toFixed(2) + "s " + fmt(r) + " is within " + EDGE + " px of, or past, a frame edge");
        }
        for (const w of watermarks) if (overlap(r, w)) watermark.push(r.kind + " at " + T.toFixed(2) + "s " + fmt(r) + " intersects a watermark");
      }
      const scene = toon.lineSamples(T);
      for (const c of captions) {
        const hit = scene.find(p => p.x >= c.x && p.x <= c.x + c.width && p.y >= c.y && p.y <= c.y + c.height);
        if (hit) wire.push("caption \\"" + c.text + "\\" at " + T.toFixed(2) + "s " + fmt(c) + " is crossed by a scene line at (" + Math.round(hit.x) + "," + Math.round(hit.y) + ")");
        for (const r of list) {
          if (r.kind !== "leader" && overlap(c, r)) caption.push("caption \\"" + c.text + "\\" at " + T.toFixed(2) + "s " + fmt(c) + " overlaps " + r.kind + " " + fmt(r));
        }
      }
    }
    return { samples, rects, kinds, edge, caption, watermark, wire, lines: lines.size };
  })()`, sessionId);
  if (sweep.error) failures.push(sweep.error);
  else {
    // Grouped by the kind of overlay hit, with the times it occurs, so one kind cannot hide another.
    const group = (label, list, kindOf) => {
      const kinds = new Map();
      for (const message of list) {
        const kind = kindOf(message);
        if (!kinds.has(kind)) kinds.set(kind, []);
        kinds.get(kind).push(message);
      }
      for (const [kind, items] of kinds) {
        const times = [...new Set(items.map(m => m.match(/ at (\d+\.\d+)s/)[1]))];
        failures.push(items.length + " " + label + " with " + kind + " at " + times.length + " times, first at " + times[0]
          + "s to " + times[times.length - 1] + "s: " + items[0]);
      }
    };
    group("frame-edge hits", sweep.edge, m => m.split(" at ")[0]);
    group("caption overlaps", sweep.caption, m => m.match(/ overlaps (\w+) \[/)[1]);
    group("watermark hits", sweep.watermark, m => m.split(" at ")[0]);
    group("scene-line crossings", sweep.wire, () => "caption band");
    if (process.env.TOON3D_CHECK_REPORT) writeFileSync(process.env.TOON3D_CHECK_REPORT, JSON.stringify(sweep, null, 1));
    console.log("overlay sweep: " + sweep.samples + " times every 0.1 s, " + sweep.rects + " rectangles " + JSON.stringify(sweep.kinds)
      + ", " + sweep.edge.length + " within " + EDGE + " px of or past a frame edge, " + sweep.caption.length + " caption overlaps, "
      + sweep.watermark.length + " watermark hits, " + sweep.wire.length + " scene-line crossings of captions");
    console.log("caption lines shown: " + sweep.lines);
  }
  console.log("transitions checked: " + report.transitions.length);
  for (const error of [...new Set(pageErrors)]) failures.push(error);
  if (failures.length) {
    console.log("TOON3D CHECK: FAILED - " + failures.join("; "));
    process.exitCode = 1;
  } else {
    console.log("TOON3D CHECK: PASSED");
  }
}

try {
  await main();
} catch (error) {
  console.log("TOON3D CHECK: FAILED - " + error.message);
  process.exitCode = 1;
} finally {
  socket?.close();
  browser?.kill();
  if (profile) rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  await new Promise(resolveClose => server.close(() => resolveClose()));
}
