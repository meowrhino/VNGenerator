/* core/engine.js — Orquestador del lector.
 *
 * Responsabilidades:
 *   - Recibir el chapter cargado y pintar slide a slide.
 *   - Coordinar transiciones (transitions.js) y movement (transitions.js).
 *   - Coordinar la UI (textbox, choices, topbar, menu, backlog, save).
 *   - Coordinar el estado (vars, flow, history) y persistencia (saves).
 *   - No conocer los detalles de cada subsistema (cada uno vive aparte).
 *
 * El engine es asincrónico: cualquier `next()` puede esperar a que la
 * transición previa termine. La bandera `busy` evita reentradas. */

import { Layers } from './layers.js';
import { applyTransition, applyMotion } from './transitions.js';
import { AudioMixer } from './audio.js';
import { bindInput } from './input.js';
import { deepClone } from './util.js';

import { Textbox } from '../ui/textbox.js';
import { Choices } from '../ui/choices.js';
import { Topbar }  from '../ui/topbar.js';
import { Menu }    from '../ui/menu.js';
import { BacklogView } from '../ui/backlog.js';
import { SaveMenu } from '../ui/save-menu.js';
import { Toast }    from '../ui/toast.js';

import { VarStore }    from '../state/vars.js';
import { FlowController } from '../state/flow.js';
import { TextHistory } from '../state/history.js';
import { SaveStore, CGTracker } from '../state/saves.js';

const DEFAULTS = {
  transition: { type: 'fade', duration: 400 },
  textSpeed: 30,
};

export class Engine {
  /**
   * @param {HTMLElement} rootEl
   * @param {object} opts
   * @param {boolean} [opts.embedded]  modo preview del editor: omite topbar/menú/atajos globales
   */
  constructor(rootEl, opts = {}) {
    this.root = rootEl;
    this.opts = opts;
    this.busy = false;
    this.auto = false;
    this.skipping = false;
    this.chapter = null;

    // === Subsistemas visuales (orden importa: stage primero, UI sobre él) ===
    this.layers = new Layers(rootEl);
    this.audio  = new AudioMixer();

    this.textbox = new Textbox(rootEl);
    this.choices = new Choices(rootEl, opt => this._onChoicePicked(opt));

    // En modo embedded omitimos topbar, menú, save panel y atajos globales:
    // el editor ya tiene su propia UI alrededor del preview.
    if (!opts.embedded) {
      this.topbar  = new Topbar(rootEl, {
        prev:    () => this.prev(),
        auto:    () => this.toggleAuto(),
        skip:    () => this.skip(),
        backlog: () => this.openBacklog(),
        saves:   () => this.openSaves(),
        menu:    () => this.toggleMenu(),
      });
      this.toast = new Toast(rootEl);

      this.menu = new Menu(rootEl, [
        { label: 'Continuar', kbd: 'Esc', action: () => this.menu.close() },
        { label: 'Guardar',   kbd: 'S',   action: () => { this.menu.close(); this.openSaves('save'); } },
        { label: 'Cargar',    kbd: 'S',   action: () => { this.menu.close(); this.openSaves('load'); } },
        { label: 'Historial', kbd: 'L',   action: () => { this.menu.close(); this.openBacklog(); } },
        { label: 'Reiniciar',             action: () => { this.menu.close(); this.restart(); } },
        { label: 'Volver a la biblioteca', action: () => { location.href = './index.html'; } },
      ]);

      this.backlog = new BacklogView(rootEl, {
        onPlayVoice: (url) => this.audio._setVoice(url),
      });

      this.unbindInput = bindInput(rootEl, {
        next:      () => this.next(),
        prev:      () => this.prev(),
        menu:      () => this.toggleMenu(),
        backlog:   () => this.openBacklog(),
        saves:     () => this.openSaves(),
        auto:      () => this.toggleAuto(),
        mute:      () => this.toggleMute(),
        skipStart: () => { this.skipping = true; this.skip(); },
        skipStop:  () => { this.skipping = false; },
      });
    } else {
      // Stubs no-op para que el resto del código no haga branching
      this.topbar = { setTitle: () => {}, setAuto: () => {} };
      this.toast  = { show: () => {} };
    }
  }

