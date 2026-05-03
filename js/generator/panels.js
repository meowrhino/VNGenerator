/* generator/panels.js — Panel izquierdo del editor: meta del capítulo + lista
 * de slides con drag & drop. */

import { state, setActive, touchChapter, on } from './state.js';
import { setPath, escapeHtml, escapeAttr } from '../core/util.js';

/* ===== Meta del capítulo ===== */

export function mountMeta(el) {
  const render = () => {
    const c = state.chapter;
    el.innerHTML = `
      <label>Título <input data-meta="title" value="${escapeAttr(c.title || '')}"></label>
      <label>Autor <input data-meta="author" value="${escapeAttr(c.author || '')}"></label>
      <label>ID <input data-meta="id" value="${escapeAttr(c.id || '')}"></label>
      <label>Imágenes <input data-meta="assets.images" value="${escapeAttr(c.assets?.images || '')}" placeholder="./img/"></label>
      <label>Audio <input data-meta="assets.audio" value="${escapeAttr(c.assets?.audio || '')}" placeholder="./audio/"></label>
      <label>Velocidad texto <input type="number" data-meta="defaults.textSpeed" value="${c.defaults?.textSpeed ?? 30}"></label>
      <label>Variables iniciales (JSON)
        <textarea data-meta-json="vars" rows="3">${escapeHtml(JSON.stringify(c.vars || {}, null, 2))}</textarea>
      </label>
    `;
    el.querySelectorAll('[data-meta]').forEach(inp => {
      inp.addEventListener('input', e => setPath(c, e.target.dataset.meta, e.target.value));
    });
    el.querySelectorAll('[data-meta-json]').forEach(inp => {
      inp.addEventListener('input', e => {
        try {
          c[e.target.dataset.metaJson] = JSON.parse(e.target.value || '{}');
          e.target.style.borderColor = '';
        } catch {
          e.target.style.borderColor = 'var(--danger)';
        }
      });
    });
  };
  render();
  on('chapter', render);
}

/* ===== Lista de slides ===== */

export function mountSlidesList(el, deps) {
  const render = () => {
    el.innerHTML = '';
    state.chapter.slides.forEach((s, i) => {
      const li = document.createElement('div');
      li.className = 'gen-slide-item' + (i === state.activeSlideIdx ? ' active' : '');
      li.innerHTML = `
        <span class="gen-slide-idx">${String(i + 1).padStart(3, '0')}</span>
        <span class="gen-slide-id">${escapeHtml(s.id || '—')}</span>
        <span class="gen-slide-preview">${slidePreview(s)}</span>
      `;
      li.addEventListener('click', () => setActive(i));
      li.draggable = true;
      li.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', String(i));
      });
      li.addEventListener('dragover', e => e.preventDefault());
      li.addEventListener('drop', e => {
        e.preventDefault();
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (isNaN(fromIdx) || fromIdx === i) return;
        const [moved] = state.chapter.slides.splice(fromIdx, 1);
        state.chapter.slides.splice(i, 0, moved);
        setActive(i);
        touchChapter();
      });
      el.appendChild(li);
    });
  };
  render();
  on('chapter', render);
  on('slide', render);
  on('slide-data', render);
}

function slidePreview(s) {
  if (s.choice) return `◇ choice (${s.choice.options.length})`;
  if (s.gosub) return `↳ gosub: ${s.gosub}`;
  if (s.return) return `↰ return`;
  if (s.text?.body) return escapeHtml(s.text.body.slice(0, 40));
  return '(sin texto)';
}
