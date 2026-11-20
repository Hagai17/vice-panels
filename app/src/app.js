// Vice Panels editor: state, photo loading, panel interaction and export.
// The stage canvas is the live preview; Export renders the same drawing
// code (src/render.js) onto a full-size offscreen canvas.

import { SIZES, LAYOUTS, blankCoverState, panelAt, panelRect, coverDrawRect } from './panels.js';
import { drawCover } from './render.js';

const stage = document.getElementById('stage');
const sctx = stage.getContext('2d');

const state = {
  sizeKey: 'square',
  grade: 'sunset',
  headline: document.getElementById('headlineInput').value,
  subline: document.getElementById('sublineInput').value,
  photos: [], // HTMLImageElement list; slots the user can fill panels from
  pickedPhoto: 0,
  selected: 0,
  covers: {}, // sizeKey -> per-panel framing state, kept per layout
};

function coverState() {
  if (!state.covers[state.sizeKey]) {
    state.covers[state.sizeKey] = blankCoverState(state.sizeKey);
  }
  return state.covers[state.sizeKey];
}

function view(forExport) {
  return {
    sizeKey: state.sizeKey,
    panels: coverState(),
    photos: state.photos,
    grade: state.grade,
    headline: state.headline,
    subline: state.subline,
    selected: forExport ? null : state.selected,
    forExport,
  };
}

// Preview resolution per size: big enough to judge framing, small enough
// to redraw on every mouse move.
const PREVIEW = { square: [900, 900], portrait: [756, 945], wide: [1120, 630] };

function fitStageToSize() {
  const [w, h] = PREVIEW[state.sizeKey];
  stage.width = w;
  stage.height = h;
}

function redraw() {
  drawCover(sctx, stage.width, stage.height, view(false));
}

// ---- photos ------------------------------------------------------------

const strip = document.getElementById('photoStrip');

function refreshStrip() {
  strip.innerHTML = '';
  state.photos.forEach((img, i) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    if (i === state.pickedPhoto) thumb.classList.add('picked');
    thumb.addEventListener('click', () => {
      state.pickedPhoto = i;
      coverState()[state.selected].photo = i;
      refreshStrip();
      redraw();
    });
    strip.appendChild(thumb);
  });
}

function addPhoto(img) {
  state.photos.push(img);
  refreshStrip();
  redraw();
}

function loadPhotoSource(src) {
  const img = new Image();
  img.addEventListener('load', () => addPhoto(img));
  img.src = src;
}

function loadPhotoFiles(files) {
  [...files]
    .filter((f) => f.type.startsWith('image/'))
    .forEach((f) => loadPhotoSource(URL.createObjectURL(f)));
}

// The two sample scenes ship with the app, so a first-time visitor sees a
// finished cover immediately and can swap in their own photos after.
loadPhotoSource('samples/boulevard.jpg');
loadPhotoSource('samples/pier.jpg');

const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', () => {
  loadPhotoFiles(fileInput.files);
  fileInput.value = '';
});

const dropZone = document.getElementById('dropZone');
['dragenter', 'dragover'].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.add('over');
  }),
);
['dragleave', 'drop'].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.remove('over');
  }),
);
dropZone.addEventListener('drop', (e) => loadPhotoFiles(e.dataTransfer.files));

document.getElementById('fillAllBtn').addEventListener('click', () => {
  coverState().forEach((p) => {
    p.photo = state.pickedPhoto;
  });
  redraw();
});

// ---- panel interaction ---------------------------------------------------

const panelName = document.getElementById('panelName');
const zoomRange = document.getElementById('zoomRange');

function syncPanelControls() {
  panelName.textContent = String(state.selected + 1);
  zoomRange.value = coverState()[state.selected].zoom;
}

function stagePoint(evt) {
  const box = stage.getBoundingClientRect();
  return {
    x: ((evt.clientX - box.left) / box.width) * stage.width,
    y: ((evt.clientY - box.top) / box.height) * stage.height,
  };
}

let drag = null;

stage.addEventListener('pointerdown', (evt) => {
  const pt = stagePoint(evt);
  const hit = panelAt(LAYOUTS[state.sizeKey], stage.width, stage.height, pt.x, pt.y);
  if (hit < 0) return;
  state.selected = hit;
  syncPanelControls();
  const panel = coverState()[hit];
  drag = { x: pt.x, y: pt.y, ox: panel.ox, oy: panel.oy };
  stage.classList.add('dragging');
  stage.setPointerCapture(evt.pointerId);
  redraw();
});

