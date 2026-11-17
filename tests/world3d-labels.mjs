#!/usr/bin/env node
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { extname, resolve, sep } from "node:path";

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
    }, 30000);
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

async function main() {
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const port = server.address().port;
  profile = mkdtempSync(resolve(tmpdir(), "world3d-labels-"));
  browser = spawn(chromePath, ["--remote-debugging-port=0", "--no-first-run", "--hide-scrollbars", "--mute-audio",
    "--user-data-dir=" + profile, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const endpoint = await waitForDevTools(browser);
  socket = new WebSocket(endpoint);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.onopen = resolveOpen;
    socket.onerror = () => rejectOpen(new Error("could not connect to Chrome DevTools"));
  });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(entry.timeout);
      if (message.error) entry.rejectMessage(new Error(message.error.message));
      else entry.resolveMessage(message.result);
    } else if (message.method) {
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
  const ready = await evaluate(`window.__hf?.buildReady?.world3d
    ? Promise.race([window.__hf.buildReady.world3d.then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 60000))])
    : false`, sessionId, true);
  if (!ready) throw new Error("world3d buildReady did not resolve");

  const stops = await evaluate(`(() => {
    const world = window.__world3d;
    if (!world || !Array.isArray(world.stops)) throw new Error("world3d debug stops are missing");
    const rectFrom = element => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, left: rect.left, top: rect.top,
        right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    return world.stops.filter(stop => stop.label).map(stop => {
      const time = stop.t + 0.6;
      window.dispatchEvent(new CustomEvent("hf-seek", { detail: { time } }));
      const tags = [...document.querySelectorAll(".tag")]
        .filter(tag => Number(getComputedStyle(tag).opacity) > 0.05)
        .map(tag => ({ stopId: tag.parentElement.dataset.stopId, text: tag.textContent, rect: rectFrom(tag) }));
      const captions = [...document.querySelectorAll("#kara .kc")]
        .map(rectFrom).filter(rect => rect && rect.width > 0 && rect.height > 0);
      const watermarks = ["#watermark-top", "#watermark-bottom"]
        .map(selector => ({ selector, rect: rectFrom(document.querySelector(selector)) }));
      return { id: stop.id, text: stop.label.text, time, tags, captions, watermarks,
        frame: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight } };
    });
  })()`, sessionId);

  const ctaOverlay = await evaluate(`(() => {
    const time = Number(document.getElementById("sc-cta").dataset.start);
    window.dispatchEvent(new CustomEvent("hf-seek", { detail: { time } }));
    return {
      parentId: document.getElementById("world3d-overlay").parentElement?.id,
      visibleTags: [...document.querySelectorAll(".tag")]
        .filter(tag => Number(getComputedStyle(tag).opacity) > 0.05)
        .map(tag => tag.parentElement.dataset.stopId),
    };
  })()`, sessionId);

  if (!stops.length) throw new Error("world.json has no labelled stops");
  const failures = [];
  if (ctaOverlay.parentId !== "w-world") failures.push("world3d overlay is outside #w-world");
  if (ctaOverlay.visibleTags.length) failures.push("labels remain visible at CTA start: " + ctaOverlay.visibleTags.join(", "));
  for (const stop of stops) {
    const ownTag = stop.tags.find(tag => tag.stopId === stop.id);
    const stopFailures = [];
    if (!ownTag) stopFailures.push("label not visible at " + stop.time.toFixed(2) + "s");
    for (const tag of stop.tags) {
      const rect = tag.rect;
      if (rect.left < 24 || rect.top < 24 || rect.right > stop.frame.width - 24 || rect.bottom > stop.frame.height - 24) {
        stopFailures.push(tag.stopId + "/" + tag.text + " is within 24px of a frame edge");
      }
      for (const caption of stop.captions) {
        if (intersects(rect, caption)) stopFailures.push(tag.stopId + "/" + tag.text + " intersects #kara caption band");
      }
      for (const watermark of stop.watermarks) {
        if (watermark.rect && intersects(rect, watermark.rect)) {
          stopFailures.push(tag.stopId + "/" + tag.text + " intersects " + watermark.selector);
        }
      }
    }
    const uniqueFailures = [...new Set(stopFailures)];
    if (uniqueFailures.length) {
      const detail = stop.id + "/" + stop.text + ": " + uniqueFailures.join(", ");
      failures.push(detail);
      console.log(stop.id + ": " + stop.text + " FAILED - " + uniqueFailures.join(", "));
    } else {
      console.log(stop.id + ": " + stop.text + " clear at " + stop.time.toFixed(2) + "s");
    }
  }
  if (failures.length) {
    console.log("LABELS: FAILED - " + failures.join("; "));
    process.exitCode = 1;
  } else {
    console.log("CTA OVERLAY: PASSED");
    console.log("LABELS: PASSED");
  }
}

try {
  await main();
} catch (error) {
  console.error("LABELS: FAILED - " + error.message);
  process.exitCode = 1;
} finally {
  socket?.close();
  browser?.kill();
  if (profile) rmSync(profile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(() => resolveClose()));
}
