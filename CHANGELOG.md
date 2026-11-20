# Changelog

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
