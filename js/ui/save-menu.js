/* ui/save-menu.js — Panel de save slots con thumbnails y modos save/load.
 *
 * Dos modos: SAVE escribe sobre el slot; LOAD restaura el estado al engine.
 * Slot 0 está reservado para autosave; slot -1 para quicksave. Resto manuales. */

const SLOT_COUNT = 9;       // slots manuales 1..9
const SPECIAL_SLOTS = [
  { slot: 0,  label: 'Autosave',  readonly: false },
  { slot: -1, label: 'Quicksave', readonly: false },
];

export class SaveMenu {
  /**
   * @param {HTMLElement} rootEl
   * @param {object} deps  { onSave(slot), onLoad(slot), onDelete(slot), getSlots() }
   */
  constructor(rootEl, deps) {
    this.rootEl = rootEl;
    this.deps = deps;
    this.el = null;
    this.mode = 'save';     // 'save' | 'load'
  }

  isOpen() { return !!this.el; }

  open(mode = 'save') {
    if (this.el) this.close();
    this.mode = mode;
    this.el = document.createElement('div');
    this.el.className = 'vn-overlay vn-saves';
    this.el.innerHTML = this._render();
    this.rootEl.appendChild(this.el);
    this._bindEvents();
  }

  close() {
    this.el?.remove();
    this.el = null;
  }

  _render() {
    const existingByslot = new Map();
    for (const s of this.deps.getSlots()) existingByslot.set(s.slot, s);

    const allSlots = [
      ...SPECIAL_SLOTS,
      ...Array.from({ length: SLOT_COUNT }, (_, i) => ({ slot: i + 1, label: `Slot ${i + 1}` })),
    ];

    return `
      <div class="vn-overlay-head">
        <h2>${this.mode === 'save' ? 'Guardar partida' : 'Cargar partida'}</h2>
        <button class="vn-overlay-close" data-act="close" title="Cerrar">×</button>
      </div>
      <div class="vn-save-mode-tabs">
        <button data-mode="save" class="${this.mode === 'save' ? 'active' : ''}">SAVE</button>
        <button data-mode="load" class="${this.mode === 'load' ? 'active' : ''}">LOAD</button>
      </div>
      <div class="vn-overlay-body">
        ${allSlots.map(meta => this._slotHtml(meta, existingByslot.get(meta.slot))).join('')}
      </div>
    `;
  }

  _slotHtml(meta, save) {
    if (!save) {
      const disabled = this.mode === 'load' ? 'disabled' : '';
      return `
        <div class="vn-save-slot empty" data-slot="${meta.slot}">
          <div class="vn-save-thumb">— vacío —</div>
          <div class="vn-save-info">
            <dt>slot</dt><dd>${meta.label}</dd>
          </div>
          <div class="vn-save-actions">
            <button data-act="save" data-slot="${meta.slot}" ${this.mode === 'load' ? 'disabled' : ''}>${this.mode === 'save' ? 'Guardar aquí' : '—'}</button>
          </div>
        </div>
      `;
    }
    const date = new Date(save.timestamp).toLocaleString('es', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const thumbStyle = save.thumb ? `background-image:url('${save.thumb}')` : '';
    return `
      <div class="vn-save-slot" data-slot="${meta.slot}">
        <div class="vn-save-thumb" style="${thumbStyle}">
          ${save.preview ? `<div class="vn-save-thumb-text">${escape(save.preview)}</div>` : ''}
        </div>
        <div class="vn-save-info">
          <dt>slot</dt><dd>${meta.label}</dd>
          <dt>fecha</dt><dd>${date}</dd>
          <dt>cap</dt><dd>${escape(save.chapter || '')}</dd>
        </div>
        <div class="vn-save-actions">
          ${this.mode === 'save'
            ? `<button data-act="save"   data-slot="${meta.slot}">Sobrescribir</button>`
            : `<button data-act="load"   data-slot="${meta.slot}">Cargar</button>`}
          <button data-act="delete" data-slot="${meta.slot}" class="danger" title="Borrar">×</button>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    this.el.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      e.stopPropagation();
      if (btn.dataset.act === 'close') return this.close();
      if (btn.dataset.mode) {
        this.mode = btn.dataset.mode;
        this.el.innerHTML = this._render();
        this._bindEvents();
        return;
      }
      const slot = parseInt(btn.dataset.slot, 10);
      if (btn.dataset.act === 'save')   this.deps.onSave(slot)   && this.refresh();
      if (btn.dataset.act === 'load')   { this.close(); this.deps.onLoad(slot); }
      if (btn.dataset.act === 'delete') {
        if (confirm('¿Borrar este slot?')) {
          this.deps.onDelete(slot);
          this.refresh();
        }
      }
    });
  }

  refresh() {
    if (!this.el) return;
    this.el.innerHTML = this._render();
    this._bindEvents();
  }
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
