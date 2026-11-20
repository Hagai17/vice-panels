// Renders a Vice Panels cover onto a 2D context: photo panels split by bold white borders, the neon-sunset
// grade and film grain over each panel, a soft vignette, then the lettering — a heavy condensed headline
// with a gradient fill and dark outline, a letter-spaced sub-caption, and a small rotated badge.
// Pure drawing: renderCover(ctx, width, height, art) paints everything from the `art` state object, whose
// photos are HTMLImageElements keyed by id in art.photos, with art.assignments[panelIndex] naming the
// photo each panel shows and art.transforms[panelIndex] its { zoom, panX, panY } (pan in panel fractions).

import { panelRects } from './panels.js';
import { GRADE_PRESETS, applyGrade, applyGrain, makeGrainPattern } from './grade.js';

const HEADLINE_FONT = (size) => `${size}px Anton, 'Arial Black', Impact, sans-serif`;
let grainPattern = null;

/** Draws the whole cover at the given pixel size. */
export function renderCover(ctx, width, height, art) {
  const preset = GRADE_PRESETS[art.preset] ?? GRADE_PRESETS.sunset;
  const gap = Math.max(10, Math.round(width * 0.016));
  if (!grainPattern) grainPattern = makeGrainPattern(ctx);

  ctx.save();
  ctx.fillStyle = '#fdfdf6';
  ctx.fillRect(0, 0, width, height);

  const rects = panelRects(art.layout, width, height, gap);
  rects.forEach((rect, index) => drawPanel(ctx, rect, index, art, preset));
  drawVignette(ctx, width, height, art.gradeStrength);
  drawLettering(ctx, width, height, art);
  if (art.badgeOn && art.badgeText.trim()) drawBadge(ctx, width, height, art.badgeText.trim());
  ctx.restore();
}

/** One panel: its photo cover-fitted and panned, graded, grained. An empty panel gets a sunset wash. */
function drawPanel(ctx, rect, index, art, preset) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  const photoId = art.assignments[index];
  const photo = photoId ? art.photos.get(photoId) : null;
  if (photo) {
    const view = art.transforms[index] ?? { zoom: 1, panX: 0, panY: 0 };
    const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * view.zoom;
    const drawnW = photo.naturalWidth * scale;
    const drawnH = photo.naturalHeight * scale;
    let dx = rect.x + (rect.w - drawnW) / 2 + view.panX * rect.w;
    let dy = rect.y + (rect.h - drawnH) / 2 + view.panY * rect.h;
    dx = Math.min(rect.x, Math.max(rect.x + rect.w - drawnW, dx));
    dy = Math.min(rect.y, Math.max(rect.y + rect.h - drawnH, dy));
    ctx.filter = 'saturate(1.28) contrast(1.06) brightness(1.02)';
    ctx.drawImage(photo, dx, dy, drawnW, drawnH);
    ctx.filter = 'none';
  } else {
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    wash.addColorStop(0, '#3b1154');
    wash.addColorStop(0.55, '#a01c68');
    wash.addColorStop(1, '#ff7a1a');
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  applyGrade(ctx, rect, preset, art.gradeStrength);
  if (art.grain) applyGrain(ctx, rect, grainPattern);
  ctx.restore();
}

/** A soft dark edge all round the cover, plus a shade pooled at the foot so the lettering sits on it. */
function drawVignette(ctx, width, height, strength) {
  const radius = Math.max(width, height) * 0.78;
  const shade = ctx.createRadialGradient(width / 2, height * 0.44, radius * 0.35, width / 2, height * 0.44, radius);
  shade.addColorStop(0, 'rgba(10, 0, 22, 0)');
  shade.addColorStop(1, `rgba(10, 0, 22, ${0.16 + 0.26 * strength})`);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  const foot = ctx.createLinearGradient(0, height * 0.68, 0, height);
  foot.addColorStop(0, 'rgba(12, 0, 24, 0)');
  foot.addColorStop(1, `rgba(12, 0, 24, ${0.34 * strength})`);
  ctx.fillStyle = foot;
  ctx.fillRect(0, height * 0.68, width, height * 0.32);
}

/** The headline and sub-caption along the foot of the cover. */
function drawLettering(ctx, width, height, art) {
  const headline = art.caption.trim().toUpperCase();
  const sub = art.subCaption.trim().toUpperCase();
  if (!headline && !sub) return;

  let size = height * 0.118;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (headline) {
    ctx.font = HEADLINE_FONT(size);
    while (ctx.measureText(headline).width > width * 0.92 && size > 14) {
      size -= 2;
      ctx.font = HEADLINE_FONT(size);
    }
  } else {
    size = height * 0.06;
  }

  const headlineBase = height - size * 0.58;
  if (sub) {
    const subSize = Math.max(13, size * 0.27);
    ctx.save();
    ctx.font = HEADLINE_FONT(subSize);
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.42)}px`;
    } catch {
      /* older engines draw it unspaced */
    }
    ctx.lineJoin = 'round';
    ctx.lineWidth = subSize * 0.18;
    ctx.strokeStyle = '#16031f';
    const subY = headline ? headlineBase - size * 1.24 : height - subSize * 1.2;
    ctx.strokeText(sub, width / 2, subY);
    ctx.fillStyle = '#ffeef9';
    ctx.fillText(sub, width / 2, subY);
    ctx.restore();
  }

  if (!headline) return;
  ctx.save();
  ctx.translate(width / 2, headlineBase);
  ctx.transform(1, 0, -0.07, 1, 0, 0);
  ctx.font = HEADLINE_FONT(size);
  const fill = ctx.createLinearGradient(0, -size, 0, size * 0.22);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.55, '#ffd7ef');
  fill.addColorStop(1, '#ff5da2');
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.17;
  ctx.strokeStyle = '#16031f';
  ctx.shadowColor = 'rgba(10, 0, 25, 0.6)';
  ctx.shadowBlur = size * 0.13;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(headline, 0, 0);
  ctx.shadowColor = 'rgba(255, 46, 136, 0.45)';
  ctx.shadowBlur = size * 0.34;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = fill;
  ctx.fillText(headline, 0, 0);
  ctx.restore();
}

/** A small rotated sticker near the top-right corner, with its own short text. */
function drawBadge(ctx, width, height, text) {
  const label = text.toUpperCase();
  const size = Math.max(15, height * 0.027);
  ctx.save();
  ctx.font = HEADLINE_FONT(size);
  const textW = ctx.measureText(label).width;
  const badgeW = textW + size * 1.9;
  const badgeH = size + size * 1.15;
  ctx.translate(width - badgeW * 0.58, badgeH * 0.95);
  ctx.rotate(-0.2);
  const fill = ctx.createLinearGradient(-badgeW / 2, -badgeH / 2, badgeW / 2, badgeH / 2);
  fill.addColorStop(0, '#ff2e88');
  fill.addColorStop(1, '#ff8a3c');
  roundedRect(ctx, -badgeW / 2, -badgeH / 2, badgeW, badgeH, badgeH * 0.34);
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.15;
  ctx.strokeStyle = '#16031f';
  ctx.shadowColor = 'rgba(10, 0, 25, 0.5)';
  ctx.shadowBlur = size * 0.5;
  ctx.shadowOffsetY = size * 0.18;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, size * 0.05);
  ctx.restore();
}

/** Traces a rounded rectangle path (the badge outline). */
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
