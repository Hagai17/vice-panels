// Vice Panels editor: wires the page — photos into the tray, panels on the cover, the grade, the
// lettering, and the PNG export. Everything is local: photos are read from the person's own files and
// never leave the machine. A ?shot= query sets up a fixed scene for screenshots instead (./shots.js).

import { renderCover } from './cover.js';
import { panelRects, panelCount, LAYOUTS } from './panels.js';
import { GRADE_PRESETS } from './grade.js';
import { runShot } from './shots.js';

const EXPORT_SIZES = {
  poster: { label: 'Poster 1080 × 1350', w: 1080, h: 1350 },
  square: { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  wide: { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
};

const coverCanvas = document.getElementById('coverCanvas');
const photoTray = document.getElementById('photoTray');
const photoInput = document.getElementById('photoInput');
const stageWrap = document.getElementById('stageWrap');
const statusLine = document.getElementById('statusLine');
const selectedPanelLabel = document.getElementById('selectedPanelLabel');
const panelZoom = document.getElementById('panelZoom');
const gradeStrength = document.getElementById('gradeStrength');
const grainToggle = document.getElementById('grainToggle');
const captionInput = document.getElementById('captionInput');
const subCaptionInput = document.getElementById('subCaptionInput');
const badgeInput = document.getElementById('badgeInput');
const badgeToggle = document.getElementById('badgeToggle');

const state = {
  sizeKey: 'poster',
  layout: 'classic5',
  preset: 'sunset',
  gradeStrength: 0.85,
  grain: true,
  caption: 'SUNSET HEIST',
  subCaption: 'VICE CITY AWAITS',
  badgeText: 'LAUNCH WEEK',
  badgeOn: true,
  photos: [], // { id, name, img }
  assignments: {}, // panelIndex -> photo id
  transforms: {}, // panelIndex -> { zoom, panX, panY }
  selectedPanel: 0,
  activePhotoId: null,
};

let photoSerial = 0;

/** The renderCover state: photos keyed by id, plus everything the drawing needs. */
function artState() {
  return {
    layout: state.layout,
    preset: state.preset,
    gradeStrength: state.gradeStrength,
    grain: state.grain,
    caption: state.caption,
    subCaption: state.subCaption,
    badgeText: state.badgeText,
    badgeOn: state.badgeOn,
    photos: new Map(state.photos.map((photo) => [photo.id, photo.img])),
    assignments: state.assignments,
    transforms: state.transforms,
  };
}

function exportSize() {
  return EXPORT_SIZES[state.sizeKey];
}

/** Paints the cover on the editor canvas, then outlines the selected panel (editor only). */
function render() {
  const { w, h } = exportSize();
  if (coverCanvas.width !== w) coverCanvas.width = w;
  if (coverCanvas.height !== h) coverCanvas.height = h;
  const ctx = coverCanvas.getContext('2d');
  renderCover(ctx, w, h, artState());
  if (!document.body.classList.contains('shot-cover')) drawSelection(ctx, w, h);
  selectedPanelLabel.textContent = `Panel ${state.selectedPanel + 1} of ${panelCount(state.layout)}`;
  panelZoom.value = String(transformOf(state.selectedPanel).zoom);
}

/** A neon outline and number chip on the selected panel, so it is clear which panel edits apply to. */
function drawSelection(ctx, w, h) {
  const gap = Math.max(10, Math.round(w * 0.016));
  const rect = panelRects(state.layout, w, h, gap)[state.selectedPanel];
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  const chip = Math.max(22, w * 0.026);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(rect.x, rect.y, chip, chip);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${chip * 0.62}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(state.selectedPanel + 1), rect.x + chip / 2, rect.y + chip / 2 + 1);
  ctx.restore();
}

function transformOf(panelIndex) {
  if (!state.transforms[panelIndex]) state.transforms[panelIndex] = { zoom: 1, panX: 0, panY: 0 };
  return state.transforms[panelIndex];
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds a photo to the tray (once per source) and returns its record. */
function addPhoto(img, name, sourceKey) {
  const existing = state.photos.find((photo) => photo.sourceKey === sourceKey);
  if (existing) return existing;
  const record = { id: `photo-${++photoSerial}`, name, img, sourceKey };
  state.photos.push(record);
  const thumb = document.createElement('button');
  thumb.type = 'button';
  thumb.className = 'tray-thumb';
  thumb.title = name;
  thumb.dataset.photoId = record.id;
  const thumbImg = document.createElement('img');
  thumbImg.src = img.src;
  thumbImg.alt = name;
  thumb.append(thumbImg);
  thumb.addEventListener('click', () => {
    state.activePhotoId = record.id;
    assignPhoto(state.selectedPanel, record.id);
    markActiveThumb();
    render();
  });
  photoTray.append(thumb);
  return record;
}

function markActiveThumb() {
  photoTray.querySelectorAll('.tray-thumb').forEach((thumb) => {
    thumb.classList.toggle('active', thumb.dataset.photoId === state.activePhotoId);
  });
}

/** Puts a photo in a panel, keeping the panel's pan and zoom. */
function assignPhoto(panelIndex, photoId) {
  state.assignments[panelIndex] = photoId;
  transformOf(panelIndex);
}

/** Puts a photo in every panel of the current layout. */
function fillAllPanels(photoId) {
  for (let i = 0; i < panelCount(state.layout); i++) assignPhoto(i, photoId);
}

/** Loads one of the bundled samples into the tray by name ("pier" or "boulevard"). */
async function loadSample(name) {
  const record = addPhoto(await loadImage(`samples/${name}.jpg`), `${name} sample`, `sample:${name}`);
  return record;
}

/** Marks one button in a group as the chosen one. */
function markChosen(container, button) {
  container.querySelectorAll('button').forEach((b) => b.classList.toggle('chosen', b === button));
}

/** Builds a row of choice buttons; onPick receives the chosen key and button. */
function buildChoices(containerId, entries, initialKey, onPick) {
  const container = document.getElementById(containerId);
  entries.forEach(([key, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.key = key;
    if (key === initialKey) button.classList.add('chosen');
    button.addEventListener('click', () => {
      markChosen(container, button);
      onPick(key);
    });
    container.append(button);
  });
  return container;
}

buildChoices('layoutButtons', Object.entries(LAYOUTS).map(([key, def]) => [key, def.label]), state.layout, (key) => {
  state.layout = key;
  state.selectedPanel = Math.min(state.selectedPanel, panelCount(key) - 1);
  for (let i = 0; i < panelCount(key); i++) {
    if (!state.assignments[i] && state.activePhotoId) assignPhoto(i, state.activePhotoId);
  }
  render();
});

buildChoices('presetButtons', Object.entries(GRADE_PRESETS).map(([key, def]) => [key, def.label]), state.preset, (key) => {
  state.preset = key;
  render();
});

buildChoices('sizeButtons', Object.entries(EXPORT_SIZES).map(([key, def]) => [key, def.label]), state.sizeKey, (key) => {
  state.sizeKey = key;
  render();
});

/** Sets a choice group's chosen button from code (shot mode, layout changes). */
function chooseInGroup(containerId, key) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('button').forEach((b) => b.classList.toggle('chosen', b.dataset.key === key));
}

photoInput.addEventListener('change', async () => {
  const files = [...photoInput.files];
  for (const file of files) {
    const record = addPhoto(await loadImage(URL.createObjectURL(file)), file.name, `file:${file.name}:${file.size}`);
    if (!state.activePhotoId) {
      state.activePhotoId = record.id;
      fillAllPanels(record.id);
    } else {
      assignPhoto(state.selectedPanel, record.id);
      state.activePhotoId = record.id;
    }
  }
  photoInput.value = '';
  markActiveThumb();
  render();
});

stageWrap.addEventListener('dragover', (event) => {
  event.preventDefault();
  stageWrap.classList.add('dragging');
});
stageWrap.addEventListener('dragleave', () => stageWrap.classList.remove('dragging'));
stageWrap.addEventListener('drop', async (event) => {
  event.preventDefault();
  stageWrap.classList.remove('dragging');
  const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith('image/'));
  for (const file of files) {
    const record = addPhoto(await loadImage(URL.createObjectURL(file)), file.name, `file:${file.name}:${file.size}`);
    if (!state.activePhotoId) {
      state.activePhotoId = record.id;
      fillAllPanels(record.id);
    }
  }
  markActiveThumb();
  render();
});

document.getElementById('samplePierButton').addEventListener('click', async () => {
  const record = await loadSample('pier');
  state.activePhotoId = record.id;
  if (state.photos.length === 1) fillAllPanels(record.id);
  else assignPhoto(state.selectedPanel, record.id);
  markActiveThumb();
  render();
});

document.getElementById('sampleBoulevardButton').addEventListener('click', async () => {
  const record = await loadSample('boulevard');
  state.activePhotoId = record.id;
  if (state.photos.length === 1) fillAllPanels(record.id);
  else assignPhoto(state.selectedPanel, record.id);
  markActiveThumb();
  render();
});

document.getElementById('fillAllButton').addEventListener('click', () => {
  if (state.activePhotoId) fillAllPanels(state.activePhotoId);
  render();
});

document.getElementById('resetPanelButton').addEventListener('click', () => {
  state.transforms[state.selectedPanel] = { zoom: 1, panX: 0, panY: 0 };
  render();
});

panelZoom.addEventListener('input', () => {
  transformOf(state.selectedPanel).zoom = Number(panelZoom.value);
  render();
});

gradeStrength.addEventListener('input', () => {
  state.gradeStrength = Number(gradeStrength.value);
  render();
});

grainToggle.addEventListener('change', () => {
  state.grain = grainToggle.checked;
  render();
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  render();
});

subCaptionInput.addEventListener('input', () => {
  state.subCaption = subCaptionInput.value;
  render();
});

badgeInput.addEventListener('input', () => {
  state.badgeText = badgeInput.value;
  render();
});

badgeToggle.addEventListener('change', () => {
  state.badgeOn = badgeToggle.checked;
  render();
});

// Panel picking and panning on the canvas itself.
let drag = null;

function canvasPoint(event) {
  const box = coverCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - box.left) * (coverCanvas.width / box.width),
    y: (event.clientY - box.top) * (coverCanvas.height / box.height),
  };
}

