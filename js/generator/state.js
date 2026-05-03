/* generator/state.js — Estado global del editor.
 *
 * Es un módulo singleton: hay una sola instancia editando un chapter al mismo
 * tiempo. Mantiene el chapter en memoria, el slide activo y un sistema simple
 * de event-bus para que los paneles se enteren de cambios. */

import { emptyChapter } from '../data/loader.js';

const listeners = new Map();           // event → Set<callback>

export const state = {
  chapter: emptyChapter(),
  activeSlideIdx: 0,
};

/** Cambia el chapter completo (load) y resetea el slide activo. */
export function setChapter(c) {
  state.chapter = c;
  state.activeSlideIdx = 0;
  emit('chapter');
  emit('slide');
}

/** Cambia el slide activo por índice. */
export function setActive(idx) {
  state.activeSlideIdx = Math.max(0, Math.min(idx, state.chapter.slides.length - 1));
  emit('slide');
}

/** Devuelve el slide actualmente seleccionado, o undefined si está vacío. */
export function activeSlide() {
  return state.chapter.slides[state.activeSlideIdx];
}

/** Notifica que se modificó el chapter (paneles deben re-renderizar). */
export function touchChapter() { emit('chapter'); }
export function touchSlide()   { emit('slide-data'); }

/** Suscribirse a eventos. event ∈ {'chapter', 'slide', 'slide-data'} */
export function on(event, cb) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
  return () => listeners.get(event).delete(cb);
}

function emit(event) {
  listeners.get(event)?.forEach(cb => cb());
}
