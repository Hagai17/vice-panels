// Deterministic scenes for screenshots: ?shot=cover shows only the finished cover at its export size;
// ?shot=editor shows the full editor with the state applied. Parameters: photo (the sample that fills
// every panel), photos (a comma list of samples to load), assign (panel:photo pairs such as
// "0:pier,1:boulevard"), pan ("panel:panX,panY" entries split by ";", such as "0:0,0.43" — a per-panel
// pan for a panel whose centred crop frames its subject badly), layout, preset, caption, sub, badge,
// size. window.__shotReady is set once the scene has painted and the headline face is in.

export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const listed = (query.get('photos') ?? query.get('photo') ?? 'pier')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  await api.applyShotState({
    sampleNames: listed,
    fillPhoto: query.get('photo') ?? listed[0] ?? 'pier',
    assign: query.get('assign'),
    pan: query.get('pan'),
    layout: query.get('layout') ?? 'classic5',
    preset: query.get('preset') ?? 'sunset',
    caption: query.get('caption') ?? 'SUNSET HEIST',
    subCaption: query.get('sub'),
    badgeText: query.get('badge'),
    size: query.get('size') ?? 'poster',
  });
  try {
    await document.fonts.ready;
  } catch {
    /* the fallback face is already painted */
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
