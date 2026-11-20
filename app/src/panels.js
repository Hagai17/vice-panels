// Panel geometry for Vice Panels.
//
// A cover is a grid of rectangular panels in the spirit of a comic-book
// poster: one tall hero panel and a cluster of smaller scenes around it.
// Coordinates are fractions of the canvas (0..1), so the same layout works
// at preview size and at full export resolution.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square' },
  portrait: { w: 1080, h: 1350, label: 'Portrait' },
  wide: { w: 1920, h: 1080, label: 'Wide' },
};

// Each layout lists its panels in drawing order. The first panel is the
// hero: it gets the first photo by default and the most screen space.
export const LAYOUTS = {
  square: [
    { x: 0.0, y: 0.0, w: 0.58, h: 0.62 },
    { x: 0.58, y: 0.0, w: 0.42, h: 0.31 },
    { x: 0.58, y: 0.31, w: 0.42, h: 0.31 },
    { x: 0.0, y: 0.62, w: 0.5, h: 0.38 },
    { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
  ],
  portrait: [
    { x: 0.0, y: 0.0, w: 1.0, h: 0.44 },
    { x: 0.0, y: 0.44, w: 0.5, h: 0.28 },
    { x: 0.5, y: 0.44, w: 0.5, h: 0.28 },
    { x: 0.0, y: 0.72, w: 0.62, h: 0.28 },
    { x: 0.62, y: 0.72, w: 0.38, h: 0.28 },
  ],
  wide: [
    { x: 0.0, y: 0.0, w: 0.42, h: 1.0 },
    { x: 0.42, y: 0.0, w: 0.33, h: 0.55 },
    { x: 0.75, y: 0.0, w: 0.25, h: 0.55 },
    { x: 0.42, y: 0.55, w: 0.33, h: 0.45 },
    { x: 0.75, y: 0.55, w: 0.25, h: 0.45 },
  ],
};

// Fresh per-panel editing state: which photo fills the panel, how far the
// photo is dragged inside it (ox/oy are fractions of the spare space, so
// 0.5 is centred and 0/1 pin it to either edge), a zoom multiplier on top
// of the plain cover-fit scale, and a mirror flag the renderer honours so
// a repeated photo can face the other way.
export function blankPanelState(photoIndex) {
  return { photo: photoIndex, ox: 0.5, oy: 0.5, zoom: 1, flip: false };
}

export function blankCoverState(sizeKey) {
  const panels = LAYOUTS[sizeKey].map((_, i) => blankPanelState(i % 2));
  // Default framing, tuned per layout: a wide, short panel filled from a
  // portrait photo shows its middle slice, which is a torso — bias those
  // panels toward the top of the photo, where the subject's face is.
  if (sizeKey === 'portrait') {
    panels[0].oy = 0.12;
    panels[3].oy = 0.22;
  }
  // Mirror every third panel so the two sample scenes do not repeat
  // identically across the collage.
  panels.forEach((p, i) => {
    if (i % 3 === 2) p.flip = true;
  });
  return panels;
}

// The rectangle a panel occupies on a W x H canvas, in pixels.
export function panelRect(layoutPanel, W, H) {
  return {
    x: layoutPanel.x * W,
    y: layoutPanel.y * H,
    w: layoutPanel.w * W,
    h: layoutPanel.h * H,
  };
}

// Cover-fit: scale an image so it completely covers a panel, then slide
// it within the overflow according to ox/oy. Returns the draw rectangle.
export function coverDrawRect(img, rect, ox, oy, zoom) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  return {
    x: rect.x - (dw - rect.w) * ox,
    y: rect.y - (dh - rect.h) * oy,
    w: dw,
    h: dh,
  };
}

// Hit-test a point (in canvas pixels) against a layout; returns the index
// of the topmost panel under it, or -1.
export function panelAt(layout, W, H, px, py) {
  for (let i = layout.length - 1; i >= 0; i--) {
    const r = panelRect(layout[i], W, H);
    if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) return i;
  }
  return -1;
}
