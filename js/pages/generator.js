/* pages/generator.js — Entry point del editor (generator.html).
 *
 * Coordina los paneles: meta, lista de slides, editor de slide, preview.
 * Los botones de la toolbar superior viven aquí porque son acciones
 * globales (nuevo, cargar, exportar, +slide, +choice, duplicar, borrar). */

import { state, setChapter, setActive, touchChapter, on } from '../generator/state.js';
import { mountMeta, mountSlidesList } from '../generator/panels.js';
import { mountEditor }                from '../generator/editors.js';
import { mountPreview, playFromHere } from '../generator/preview.js';
import { loadChapterFromFile, validateChapter, emptyChapter } from '../data/loader.js';
import { deepClone } from '../core/util.js';

const els = {
  meta:       document.getElementById('gen-meta'),
  slidesList: document.getElementById('gen-slides'),
  editor:     document.getElementById('gen-editor'),
  preview:    document.getElementById('gen-preview'),
  fileInput:  document.getElementById('gen-file'),
  status:     document.getElementById('gen-status'),
};

mountMeta(els.meta);
mountSlidesList(els.slidesList);
mountEditor(els.editor);
mountPreview(els.preview);
bindToolbar();

function bindToolbar() {
  document.getElementById('btn-new').addEventListener('click', () => {
    if (confirm('¿Empezar un capítulo nuevo? Se perderán los cambios sin guardar.')) {
      setChapter(emptyChapter());
    }
  });

  document.getElementById('btn-load').addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = await loadChapterFromFile(f);
      setChapter(data);
      flash('Cargado: ' + f.name);
    } catch (err) {
      alert('Error cargando: ' + err.message);
    }
  });

  document.getElementById('btn-export').addEventListener('click', () => exportJSON(false));
  document.getElementById('btn-export-pretty').addEventListener('click', () => exportJSON(true));
  document.getElementById('btn-preview-play').addEventListener('click', () => playFromHere(els.preview));
  document.getElementById('btn-add-slide').addEventListener('click', addSlide);
  document.getElementById('btn-add-choice').addEventListener('click', addChoiceSlide);
  document.getElementById('btn-duplicate').addEventListener('click', duplicateSlide);
  document.getElementById('btn-delete').addEventListener('click', deleteSlide);

  // Auto-load si viene ?load
  if (new URLSearchParams(location.search).has('load')) els.fileInput.click();
}

function addSlide() {
  const newSlide = {
    id: 's' + String(state.chapter.slides.length + 1).padStart(3, '0'),
    layers: {},
    text: { body: '' },
    transition: 'default',
  };
  state.chapter.slides.splice(state.activeSlideIdx + 1, 0, newSlide);
  setActive(state.activeSlideIdx + 1);
  touchChapter();
}

function addChoiceSlide() {
  const newSlide = {
    id: 'choice_' + Date.now(),
    choice: {
      prompt: '¿Qué haces?',
      options: [
        { label: 'Opción A', next: '' },
        { label: 'Opción B', next: '' },
      ],
    },
  };
  state.chapter.slides.splice(state.activeSlideIdx + 1, 0, newSlide);
  setActive(state.activeSlideIdx + 1);
  touchChapter();
}

function duplicateSlide() {
  const cur = state.chapter.slides[state.activeSlideIdx];
  const clone = deepClone(cur);
  clone.id = (clone.id || 's') + '_copy';
  state.chapter.slides.splice(state.activeSlideIdx + 1, 0, clone);
  setActive(state.activeSlideIdx + 1);
  touchChapter();
}

function deleteSlide() {
  if (state.chapter.slides.length <= 1) {
    alert('No puedes borrar el último slide.');
    return;
  }
  if (!confirm('¿Borrar este slide?')) return;
  state.chapter.slides.splice(state.activeSlideIdx, 1);
  if (state.activeSlideIdx >= state.chapter.slides.length) {
    setActive(state.chapter.slides.length - 1);
  }
  touchChapter();
}

function exportJSON(pretty) {
  try {
    validateChapter(state.chapter);
  } catch (err) {
    if (!confirm('Validación falló: ' + err.message + '\n¿Exportar igualmente?')) return;
  }
  const text = JSON.stringify(state.chapter, null, pretty ? 2 : 0);
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (state.chapter.id || 'chapter') + '.json';
  a.click();
  flash('Exportado: ' + a.download);
}

function flash(msg) {
  els.status.textContent = msg;
  els.status.classList.add('show');
  clearTimeout(flash._t);
  flash._t = setTimeout(() => els.status.classList.remove('show'), 2000);
}
