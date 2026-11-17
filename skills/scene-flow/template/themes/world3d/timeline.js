      tl.set({}, {}, @@end@@);
      const openaiTag = document.createElement("div");
      openaiTag.id = "world3d-openai-tag";
      openaiTag.className = "openai-flat-tag";
      const openaiLogo = document.createElement("img");
      openaiLogo.src = "assets/logos/openai.svg";
      openaiLogo.alt = "";
      openaiLogo.width = 44;
      openaiLogo.height = 44;
      const productName = document.createElement("span");
      productName.textContent = "ChatGPT";
      openaiTag.append(openaiLogo, productName);
      document.getElementById("world3d-overlay").append(openaiTag);
      tl.fromTo(openaiTag, { autoAlpha: 0, xPercent: -50, y: 14, scale: 0.96 },
        { autoAlpha: 1, xPercent: -50, y: 0, scale: 1, duration: 0.45, ease: "power3.out", immediateRender: false }, 0.25);
