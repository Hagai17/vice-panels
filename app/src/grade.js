// The Vice City colour grade: three presets, each a set of shadow, mid-tone and glow colours that
// applyGrade washes over one panel, plus a pre-generated film-grain pattern.

export const GRADE_PRESETS = {
  sunset: {
    label: 'Sunset Boulevard',
    top: [43, 10, 74],
    mid: [214, 51, 132],
    bottom: [122, 20, 82],
    glow: [255, 122, 26],
    shadow: [26, 4, 46],
  },
  neon: {
    label: 'Neon Nights',
    top: [3, 6, 20],
    mid: [0, 178, 198],
    bottom: [255, 45, 149],
    glow: [255, 45, 149],
    shadow: [2, 2, 12],
  },
  ocean: {
    label: 'Ocean Drive',
    top: [8, 52, 84],
    mid: [64, 200, 235],
    bottom: [255, 160, 110],
    glow: [255, 183, 140],
    shadow: [6, 30, 52],
  },
};

function rgba(colour, alpha) {
  return `rgba(${colour[0]}, ${colour[1]}, ${colour[2]}, ${alpha})`;
}

function rgb(colour) {
  return `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`;
}

/**
 * Washes the grade over the panel rectangle: an overlay sunset gradient (purple shadows, coloured
 * mid-tones), multiplied purple shade from the top, and a warm screened glow rising from the bottom.
 * `strength` runs 0 (no grade) to 1 (full grade).
 */
export function applyGrade(ctx, rect, preset, strength) {
  if (strength <= 0) return;
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  let wash = ctx.createLinearGradient(0, y, 0, y + h);
  wash.addColorStop(0, rgba(preset.top, 0.6));
  wash.addColorStop(0.55, rgba(preset.mid, 0.38));
  wash.addColorStop(1, rgba(preset.bottom, 0.6));
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = strength;
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);

  let shade = ctx.createLinearGradient(0, y, 0, y + h);
  shade.addColorStop(0, rgb(preset.shadow));
  shade.addColorStop(0.5, 'rgb(255, 255, 255)');
  shade.addColorStop(1, 'rgb(255, 255, 255)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.72 * strength;
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);

  let glow = ctx.createLinearGradient(0, y, 0, y + h);
  glow.addColorStop(0.42, 'rgb(0, 0, 0)');
  glow.addColorStop(1, rgb(preset.glow));
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.62 * strength;
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/** A 256 x 256 tile of grey noise, generated once and reused as a repeating film-grain pattern. */
export function makeGrainPattern(ctx) {
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const tileCtx = tile.getContext('2d');
  const pixels = tileCtx.createImageData(256, 256);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const value = 96 + Math.floor(Math.random() * 64);
    pixels.data[i] = value;
    pixels.data[i + 1] = value;
    pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  tileCtx.putImageData(pixels, 0, 0);
  return ctx.createPattern(tile, 'repeat');
}

/** Lays the grain pattern over one panel at a whisper of opacity. */
export function applyGrain(ctx, rect, pattern) {
  if (!pattern) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = pattern;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
