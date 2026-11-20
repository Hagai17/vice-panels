// Scripted screenshots for the Vice Panels entry.
//
// Serves app/ with the repo's own serve.ts, opens it in Chromium, lets
// the app load its sample photos, then:
//   1-cover-wide.jpg     the app's own Wide export, scaled to 1280x720
//   2-editor.jpg         the editor itself, photos loaded, at 1280x800
//   3-cover-square.jpg   the app's own Square export (Neon Night grade)
//   4-cover-portrait.jpg the app's own Portrait export (Heat Haze grade)
// Exports come from window.VicePanels.exportDataURL, which runs the very
// render the Export button writes; they are only scaled down, as the
// bounty allows, never edited or composited.

import { spawn } from 'node:child_process';
import { writeFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../render/package.json', import.meta.url));
const puppeteer = require('puppeteer');

const PORT = 8123;
const BASE = `http://localhost:${PORT}`;
const OUT = new URL('./screenshots/', import.meta.url);

const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
  cwd: new URL('.', import.meta.url).pathname,
  stdio: 'pipe',
});

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE + '/index.html');
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server did not start');
}

// Decode a PNG data URL in a blank page, redraw it at the target size and
// return JPEG bytes at a quality that fits the 256 KiB screenshot cap.
async function downscaleToJpeg(page, dataUrl, w, h) {
  for (const q of [0.88, 0.8, 0.72, 0.64]) {
    const jpeg = await page.evaluate(
      async (src, tw, th, quality) => {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = src;
        });
        const c = document.createElement('canvas');
        c.width = tw;
        c.height = th;
        c.getContext('2d').drawImage(img, 0, 0, tw, th);
        return c.toDataURL('image/jpeg', quality);
      },
      dataUrl,
      w,
      h,
      q,
    );
    const bytes = Buffer.from(jpeg.split(',')[1], 'base64');
    if (bytes.length <= 250 * 1024) return bytes;
  }
  throw new Error(`could not fit ${w}x${h} under the cap`);
}

function save(name, bytes) {
  writeFileSync(new URL(name, OUT), bytes);
  console.log(name, bytes.length, 'bytes');
}

try {
  await waitForServer();
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.VicePanels && window.VicePanels.photoCount() >= 2);
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 600));

  // The cover: Wide size, Sunset Vice grade, exactly as the app exports.
  await page.evaluate(() => {
    window.VicePanels.setSize('wide');
    window.VicePanels.setGrade('sunset');
  });
  await new Promise((r) => setTimeout(r, 300));
  const widePng = await page.evaluate(() => window.VicePanels.exportDataURL('wide'));
  const blank = await browser.newPage();
  save('1-cover-wide.jpg', await downscaleToJpeg(blank, widePng, 1280, 720));

  // The editor, wide cover loaded, controls and panels visible. The page
  // is zoomed out a touch so the whole control column fits the frame.
  await page.evaluate(() => {
    document.body.style.zoom = '0.78';
  });
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: new URL('2-editor.jpg', OUT).pathname, type: 'jpeg', quality: 86 });
  console.log('2-editor.jpg', statSync(new URL('2-editor.jpg', OUT)).size, 'bytes');
  await page.evaluate(() => {
    document.body.style.zoom = '1';
  });

  // Square cover in Neon Night.
  await page.evaluate(() => window.VicePanels.setGrade('neon'));
  const squarePng = await page.evaluate(() => window.VicePanels.exportDataURL('square'));
  save('3-cover-square.jpg', await downscaleToJpeg(blank, squarePng, 960, 960));

  // Portrait cover in Heat Haze.
  await page.evaluate(() => window.VicePanels.setGrade('heat'));
  const portraitPng = await page.evaluate(() => window.VicePanels.exportDataURL('portrait'));
  save('4-cover-portrait.jpg', await downscaleToJpeg(blank, portraitPng, 1024, 1280));

  await browser.close();
  console.log('screenshots done');
} finally {
  server.kill();
}
