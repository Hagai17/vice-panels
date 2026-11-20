// Panel layouts for the collage: each layout is a list of rectangles in fractions of the cover (x, y, width,
// height). panelRects turns them into pixels, leaving a bold white gap between panels and a white frame
// around the whole cover.

export const LAYOUTS = {
  classic5: {
    label: 'Classic 5',
    rects: [
      [0, 0, 1, 0.42],
      [0, 0.42, 0.58, 0.58],
      [0.58, 0.42, 0.42, 0.29],
      [0.58, 0.71, 0.42, 0.29],
    ],
  },
  strips3: {
    label: 'Strips 3',
    rects: [
      [0, 0, 1 / 3, 1],
      [1 / 3, 0, 1 / 3, 1],
      [2 / 3, 0, 1 / 3, 1],
    ],
  },
  grid4: {
    label: 'Grid 4',
    rects: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
  hero1: {
    label: 'Hero 1',
    rects: [[0, 0, 1, 1]],
  },
};

/** Pixel rectangles for `layoutKey` on a width x height cover with `gap` pixels of white between panels. */
export function panelRects(layoutKey, width, height, gap) {
  const def = LAYOUTS[layoutKey] ?? LAYOUTS.classic5;
  const areaX = gap / 2;
  const areaY = gap / 2;
  const areaW = width - gap;
  const areaH = height - gap;
  return def.rects.map(([fx, fy, fw, fh]) => ({
    x: areaX + fx * areaW + gap / 2,
    y: areaY + fy * areaH + gap / 2,
    w: fw * areaW - gap,
    h: fh * areaH - gap,
  }));
}

/** How many panels a layout has. */
export function panelCount(layoutKey) {
  return (LAYOUTS[layoutKey] ?? LAYOUTS.classic5).rects.length;
}
