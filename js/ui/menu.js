/* ui/menu.js — Menú principal del lector (pausa).
 *
 * Aparece centrado sobre el stage al pulsar Esc o el botón ☰. Bloquea la
 * lectura debajo. Los items son una lista declarativa para añadir/quitar
 * fácil. */

export class Menu {
  constructor(rootEl, items) {
    this.rootEl = rootEl;
    this.items = items;     // [{label, action, kbd?}]
    this.el = null;
  }

  isOpen() { return !!this.el; }

  toggle() {
    if (this.el) this.close();
    else this.open();
  }

  open() {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.className = 'vn-menu';
    this.el.innerHTML = `
      <h2>Menú</h2>
      ${this.items.map((it, i) => `
        <button data-idx="${i}">
          ${it.label}
          ${it.kbd ? `<span class="kbd-hint">${it.kbd}</span>` : ''}
        </button>
      `).join('')}
    `;
    this.rootEl.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = e.target?.closest('button')?.dataset?.idx;
      if (idx == null) return;
      const item = this.items[parseInt(idx, 10)];
      if (item) item.action();
    });
  }

  close() {
    this.el?.remove();
    this.el = null;
  }
}
