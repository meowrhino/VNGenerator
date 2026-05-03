/* pages/cg.js — Galería de CGs (Computer Graphics) desbloqueadas para una VN.
 *
 * URL:  cg.html?vn=path/a/chapter.json
 *
 * Carga el chapter, recorre todos los slides con tag:"cg" y muestra
 * thumbnails. Las CG no vistas aparecen oscurecidas con candado. Click
 * abre lightbox con la imagen completa. */

import { loadChapter } from '../data/loader.js';
import { CGTracker } from '../state/saves.js';
import { escapeHtml } from '../core/util.js';

const root = document.getElementById('cg-root');

(async function main() {
  const params = new URLSearchParams(location.search);
  const path = params.get('vn');

  if (!path) {
    root.innerHTML = `
      <div class="error">
        <h2>Falta el parámetro <code>?vn=</code></h2>
        <p><a href="./index.html">Volver a la biblioteca</a></p>
      </div>`;
    return;
  }

  try {
    const chapter = await loadChapter(path);
    render(chapter);
  } catch (err) {
    root.innerHTML = `
      <div class="error">
        <h2>Error cargando capítulo</h2>
        <p>${escapeHtml(err.message)}</p>
      </div>`;
  }
})();

function render(chapter) {
  // Recolectar todas las CGs del capítulo: cualquier slide con tag:"cg"
  // o explícitamente cg:true. Tomamos su layer bg1 como imagen principal.
  const cgs = chapter.slides
    .filter(s => (s.tag === 'cg' || s.cg === true) && s.layers?.bg1?.src)
    .map(s => ({
      src: s.layers.bg1.src,
      caption: s.text?.body || s.id || '',
      slideId: s.id,
    }));

  const unlocked = CGTracker.unlocked(chapter.id);
  const seenCount = cgs.filter(cg => unlocked.has(cg.src)).length;

  root.innerHTML = `
    <header class="cg-head">
      <h1>${escapeHtml(chapter.title || '')} · CG</h1>
      <div class="cg-meta">
        <strong>${seenCount}</strong> / ${cgs.length} desbloqueadas
        · <a href="./reader.html?vn=${encodeURIComponent(getPath())}">leer</a>
        · <a href="./index.html">biblioteca</a>
      </div>
    </header>
    <div class="cg-grid">
      ${cgs.length
        ? cgs.map(cg => cgItemHtml(cg, unlocked.has(cg.src))).join('')
        : '<div class="cg-empty">Este capítulo no tiene CGs marcadas con tag:"cg".</div>'}
    </div>
  `;

  root.addEventListener('click', (e) => {
    const item = e.target.closest('.cg-item');
    if (!item || item.classList.contains('locked')) return;
    openLightbox(item.dataset.src, item.dataset.caption);
  });
}

function cgItemHtml(cg, isUnlocked) {
  return `
    <div class="cg-item ${isUnlocked ? '' : 'locked'}"
         data-src="${escapeHtml(cg.src)}"
         data-caption="${escapeHtml(cg.caption)}">
      <img src="${escapeHtml(cg.src)}" alt="${escapeHtml(cg.caption)}">
      ${isUnlocked && cg.caption ? `<div class="cg-item-meta">${escapeHtml(cg.caption.slice(0, 80))}</div>` : ''}
    </div>
  `;
}

function openLightbox(src, caption) {
  const box = document.createElement('div');
  box.className = 'cg-lightbox';
  box.innerHTML = `
    <button class="cg-lightbox-close">×</button>
    <img src="${escapeHtml(src)}" alt="${escapeHtml(caption)}">
  `;
  document.body.appendChild(box);
  box.addEventListener('click', () => box.remove());
}

function getPath() {
  return new URLSearchParams(location.search).get('vn') || '';
}
