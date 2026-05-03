/* generator/preview.js — Preview en vivo del slide actual usando el engine real.
 *
 * Estrategia: tenemos UNA instancia de engine apuntando al div #gen-preview.
 * Cada vez que cambia el slide activo o sus datos, llamamos `engine.show()`
 * con el slide clonado y los srcs resueltos. */

import { Engine } from '../core/engine.js';
import { resolveImageSrcs } from '../data/loader.js';
import { state, on } from './state.js';
import { deepClone } from '../core/util.js';

let engine = null;
let timer  = null;

export function mountPreview(el) {
  engine = new Engine(el, { embedded: true });
  schedule();
  on('slide',      schedule);
  on('chapter',    schedule);
  on('slide-data', schedule);
}

/** Render diferido para no rehacer en cada keystroke. */
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(renderNow, 200);
}

function renderNow() {
  if (!engine) return;
  const cloned = deepClone(state.chapter);
  resolveImageSrcs(cloned);
  const cur = cloned.slides[state.activeSlideIdx];
  const prev = state.activeSlideIdx > 0 ? cloned.slides[state.activeSlideIdx - 1] : null;
  if (!cur) return;

  // Hack: el engine necesita chapter+vars+flow para play normal, pero
  // para preview sólo queremos pintar UN slide. Lo inicializamos mínimamente.
  if (!engine.chapter) {
    engine.chapter = cloned;
    engine.vars = { eval: () => true, applyOps: () => {}, snapshot: () => ({}) };
    engine.flow = { idx: state.activeSlideIdx, current: () => cur, snapshot: () => ({}) };
  } else {
    engine.chapter = cloned;
    engine.flow.idx = state.activeSlideIdx;
  }
  engine._showSlide(cur, prev);
}

/** Reproduce desde el slide actual usando el engine de verdad. */
export async function playFromHere(el) {
  // Reset duro: borramos el host y re-creamos engine con play() completo
  el.innerHTML = '';
  engine = new Engine(el, { embedded: true });
  const cloned = deepClone(state.chapter);
  resolveImageSrcs(cloned);
  await engine.play(cloned);
  // Posicionarlo en el slide deseado
  if (state.activeSlideIdx > 0) {
    engine.flow.seek(state.activeSlideIdx);
    await engine._showSlide(engine.flow.current(), null);
  }
}
