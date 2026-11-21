      /* cleanui. Every beat time below is a recorded anchor word (cues.json), filled in by build.py.
         Motion is a pure function of the timeline time: no real-time CSS animation, no randomness. */

      /* a normal cut: the card that leaves blurs as it slides out, the card that arrives clears as it slides in.
         seam-stamp moves the cards; this adds only the blur on the filter property. */
      var SLIDES = @@slides@@;
      SLIDES.forEach(function (s) {
        tl.fromTo(s.exit, { filter: "blur(0px)" }, { filter: "blur(" + s.blur + "px)", duration: s.exDur, ease: "power3.in", immediateRender: false }, s.cut - s.exDur);
        tl.fromTo(s.entry, { filter: "blur(" + s.blur + "px)" }, { filter: "blur(0px)", duration: s.enDur, ease: "power4.out", immediateRender: false }, s.cut);
      });

      /* hook: the two product marks pop in on their words */
      pop("#hook-claude", @@t:hook-claude@@, 0.5);
      pop("#hook-gpt", @@t:hook-gpt@@, 0.5);
      show("#hook-claude-name", @@t:hook-claude@@, 0.4, 16);
      show("#hook-gpt-name", @@t:hook-gpt@@, 0.4, 16);

      /* chapter openers: the short title shows on its word, the teal mascot pops on its word */
      show("#ch1-title", @@t:ch1-title@@, 0.4, 24);
      pop("#ch1-mascot", @@t:ch1-mascot@@, 0.5);
      show("#ch2-title", @@t:ch2-title@@, 0.4, 24);
      pop("#ch2-mascot", @@t:ch2-mascot@@, 0.5);

      /* draft: the send button presses on its word */
      bump("#draft-send", @@t:draft-send@@, 0.86);

      /* checklist: the chip for the named check pops in */
      pop("#check-logic", @@t:check-chip@@, 0.45);

      /* pick: the chosen tile grows, the other fades */
      bump("#pick-claude", @@t:pick-pick@@, 1.08);
      tl.to("#pick-gpt", { autoAlpha: 0.35, duration: 0.3, ease: "power1.out" }, @@t:pick-pick@@);

      /* done: the file tile pops on its word */
      pop("#done-file", @@t:done-file@@, 0.5);

      /* ask: the send button presses on its word */
      bump("#ask-send", @@t:ask-send@@, 0.86);

      tl.set({}, {}, @@end@@);
