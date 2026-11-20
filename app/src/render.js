// Canvas rendering for Vice Panels: photos into panels, a colour grade,
// halftone and vignette polish, panel borders and the caption. One draw
// function serves both the on-screen preview and the exported PNG, so
// what you see is exactly what you share.

import { LAYOUTS, panelRect, coverDrawRect } from './panels.js';

export const HEADLINE_FONT = '"Anton", Impact, "Arial Black", sans-serif';

// Each grade: a ctx.filter applied while the photos are drawn, two tint
// passes over the finished collage, and the colours the caption borrows.
export const GRADES = {
  sunset: {
    filter: 'saturate(1.32) contrast(1.06) brightness(1.03)',
    wash: ['rgba(46, 8, 92, 0.34)', 'rgba(0, 0, 0, 0)', 'rgba(255, 94, 58, 0.30)'],
    glow: 'rgba(255, 140, 66, 0.20)',
    headlineStops: ['#ffffff', '#ffd9a0', '#ff9d5c'],
    accent: '#ffb347',
  },
  neon: {
    filter: 'saturate(1.22) contrast(1.14) brightness(0.94)',
    wash: ['rgba(3, 24, 48, 0.42)', 'rgba(0, 0, 0, 0)', 'rgba(255, 46, 136, 0.32)'],
    glow: 'rgba(31, 214, 255, 0.16)',
    headlineStops: ['#ffffff', '#b8f4ff', '#1fd6ff'],
    accent: '#1fd6ff',
  },
  heat: {
    filter: 'saturate(1.5) contrast(1.05) sepia(0.28) brightness(1.02)',
    wash: ['rgba(64, 10, 4, 0.30)', 'rgba(0, 0, 0, 0)', 'rgba(255, 64, 20, 0.34)'],
    glow: 'rgba(255, 84, 30, 0.22)',
    headlineStops: ['#fff6e8', '#ffc46b', '#ff7847'],
    accent: '#ffcf5c',
  },
};

function drawPanelPhoto(ctx, img, rect, panel) {
  const d = coverDrawRect(img, rect, panel.ox, panel.oy, panel.zoom);
  if (panel.flip) {
    // Mirror the photo inside its panel: same framing, facing the other
    // way, so a scene used twice does not repeat identically.
    ctx.save();
    ctx.translate(d.x + d.w, d.y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, d.w, d.h);
    ctx.restore();
    return;
  }
  ctx.drawImage(img, d.x, d.y, d.w, d.h);
}

function drawPanelPlaceholder(ctx, rect, W) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#2a1850');
  g.addColorStop(1, '#170b2e');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(246, 236, 255, 0.5)';
  ctx.font = `${Math.max(13, W * 0.016)}px ${HEADLINE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
}

// A regular grid of soft dots, the cheap print-shop halftone that makes a
// digital collage feel like a poster. Built once per draw at canvas scale.
function halftonePattern(ctx, W) {
  const step = Math.max(7, Math.round(W / 150));
  const tile = document.createElement('canvas');
  tile.width = step;
  tile.height = step;
  const t = tile.getContext('2d');
  t.fillStyle = 'rgba(255, 255, 255, 0.55)';
  t.beginPath();
  t.arc(step / 2, step / 2, step * 0.16, 0, Math.PI * 2);
  t.fill();
  return ctx.createPattern(tile, 'repeat');
}

function drawCaption(ctx, W, H, grade, headline, subline) {
  const cx = W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (!headline && !subline) return;

  // Measure the headline first: the sub-line is stacked above it, so its
  // position depends on the headline's final size.
  let size = Math.round(H * 0.118);
  if (headline) {
    ctx.font = `${size}px ${HEADLINE_FONT}`;
    const maxW = W * 0.92;
    while (ctx.measureText(headline).width > maxW && size > 18) {
      size -= 4;
      ctx.font = `${size}px ${HEADLINE_FONT}`;
    }
  }
  const headlineBase = H * 0.972;
  const headlineTop = headlineBase - size;

  // A soft scrim behind the caption block keeps the lettering legible
  // over bright parts of a photo.
  const scrimTop = subline ? headlineTop - H * 0.075 : headlineTop - H * 0.03;
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, H);
  scrim.addColorStop(0, 'rgba(10, 3, 24, 0)');
  scrim.addColorStop(1, 'rgba(10, 3, 24, 0.42)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, W, H - scrimTop);

  // Sub-line above the headline, letterspaced, in the grade accent.
  if (subline) {
    const subSize = Math.round(H * 0.031);
    ctx.font = `${subSize}px ${HEADLINE_FONT}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = Math.round(H * 0.006);
    ctx.shadowOffsetY = Math.round(H * 0.003);
    ctx.fillStyle = grade.accent;
    ctx.fillText(subline.toUpperCase(), cx, headlineTop - H * 0.018);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  if (!headline) return;
  // The sub-line block changed the context font; restore the headline's.
  ctx.font = `${size}px ${HEADLINE_FONT}`;
  const fill = ctx.createLinearGradient(0, headlineTop, 0, headlineBase);
  grade.headlineStops.forEach((stop, i) => {
    fill.addColorStop(i / (grade.headlineStops.length - 1), stop);
  });
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.strokeStyle = '#160a2a';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = Math.round(H * 0.01);
  ctx.shadowOffsetY = Math.round(H * 0.006);
  ctx.strokeText(headline, cx, headlineBase);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = fill;
  ctx.fillText(headline, cx, headlineBase);
}

// view: { sizeKey, panels, photos, grade, headline, subline, selected,
//         forExport } — photos are HTMLImageElements (or null per slot).
export function drawCover(ctx, W, H, view) {
  const grade = GRADES[view.grade] ?? GRADES.sunset;
  const layout = LAYOUTS[view.sizeKey];

  ctx.fillStyle = '#0d0518';
  ctx.fillRect(0, 0, W, H);

  // Photos, clipped to their panels, with the grade's filter on.
  layout.forEach((lp, i) => {
    const rect = panelRect(lp, W, H);
    const panel = view.panels[i];
    const img = panel ? view.photos[panel.photo] : null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.filter = grade.filter;
      drawPanelPhoto(ctx, img, rect, panel);
      ctx.filter = 'none';
    } else {
      drawPanelPlaceholder(ctx, rect, W);
    }
    ctx.restore();
  });

  // Grade wash: a three-stop vertical tint, then a soft colour glow.
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(0.48, grade.wash[1]);
  wash.addColorStop(1, grade.wash[2]);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = grade.glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // Halftone dots, then a vignette to seat the edges.
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = halftonePattern(ctx, W);
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(8, 2, 18, 0)');
  vig.addColorStop(1, 'rgba(8, 2, 18, 0.44)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Panel borders: a heavy dark seam and a whisper of inner light.
  const seam = Math.max(3, W * 0.0058);
  layout.forEach((lp) => {
    const r = panelRect(lp, W, H);
    ctx.lineWidth = seam;
    ctx.strokeStyle = '#0d0518';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.strokeRect(r.x + seam / 2, r.y + seam / 2, r.w - seam, r.h - seam);
  });

  drawCaption(ctx, W, H, grade, view.headline.trim().toUpperCase(), view.subline.trim());

  // Selection outline belongs to the editor only, never to the export.
  if (!view.forExport && view.selected != null && layout[view.selected]) {
    const r = panelRect(layout[view.selected], W, H);
    ctx.save();
    ctx.lineWidth = Math.max(2.5, W * 0.0035);
    ctx.strokeStyle = '#1fd6ff';
    ctx.shadowColor = 'rgba(31, 214, 255, 0.8)';
    ctx.shadowBlur = 12;
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }
}
