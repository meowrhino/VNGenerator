/* ui/textbox.js — Caja de texto inferior con speaker + cuerpo + prompt parpadeante.
 *
 * Sólo expone tres acciones:
 *   render(text, opts)      → cambia el contenido (con typewriter)
 *   complete()              → salta al final del typewriter actual
 *   hide() / show()         → muestra u oculta toda la caja
 *
 * Usa Typewriter para renderizar el body con marcadores inline. */

import { Typewriter } from '../core/typewriter.js';

export class Textbox {
  constructor(rootEl, defaults = {}) {
    this.defaults = defaults;
    this.el = document.createElement('div');
    this.el.className = 'vn-textbox';
    this.el.innerHTML = `
      <div class="vn-speaker"></div>
      <div class="vn-text"></div>
      <div class="vn-prompt">▼ click / espacio</div>
    `;
    rootEl.appendChild(this.el);
    this.speakerEl = this.el.querySelector('.vn-speaker');
    this.bodyEl    = this.el.querySelector('.vn-text');
    this.typewriter = null;
  }

  /** Renderiza un bloque de texto. text = { speaker?: string, body?: string }. */
  render(text, opts = {}) {
    if (!text) { this.hide(); return; }
    this.show();
    // Slides "tarjeta" (intro/acto/escena): texto centrado en pantalla, sin caja
    this.el.classList.toggle('vn-card', !!text.center);
    this.speakerEl.textContent = text.speaker || '';
    this.speakerEl.style.display = text.speaker ? '' : 'none';
    if (this.typewriter) this.typewriter.destroy();
    this.typewriter = new Typewriter(this.bodyEl, {
      speed: opts.speed ?? this.defaults.textSpeed ?? 30,
    });
    this.typewriter.reset(text.body || '');
    this.typewriter.start();
  }

  /** ¿La animación de texto sigue corriendo? */
  isTyping() { return this.typewriter && !this.typewriter.done; }

  /** Salta al final del texto actual (al click si aún escribiendo). */
  complete() { this.typewriter?.complete(); }

  hide() { this.el.classList.add('vn-hidden'); }
  show() { this.el.classList.remove('vn-hidden'); }
}
