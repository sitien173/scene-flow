# Changelog

## [0.4.5](https://github.com/sitien173/scene-flow/compare/v0.4.4...v0.4.5) (2026-11-21)


### Features

* **agents:** add scene-composer sub-agent for 3D vignettes ([#21](https://github.com/sitien173/scene-flow/issues/21)) ([58de2bf](https://github.com/sitien173/scene-flow/commit/58de2bf80458a237f5019a15154283528f106ebc))

## [0.4.4](https://github.com/sitien173/scene-flow/compare/v0.4.3...v0.4.4) (2026-11-21)


### Features

* **themes:** add toon3d theme ([#19](https://github.com/sitien173/scene-flow/issues/19)) ([84d65af](https://github.com/sitien173/scene-flow/commit/84d65af33408f1ed6631a961f08635b587ee83d3))

## [0.4.3](https://github.com/sitien173/scene-flow/compare/v0.4.2...v0.4.3) (2026-11-21)


### Features

* **themes:** agent-built 3D models with a per-channel library ([#17](https://github.com/sitien173/scene-flow/issues/17)) ([32709bf](https://github.com/sitien173/scene-flow/commit/32709bf60b6b7e402ee7eea6293c52d2a5f0ff2b))

## [0.4.2](https://github.com/sitien173/scene-flow/compare/v0.4.1...v0.4.2) (2026-11-21)


### Features

* add update scripts for installed plugins ([#15](https://github.com/sitien173/scene-flow/issues/15)) ([aa5a9f5](https://github.com/sitien173/scene-flow/commit/aa5a9f56ebe18dd63c334425f2d5d6d8963df296))

## [0.4.1](https://github.com/sitien173/scene-flow/compare/v0.4.0...v0.4.1) (2026-11-21)


### Features

* **scene-flow:** add character-builder sub-agent and optional Blender install ([#12](https://github.com/sitien173/scene-flow/issues/12)) ([702cafe](https://github.com/sitien173/scene-flow/commit/702cafe7c2a56c652843188a6451348a1ac27637))
* **scene-flow:** add cleanui theme ([#11](https://github.com/sitien173/scene-flow/issues/11)) ([ed72c98](https://github.com/sitien173/scene-flow/commit/ed72c98631150fa501e1b7b3184737d77560207c))
* **scene-flow:** poll Vibi TTS without a deadline and show live progress ([#10](https://github.com/sitien173/scene-flow/issues/10)) ([17ab61d](https://github.com/sitien173/scene-flow/commit/17ab61d6b727661d1abae0fe9992e6d90791c90e))

## [0.4.0](https://github.com/sitien173/scene-flow/compare/v0.3.1...v0.4.0) (2026-11-20)


### ⚠ BREAKING CHANGES

* **scene-flow:** environment variables such as VIBI_API_KEY, COLAB_URL, POSTIZ_API_KEY, CHROME_PATH, and SCENE_FLOW_SKILL are no longer read; put them in ~/.config/scene-flow/.env. XDG_CONFIG_HOME is no longer honored.

### Features

* **scene-flow:** add ElevenLabs TTS provider and read config only from ~/.config/scene-flow/.env ([d130a07](https://github.com/sitien173/scene-flow/commit/d130a07d1448ae894e79c10e9bf4fd03bf172415))
* **scene-flow:** five-beat script writer with tone, pause, and fallback-spelling marks ([0466ac3](https://github.com/sitien173/scene-flow/commit/0466ac3a18d97956590d2e0bb44c78ac5907039c))
* **scene-flow:** normalize scripts written elsewhere into SCRIPT.md ([12b3fc1](https://github.com/sitien173/scene-flow/commit/12b3fc115d530b51d140a41f85f317d3506ebd43))
* **scene-flow:** run the chosen voice and speech provider without asking again ([1439808](https://github.com/sitien173/scene-flow/commit/14398086bb9c4ea1e7ad4cad1edbfbaa512b7fe8))
* **scene-flow:** suggest local whisper.cpp and VieNeu-TTS when a GPU is present ([dd3b080](https://github.com/sitien173/scene-flow/commit/dd3b0806260e26944e9fbd54351c48ca68c9d3a7))


### Bug Fixes

* **scene-flow-channel:** fall back to the setup path when no plugin cache exists ([4c990c3](https://github.com/sitien173/scene-flow/commit/4c990c3f7a9c400f0cda58dfec493925f976161e))

## [0.3.1](https://github.com/sitien173/scene-flow/compare/v0.3.0...v0.3.1) (2026-11-20)


### Features

* **install:** require any one supported coding agent instead of Claude Code ([6ba4bdd](https://github.com/sitien173/scene-flow/commit/6ba4bddfdaf729c0ced6d25d4eb8c5277965da20))

## [0.3.0](https://github.com/sitien173/scene-flow/compare/v0.2.0...v0.3.0) (2026-11-20)


### ⚠ BREAKING CHANGES

* **scene-flow:** projects whose meta.json names dark, paper, or world3d no longer build; the scripts stop with "theme <name> was removed; only neon3d is supported".

### Features

* **channel:** add scene-flow-channel skill and /scene-flow:channel command ([9cbeece](https://github.com/sitien173/scene-flow/commit/9cbeece037378bd1ab5d4433af3bf1c3b48fd570))
* initial commit of scene-flow ([0ae2dec](https://github.com/sitien173/scene-flow/commit/0ae2dec6665f5f9c0e62f3be26bc39a749efa322))
* **media-use:** add vibi TTS provider ([fd426f7](https://github.com/sitien173/scene-flow/commit/fd426f760c6f53b1dcacff2feed50b8687e66325))
* **plugin:** add an Antigravity IDE installer ([406b942](https://github.com/sitien173/scene-flow/commit/406b94246da499972f4451110d968800405b6159))
* **plugin:** package scene-flow for Claude Code, Codex, Pi, and agy ([af394ee](https://github.com/sitien173/scene-flow/commit/af394ee4e1972165ca3abf9baecce68110832033))
* **scene-flow:** add neon3d theme with per-sentence 3D vignettes ([9ff88d3](https://github.com/sitien173/scene-flow/commit/9ff88d3965ec609ccddbd6633e0de47ad92d1d86))
* **scene-flow:** add optional Postiz publishing for TikTok, Instagram, and YouTube Shorts ([61bc5eb](https://github.com/sitien173/scene-flow/commit/61bc5eb71332157175dfb1245ec56fd53103896c))
* **scene-flow:** add sub-agents, commands and three-tier style rules ([03690cc](https://github.com/sitien173/scene-flow/commit/03690ccae292264d96d1f34b492cb08a9517dcac))
* **scene-flow:** add terra3d daylight 3D explainer theme ([679d09f](https://github.com/sitien173/scene-flow/commit/679d09f8101484daa948c3c78d441c1abe7175c1))
* **scene-flow:** add Vibi as a tts.py provider ([268b30d](https://github.com/sitien173/scene-flow/commit/268b30d9251f3ba16face57a37e15c08df63bb0a))
* **scene-flow:** bundle the freesound skill for extra sound effects ([8ceec7a](https://github.com/sitien173/scene-flow/commit/8ceec7a8256c32f2dee079ae59200d9e022b10db))
* **scene-flow:** default Vibi voice to Quang Toan ([14d3101](https://github.com/sitien173/scene-flow/commit/14d3101e9eef44cef1806d11eb352dfcda6f37a4))
* **scene-flow:** read Postiz credentials from the shared config file ([5766b82](https://github.com/sitien173/scene-flow/commit/5766b82e49294476f5cde37328a0eba0f49e5849))
* **scene-flow:** remove dark, paper, and world3d themes ([c0a5e00](https://github.com/sitien173/scene-flow/commit/c0a5e000380be6684e52c6330434384227f6d233))
* **scene-flow:** start and stop the Colab server with colab-session.py ([80eeeea](https://github.com/sitien173/scene-flow/commit/80eeeea16b816ad71a6754ef14ea020e37805872))
* **theme:** add the atlas3d map and character theme ([ab65d7e](https://github.com/sitien173/scene-flow/commit/ab65d7e2e958e78e6ec4fdb31c37b944af8d713e))


### Bug Fixes

* **ci:** make theme fixture hash independent of ffmpeg version ([d53acb2](https://github.com/sitien173/scene-flow/commit/d53acb2f761edd64e8abee499b184ae5b1998407))
* **scene-flow:** add the neon3d theme reference missing from 9ff88d3 ([2847aa6](https://github.com/sitien173/scene-flow/commit/2847aa66110bce6e5e6331963fa973d1408a4818))


### Performance

* **scene-flow:** queue all Vibi sentences before polling ([661be89](https://github.com/sitien173/scene-flow/commit/661be892d52a9ca573e5ed865e965b6bec522bcc))


### Documentation

* document Colab automation, Freesound, shared credentials and GPU render ([f206b60](https://github.com/sitien173/scene-flow/commit/f206b607047742393695c0e99bc988dbeb7af07e))
* **readme:** add a prompt guide and a theme and channel personalization guide ([694de91](https://github.com/sitien173/scene-flow/commit/694de912165d83c99330f3b621d092cefda68f3b))
* **readme:** move the channel section before the prompt guide ([77cd4ee](https://github.com/sitien173/scene-flow/commit/77cd4ee348de43cd673a8cadd58e30eaee2d14fd))
* **readme:** replace the overview with a channel preparation guide ([a150742](https://github.com/sitien173/scene-flow/commit/a150742abe09e4bc6468438468e7b2f6f0bb6c36))
* rewrite README in Vietnamese, add English README, AGENTS.md and installers ([d52c670](https://github.com/sitien173/scene-flow/commit/d52c670bc4a22ef3debe16c436489a3428eda3e9))
* **scene-flow:** drop world3d render measurements from traps ([e7d4487](https://github.com/sitien173/scene-flow/commit/e7d4487b5d5363dbfca668374d4a6d6d8a16785b))
* **scene-flow:** render 3D themes with --browser-gpu ([1cc8e33](https://github.com/sitien173/scene-flow/commit/1cc8e33fbd93b8f0c8792638413c69bf6b1a7aa2))
