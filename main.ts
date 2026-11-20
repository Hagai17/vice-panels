// Vice Panels — the hand-in program for the gta6-cover-art-01 entry (Node 22, standard library only).
//
// The entry itself is the app/ folder beside this file: plain static files (index.html, its ES modules,
// the Anton typeface and two sample photos) that a desktop browser runs fully offline — a person's
// photos are read on their own machine and never uploaded. This program copies app/ and screenshots/
// into the output directory and writes dossier.json there with the vendored make.fun library, byte for
// byte as the scorer rebuilds it. It refuses to hand in fewer than three screenshots, since an entry
// the gate would refuse is worse than a loud failure here.
//
// Try the app locally with `node serve.ts` (it serves app/ on port 8080).
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const ENTRY_NAME = 'Vice Panels';
const MIN_SCREENSHOTS = 3;

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const shotDir = join(here, 'screenshots');
const shotCount = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => /\.(png|jpe?g)$/i.test(name)).length
  : 0;
if (shotCount < MIN_SCREENSHOTS) {
  throw new Error(`${ENTRY_NAME}: screenshots/ holds ${shotCount} image(s); the entry needs at least ${MIN_SCREENSHOTS}`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`${ENTRY_NAME}: wrote app/, ${shotCount} screenshots and dossier.json to ${out}`);
