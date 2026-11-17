      /* Example cues for the sample SCRIPT.md; retime the beats per video's syl-times.json. */

      /* h1 walkthrough camera over the captured page (h1-page.json, inlined by build.py).
         #h1-zoom holds scale about the view center; #h1-pan holds x and y. Every cue is a fromTo from
         the plain CAM state, so frames do not depend on seek order. Rects are page CSS px [x, y, w, h]. */
      var H1_CLICKS = /*sfx:laser*/[3.95];
      function walkthrough(PAGE) {
        var RECTS = PAGE.rects, VW = 1024, VH = 820, K = VW / 1280;          /* view size; frame px per page CSS px */
        var VX = 28, VY = 305;                            /* view top-left inside #w-h1 */
        var TIP = [23, 13];                               /* cursor tip inside the 100 px glyph */
        var CAM = { x: 0, y: 0, s: 1 }, CUR = { x: VX + 860, y: VY + 760, a: 0 };
        var busy = { zoom: [], pan: [], cursor: [] }, used = [];
        var cam = { immediateRender: false, force3D: false };
        function rect(name) {
          if (!RECTS[name]) throw new Error("walkthrough: unknown target " + name);
          return RECTS[name];
        }
        function claim(layer, t, d, against) {
          var list = busy[layer];
          if (list.length && t < list[list.length - 1][1] - 1e-6)
            throw new Error("walkthrough: " + layer + " cue at " + t + " overlaps the cue before it");
          (against || []).forEach(function (other) {
            busy[other].forEach(function (b) {
              if (t < b[1] - 1e-6 && t + d > b[0] + 1e-6)
                throw new Error("walkthrough: " + layer + " cue at " + t + " overlaps a " + other + " tween");
            });
          });
          list.push([t, t + d]);
        }
        function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
        /* pan that centers a target (view center - target center x K), clamped so the page covers the view;
           a target wider than the view aligns its start edge instead */
        function pan(axis, r, s) {
          var size = axis === "x" ? VW : VH, at = axis === "x" ? r[0] : r[1], len = axis === "x" ? r[2] : r[3];
          var half = size / 2 / (K * s), focus = len / 2 > half - 24 ? at - 24 + half : at + len / 2;
          var full = (axis === "x" ? PAGE.w : PAGE.h) * K, c = size / 2;
          return clamp(c - focus * K, c + c / s - full, c - c / s);
        }
        function move(next, t, d, ease) {
          if (K * next.s > 2) throw new Error("walkthrough: effective scale " + (K * next.s).toFixed(2) + " exceeds 2");
          if (next.s !== CAM.s) {
            claim("zoom", t, d, ["cursor"]);
            tl.fromTo("#h1-zoom", { scale: CAM.s }, { scale: next.s, duration: d, ease: ease, immediateRender: false, force3D: false }, t);
          }
          claim("pan", t, d, ["cursor"]);
          tl.fromTo("#h1-pan", { x: CAM.x, y: CAM.y }, { x: next.x, y: next.y, duration: d, ease: ease, immediateRender: false, force3D: false }, t);
          CAM = next;
        }
        /* a page point (CSS px) in #w-h1 frame space under the current camera */
        function frame(px, py) {
          var vx = VW / 2 + CAM.s * (CAM.x + px * K - VW / 2), vy = VH / 2 + CAM.s * (CAM.y + py * K - VH / 2);
          if (vx < 0 || vx > VW || vy < 0 || vy > VH) throw new Error("walkthrough: point off the view at this camera");
          return [VX + vx, VY + vy];
        }
        function stroke(sel, attr, t, d) {
          tl.fromTo(sel, { attr: attr, opacity: 1, strokeDashoffset: 1 },
            { attr: attr, opacity: 1, strokeDashoffset: 0, duration: 0.45, ease: "power2.out", immediateRender: false }, t);
          tl.fromTo(sel, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power1.out", immediateRender: false }, t + d);
        }
        tl.set("#h1-zoom", { scale: 1, transformOrigin: "50% 50%", force3D: false }, 0);
        tl.set("#h1-pan", { x: 0, y: 0, force3D: false }, 0);
        tl.set("#h1-cursor", { x: CUR.x - TIP[0], y: CUR.y - TIP[1], autoAlpha: 0, scale: 1 }, 0);
        return {
          zoomTo: function (name, t, d, zoom) {
            var r = rect(name);
            move({ s: zoom, x: pan("x", r, zoom), y: pan("y", r, zoom) }, t, d, "power3.inOut");
          },
          scrollTo: function (name, t, d) {
            move({ s: CAM.s, x: CAM.x, y: pan("y", rect(name), CAM.s) }, t, d, "power2.inOut");
          },
          reset: function (t, d) { move({ s: 1, x: 0, y: 0 }, t, d, "power3.inOut"); },
          cursorTo: function (name, t, d) {
            var r = rect(name), p = frame(r[0] + r[2] / 2, r[1] + r[3] / 2);
            claim("cursor", t, d, ["zoom", "pan"]);
            tl.fromTo("#h1-cursor", { x: CUR.x - TIP[0], y: CUR.y - TIP[1], autoAlpha: CUR.a },
              { x: p[0] - TIP[0], y: p[1] - TIP[1], autoAlpha: 1, duration: d, ease: "power3.inOut", immediateRender: false }, t);
            CUR = { x: p[0], y: p[1], a: 1 };
          },
          click: function (t) {
            if (H1_CLICKS.indexOf(t) < 0) throw new Error("walkthrough: click at " + t + " is missing from H1_CLICKS");
            claim("cursor", t - 0.04, 0.49, ["zoom", "pan"]);
            used.push(t);
            click("#h1-cursor", "#h1-ripple", t, CUR.x, CUR.y);   /* the shared house click in script.js */
          },
          spotlight: function (name, t, d) {
            var r = rect(name), box = { x: (r[0] - 12) * K, y: (r[1] - 12) * K, width: (r[2] + 24) * K, height: (r[3] + 24) * K };
            tl.fromTo("#h1-spot", Object.assign({ autoAlpha: 0 }, box),
              Object.assign({ autoAlpha: 1, duration: 0.3, ease: "power2.out", immediateRender: false }, box), t);
            tl.fromTo("#h1-spot", { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25, ease: "power1.out", immediateRender: false }, t + d);
          },
          outline: function (name, t, d) {
            var r = rect(name);
            stroke("#h1-outline rect", { x: r[0] - 10, y: r[1] - 8, width: r[2] + 20, height: r[3] + 16 }, t, d);
          },
          underline: function (name, t, d) {
            var r = rect(name), y = r[1] + r[3] + 6;
            stroke("#h1-underline line", { x1: r[0], y1: y, x2: r[0] + r[2], y2: y }, t, d);
          },
          done: function () {
            H1_CLICKS.forEach(function (t) {
              if (used.indexOf(t) < 0) throw new Error("walkthrough: H1_CLICKS has " + t + " but no click() uses it");
            });
          }
        };
      }
      function enter(sel, t, d) {
        tl.fromTo(sel, { autoAlpha: 0, scale: 0.7, transformOrigin: "50% 50%" },
          { autoAlpha: 1, scale: 1, duration: d, ease: "power3.out", transformOrigin: "50% 50%" }, t);
      }

      var particles = document.querySelectorAll("#particle-field .particle");
      for (var p = 0; p < particles.length; p++) {
        var particle = particles[p];
        tl.fromTo(particle, { x: 0, y: 0 },
          { x: Number(particle.getAttribute("data-dx")), y: Number(particle.getAttribute("data-dy")), duration: @@end@@, ease: "none" }, 0);
      }
      tl.fromTo("#progress-fill", { scaleX: 0 }, { scaleX: 1, duration: @@end@@, ease: "none" }, 0);

      /* ── h1 · walk the captured repo page: name, files, then click the README title. ── */
      var PAGE = @@walkthrough@@;
      PAGE.rects.name = [64, 192, 236, 22];   /* the repo name text inside "title", measured on the sample image */
      var W = walkthrough(PAGE);
      W.zoomTo("title", 0.45, 0.7, 2.2);
      W.underline("name", 1.2, 0.7);
      W.zoomTo("files", 1.95, 0.6, 1.1);
      W.spotlight("files", 2.6, 0.7);
      W.scrollTo("readmeTitle", 3.0, 0.45);
      W.cursorTo("readmeTitle", 3.5, 0.4);
      W.click(3.95);
      W.outline("readmeTitle", 3.98, 0.42);
      W.done();

      /* ── s1 · replace the old flow, then reveal its two steps. ── */
      tl.set(ids("tk", GEO.tk.length), { opacity: 0.58 }, 0);
      tl.fromTo("#trk", { autoAlpha: 0, y: -24 }, { autoAlpha: 1, y: 0, duration: 0.32, ease: "power3.out" }, 4.64);
      enter("#s1-heading", 4.66, 0.32);
      enter("#s1-old", 4.72, 0.36);
      enter("#s1-new", 4.82, 0.36);
      enter("#s1-stat-a", 4.80, 0.36);
      enter("#s1-stat-b", 4.90, 0.36);
      tl.fromTo("#s1-strike", { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.out" }, 4.98);
      lit(0, 5.25);

      /* ── p1 · the browser proof, prompt words, then status. ── */
      enter("#p1-heading", 9.94, 0.38);
      enter("#p1-shot", 9.98, 0.46);
      enter("#p1-pc", 10.14, 0.48);
      enter("#p1-status", 10.18, 0.42);

      /* ── cta · type VIDEO on its spoken word and send the comment. ── */
      enter("#cta-heading", 17.56, 0.4);
      enter("#cta-cb", 17.64, 0.46);
      tl.set("#cta-ph", { autoAlpha: 0 }, 18.70);
      for (var c = 0; c < GEO.cta; c++) tl.set("#cta-c" + c, { display: "inline" }, 18.74 + c * 0.075);
      tl.fromTo("#cta-snd", { autoAlpha: 0, scale: 0.7, transformOrigin: "50% 50%" },
        { autoAlpha: 1, scale: 1, duration: 0.38, ease: "power3.out", transformOrigin: "50% 50%" }, 19.48);
      gone("#trk", 24.04, 0.16);

      /* Every prompt word lights on its aligned syllable. */
      /* @pwords */

      /* ── ec · keep the Soi Repo bookend on screen to the project end. ── */
      var EC = @@start:ec@@;
      enter("#ec-logo", EC + 0.06, 0.52);
      show("#ec-brand", EC + 0.34, 0.44, 22);
      show("#ec-slogan", EC + 0.62, 0.48, 20);
      tl.set({}, {}, @@end@@);
