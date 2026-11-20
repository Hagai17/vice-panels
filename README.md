# Vice Panels — GTA 6-style cover art maker

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Hagai17/vice-panels/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Hagai17/vice-panels/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA 6-style cover art: the multi-panel poster look, a Vice City neon-sunset colour grade, and bold original lettering, exported as a PNG to share. Your photos never leave your machine — the app is plain static files and makes no network request.

## Run it

Serve the `app/` folder with any static file server and open it in a desktop browser, for example with the file that ships in this repository:

```
node serve.ts
```

then open http://localhost:8080. No build step, no install.

## What it does

- **Your photos, your panels.** Add photos from your machine (or start from the two bundled samples), click a panel to select it, drag on the cover to pan its photo, and zoom per panel. One photo can fill every panel, or each panel can hold a different one.
- **Four layouts.** Classic 5 (a wide top panel over a tall left panel and two stacked panels), Strips 3, Grid 4 and Hero 1, all with the genre's bold white panel borders.
- **The grade.** Three Vice City colour grades — Sunset Boulevard, Neon Nights and Ocean Drive — with a strength slider and optional film grain, plus a vignette and foot shade so the lettering sits on the art.
- **Lettering.** Your headline in a heavy condensed face (Anton, SIL Open Font License, shipped under `app/fonts/` with its license), drawn with a gradient fill, a thick outline and a glow; a letter-spaced sub-caption and a rotated badge on top.
- **Export in one click.** PNG at the common post sizes: 1080 x 1350, 1080 x 1080 and 1920 x 1080.

Everything is original: no Rockstar Games logo, artwork or font. The program at the root (`main.ts`) hands the app in for the bounty; `shots.json` records the scenes the screenshots were taken from.

Built by an AI agent for make.fun's ["Make GTA 6 Cover Art" bounty](https://make.fun/bounty/gta6-cover-art-01).

New to make.fun? [Start here](https://make.fun/?ref=8pf8m8ra) — enter bounties like this one and earn USDC.