stage.addEventListener('pointermove', (evt) => {
  if (!drag) return;
  const pt = stagePoint(evt);
  const layout = LAYOUTS[state.sizeKey];
  const rect = panelRect(layout[state.selected], stage.width, stage.height);
  const panel = coverState()[state.selected];
  const img = state.photos[panel.photo];
  if (img && img.naturalWidth > 0) {
    const d = coverDrawRect(img, rect, panel.ox, panel.oy, panel.zoom);
    const spareX = Math.max(1, d.w - rect.w);
    const spareY = Math.max(1, d.h - rect.h);
    panel.ox = Math.min(1, Math.max(0, drag.ox - (pt.x - drag.x) / spareX));
    panel.oy = Math.min(1, Math.max(0, drag.oy - (pt.y - drag.y) / spareY));
  }
  redraw();
});

function endDrag() {
  drag = null;
  stage.classList.remove('dragging');
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

stage.addEventListener(
  'wheel',
  (evt) => {
    evt.preventDefault();
    const panel = coverState()[state.selected];
    const factor = evt.deltaY < 0 ? 1.07 : 0.93;
    panel.zoom = Math.min(3, Math.max(1, panel.zoom * factor));
    zoomRange.value = panel.zoom;
    redraw();
  },
  { passive: false },
);

zoomRange.addEventListener('input', () => {
  coverState()[state.selected].zoom = Number(zoomRange.value);
  redraw();
});

document.getElementById('centerBtn').addEventListener('click', () => {
  const panel = coverState()[state.selected];
  panel.ox = 0.5;
  panel.oy = 0.5;
  redraw();
});

document.getElementById('swapBtn').addEventListener('click', () => {
  if (state.photos.length === 0) return;
  const panel = coverState()[state.selected];
  panel.photo = (panel.photo + 1) % state.photos.length;
  redraw();
});

document.getElementById('flipBtn').addEventListener('click', () => {
  const panel = coverState()[state.selected];
  panel.flip = !panel.flip;
  redraw();
});

// Arrow keys nudge the selected panel's photo a few percent at a time —
// finer control than dragging when a face is near a panel edge.
window.addEventListener('keydown', (evt) => {
  if (evt.target.tagName === 'INPUT' && evt.target.type === 'text') return;
  const step = evt.shiftKey ? 0.01 : 0.04;
  const panel = coverState()[state.selected];
  const moves = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const move = moves[evt.key];
  if (!move) return;
  evt.preventDefault();
  panel.ox = Math.min(1, Math.max(0, panel.ox + move[0]));
  panel.oy = Math.min(1, Math.max(0, panel.oy + move[1]));
  redraw();
});

// ---- caption, grade, size -------------------------------------------------

document.getElementById('headlineInput').addEventListener('input', (e) => {
  state.headline = e.target.value;
  redraw();
});
document.getElementById('sublineInput').addEventListener('input', (e) => {
  state.subline = e.target.value;
  redraw();
});

document.querySelectorAll('.grade-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.grade = btn.dataset.grade;
    document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('is-on', b === btn));
    redraw();
  });
});

document.querySelectorAll('.size-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.sizeKey = btn.dataset.size;
    document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('is-on', b === btn));
    state.selected = 0;
    fitStageToSize();
    syncPanelControls();
    redraw();
  });
});

// ---- export ---------------------------------------------------------------

function renderExportCanvas(sizeKey) {
  const { w, h } = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const keep = state.sizeKey;
  state.sizeKey = sizeKey;
  drawCover(off.getContext('2d'), w, h, view(true));
  state.sizeKey = keep;
  return off;
}

function exportPNG() {
  renderExportCanvas(state.sizeKey).toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${state.sizeKey}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}
document.getElementById('exportBtn').addEventListener('click', exportPNG);

// A small handle for scripted screenshots: the same render the Export
// button writes, readable as a data URL, plus size/grade switches.
window.VicePanels = {
  setSize(key) {
    document.querySelector(`.size-btn[data-size="${key}"]`).click();
  },
  setGrade(key) {
    document.querySelector(`.grade-btn[data-grade="${key}"]`).click();
  },
  exportDataURL(key) {
    return renderExportCanvas(key).toDataURL('image/png');
  },
  photoCount() {
    return state.photos.length;
  },
};

// ---- boot -------------------------------------------------------------------

fitStageToSize();
syncPanelControls();
redraw();
if (document.fonts && document.fonts.load) {
  document.fonts.load('100px Anton').then(redraw).catch(() => {});
}