function panelAt(point) {
  const { w, h } = exportSize();
  const gap = Math.max(10, Math.round(w * 0.016));
  const rects = panelRects(state.layout, w, h, gap);
  const index = rects.findIndex((r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h);
  return index === -1 ? null : { index, rect: rects[index] };
}

coverCanvas.addEventListener('pointerdown', (event) => {
  const hit = panelAt(canvasPoint(event));
  if (!hit) return;
  state.selectedPanel = hit.index;
  const view = transformOf(hit.index);
  drag = { panel: hit.index, rect: hit.rect, startX: event.clientX, startY: event.clientY, panX: view.panX, panY: view.panY };
  coverCanvas.setPointerCapture(event.pointerId);
  render();
});

coverCanvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const box = coverCanvas.getBoundingClientRect();
  const view = transformOf(drag.panel);
  view.panX = drag.panX + ((event.clientX - drag.startX) / box.width) * (coverCanvas.width / drag.rect.w);
  view.panY = drag.panY + ((event.clientY - drag.startY) / box.height) * (coverCanvas.height / drag.rect.h);
  render();
});

coverCanvas.addEventListener('pointerup', () => {
  drag = null;
});

/** Renders the cover alone (no selection outline) to a fresh canvas and returns it. */
function renderExportCanvas() {
  const { w, h } = exportSize();
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  renderCover(offscreen.getContext('2d'), w, h, artState());
  return offscreen;
}

