# Vice Panels — GTA-style cover art maker

![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/Hagai17/vice-panels/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/Hagai17/vice-panels/reward.svg)

Vice Panels turns a photo and a caption into multi-panel cover art in the
spirit of a big-city crime saga poster: one tall hero panel, a cluster of
smaller scenes around it, a heavy colour grade, halftone print texture and
bold condensed lettering — exported as a PNG you can post anywhere.

This entry was built for the make.fun bounty
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Multi-panel layouts** — five panels per cover, arranged poster-style,
  with a layout tuned for each export size.
- **Your photos, your framing** — load photos from your machine (browse or
  drag-and-drop), fill every panel with one photo or mix several, click a
  panel to select it, drag the photo inside it, and zoom with the slider
  or the mouse wheel.
- **Captions** — an editable headline and sub-line, set in a bold condensed
  face with an outline and a gradient fill that borrows the grade's colours.
- **Three colour grades** — Sunset Vice (warm dusk), Neon Night (teal and
  magenta) and Heat Haze (scorched orange), each with halftone dots and a
  vignette over the collage.
- **Post-ready exports** — one click renders a PNG at 1080×1080,
  1080×1350 or 1920×1080. The exported image is drawn by the same code as
  the on-screen preview, so what you see is what you share.

## Privacy

The app is plain static files and runs entirely in your browser. Photos
are read from your own machine and never uploaded anywhere; there is no
account, no server and no network request.

## Run it

Serve the `app/` folder with any static file server and open it in a
desktop browser, or use the bundled development server:

```sh
node serve.ts
# then open http://localhost:8080
```

Two sample scenes ship under `app/samples/` so the editor opens with a
finished cover; replace them with your own photos whenever you like.

## Handing it in

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Notes on originality

Vice Panels is an original tool: its name, layouts, lettering and artwork
are its own. The headline face is Anton, used under the SIL Open Font
License 1.1. Nothing here reproduces any game studio's logos, artwork or
fonts.