  /** Carga y arranca un capítulo. */
  async play(chapter) {
    this.chapter = chapter;
    this.vars   = new VarStore(chapter.vars || {});
    this.flow   = new FlowController(chapter.slides, this.vars);
    this.history = new TextHistory();
    this.saves   = new SaveStore(chapter.id || 'unknown');
    if (!this.opts.embedded) {
      this.saveMenu = new SaveMenu(this.root, {
        getSlots: () => this.saves.list(),
        onSave: (slot) => { this.save(slot); return true; },
        onLoad: (slot) => this.load(slot),
        onDelete: (slot) => this.saves.delete(slot),
      });
    }

    this.topbar.setTitle(chapter.title || '');
    this.flow.seek(0);
    await this._showSlide(this.flow.current(), null);
  }

  /** Renderiza un slide concreto. Aplica transición desde prevSlide. */
  async _showSlide(slide, prevSlide) {
    if (!slide) return;
    this.busy = true;

    if (slide.choice) {
      this.choices.show(slide.choice, expr => this.vars.eval(expr));
      this.busy = false;
      return;
    }
    this.choices.hide();

    // 1) Transición visual de capas
    const tr = this._resolveTransition(slide.transition);
    await applyTransition(this.layers, prevSlide, slide, tr);

    // 2) Movement (msp/amsp) si lo hay
    if (slide.motion) await applyMotion(this.layers, slide.motion);

    // 3) Texto (si hay) → registrar en history
    if (slide.text) {
      this.history.push({
        speaker: slide.text.speaker,
        body: slide.text.body || '',
        slideIdx: this.flow.idx,
        audio: slide.audio ? { voice: slide.audio.voice } : undefined,
      });
      this.textbox.render(slide.text, { speed: this.chapter.defaults?.textSpeed ?? DEFAULTS.textSpeed });
    } else {
      this.textbox.hide();
    }

    // 4) Audio
    if (slide.audio) this.audio.apply(slide.audio, this.chapter.assets?.audio || '');

    // 5) Tracking de CG
    if (slide.tag === 'cg' && slide.layers?.bg1?.src) {
      CGTracker.unlock(this.chapter.id, slide.layers.bg1.src);
    }

    // 6) Autosave en cada slide visto (silencioso)
    this._autosave();

    // 7) Salto automático tras delay (slide.goto + slide.gotoDelay)
    if (slide.goto && slide.gotoDelay) {
      setTimeout(() => {
        if (this.busy) return;
        this._jumpById(slide.goto);
      }, slide.gotoDelay);
    }

    this.busy = false;
  }

  _resolveTransition(slideTr) {
    if (slideTr === null) return null;
    if (slideTr === undefined || slideTr === 'default') {
      return this.chapter.defaults?.transition ?? DEFAULTS.transition;
    }
    if (typeof slideTr === 'string') return { type: slideTr, duration: 400 };
    return slideTr;
  }

  // === Navegación ===

  async next() {
    if (this.busy) {
      // Si está escribiendo el typewriter, completarlo de golpe
      if (this.textbox.isTyping()) {
        this.textbox.complete();
        return;
      }
      return;
    }
    const cur = this.flow.current();
    if (cur?.choice) return;
    let result;
    try {
      result = this.flow.next();
    } catch (err) {
      console.error(err);
      this.toast.show('Error: ' + err.message, 3000);
      return;
    }
    if (result.end) { this._onChapterEnd(); return; }
    await this._showSlide(result.slide, result.prev);
  }

  async prev() {
    if (this.busy) return;
    const result = this.flow.prev();
    if (!result) return;
    // En la dirección inversa no animamos: salto instantáneo
    await this._showSlide(result.slide, result.prev);
  }