document.getElementById('exportButton').addEventListener('click', () => {
  const { w, h } = exportSize();
  renderExportCanvas().toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vice-panels-${w}x${h}.png`;
    link.click();
    statusLine.textContent = `Saved vice-panels-${w}x${h}.png`;
  }, 'image/png');
});

// The hook the screenshot tooling drives: the same render the Export button downloads, as a data URL.
window.__vicePanels = {
  exportDataURL() {
    return renderExportCanvas().toDataURL('image/png');
  },
};

/** Applies a shot scene: samples loaded, panels assigned, words and size set, then painted. */
async function applyShotState(scene) {
  const records = {};
  for (const name of scene.sampleNames) records[name] = await loadSample(name);
  state.layout = scene.layout;
  state.preset = scene.preset;
  if (scene.caption !== null) {
    state.caption = scene.caption;
    captionInput.value = scene.caption;
  }
  if (scene.subCaption !== null && scene.subCaption !== undefined) {
    state.subCaption = scene.subCaption;
    subCaptionInput.value = scene.subCaption;
  }
  if (scene.badgeText !== null && scene.badgeText !== undefined) {
    state.badgeText = scene.badgeText;
    badgeInput.value = scene.badgeText;
  }
  state.sizeKey = scene.size;
  const fill = records[scene.fillPhoto] ?? Object.values(records)[0];
  if (fill) {
    state.activePhotoId = fill.id;
    fillAllPanels(fill.id);
  }
  if (scene.assign) {
    for (const pair of scene.assign.split(',')) {
      const [panel, name] = pair.split(':').map((part) => part.trim());
      if (records[name]) assignPhoto(Number(panel), records[name].id);
    }
  }
  if (scene.pan) {
    for (const entry of scene.pan.split(';')) {
      const [panel, offsets] = entry.split(':').map((part) => part.trim());
      const [panX, panY] = (offsets ?? '').split(',').map((part) => Number(part.trim()));
      const view = transformOf(Number(panel));
      if (Number.isFinite(panX)) view.panX = panX;
      if (Number.isFinite(panY)) view.panY = panY;
    }
  }
  chooseInGroup('layoutButtons', state.layout);
  chooseInGroup('presetButtons', state.preset);
  chooseInGroup('sizeButtons', state.sizeKey);
  markActiveThumb();
  render();
}

// Words start in the fields, so the first paint already says something.
captionInput.value = state.caption;
subCaptionInput.value = state.subCaption;
badgeInput.value = state.badgeText;
gradeStrength.value = String(state.gradeStrength);
grainToggle.checked = state.grain;
badgeToggle.checked = state.badgeOn;

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), { applyShotState });
} else {
  loadSample('pier').then((record) => {
    state.activePhotoId = record.id;
    fillAllPanels(record.id);
    markActiveThumb();
    render();
  });
  if (document.fonts?.ready) document.fonts.ready.then(() => render());
}