  async _jumpById(id) {
    if (this.busy) return;
    let result;
    try { result = this.flow.jumpTo(id); }
    catch (err) { console.warn(err); return; }
    await this._showSlide(result.slide, result.prev);
  }

  _onChoicePicked(opt) {
    if (opt.vars) this.vars.applyOps(opt.vars);
    this._jumpById(opt.next);
  }

  // === Auto / Skip ===

  toggleAuto() {
    this.auto = !this.auto;
    this.topbar.setAuto(this.auto);
    if (this.auto) this._autoLoop();
  }
  async _autoLoop() {
    while (this.auto && this.flow.idx < this.chapter.slides.length - 1) {
      await sleep(2500);
      if (!this.auto) break;
      await this.next();
    }
  }
  async skip() {
    while (this.flow.idx < this.chapter.slides.length - 1) {
      const cur = this.flow.current();
      if (cur?.choice) break;
      try { this.flow.next(); } catch { break; }
    }
    const cur = this.flow.current();
    await applyTransition(this.layers, null, cur, null);
    if (cur?.text) this.textbox.render(cur.text);
  }

  // === UI overlays ===

  toggleMenu()    { this.menu.toggle(); }
  openBacklog()   { this.backlog.open(this.history.all()); }
  openSaves(mode = 'save') { this.saveMenu?.open(mode); }
  toggleMute()    {
    this.audio.setMuted(!this.audio.muted);
    this.toast.show(this.audio.muted ? 'Audio: muted' : 'Audio: on');
  }

  // === Save / Load ===

  _autosave() {
    if (!this.saves || this.opts.embedded) return;
    this.saves.write(0, this._snapshot());
  }

  save(slot) {
    if (!this.saves) return;
    this.saves.write(slot, this._snapshot());
    this.toast.show(`Guardado en slot ${slot}`);
  }

  async load(slot) {
    const data = this.saves.read(slot);
    if (!data) { this.toast.show(`Slot ${slot} vacío`); return; }
    this.vars.restore(data.vars || {});
    this.history.restore(data.log || []);
    this.flow.seek(data.idx, data.history, data.callStack);
    const cur = this.flow.current();
    await this._showSlide(cur, null);
    this.toast.show(`Cargado slot ${slot}`);
  }

  _snapshot() {
    const cur = this.flow.current();
    const cleanBody = cur?.text?.body ? stripMarkers(cur.text.body) : '';
    const preview = cleanBody
      ? (cur.text.speaker ? `${cur.text.speaker}: ` : '') + cleanBody.slice(0, 80)
      : '';
    return {
      ...this.flow.snapshot(),
      vars: this.vars.snapshot(),
      log: this.history.snapshot().slice(-50),
      preview,
      // thumb: TODO — sería ideal capturar el stage. Punto pendiente.
    };
  }

  restart() {
    this.audio.stopAll();
    this.layers.reset();
    this.history.clear();
    this.vars.reset(this.chapter.vars || {});
    this.flow.seek(0);
    this._showSlide(this.flow.current(), null);
  }

  _onChapterEnd() {
    const end = document.createElement('div');
    end.className = 'vn-end';
    end.innerHTML = `
      <h2>Fin del capítulo</h2>
      <button onclick="location.href='./index.html'">Biblioteca</button>
      <button onclick="location.reload()">Volver a leer</button>
    `;
    this.root.appendChild(end);
  }

  destroy() {
    this.unbindInput?.();
    this.audio.stopAll();
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Quita marcadores [w:N], [c:#xxx]…[/c], **bold**, *italic* del texto, para
 *  generar previews legibles en saves y otros contextos texto-puros. */
function stripMarkers(s) {
  return String(s)
    .replace(/\[w:\d+\]/g, '')
    .replace(/\[c:[^\]]+\]/g, '')
    .replace(/\[\/c\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\\n/g, ' ')
    .trim();
}
