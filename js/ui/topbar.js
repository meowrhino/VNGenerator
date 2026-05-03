/* ui/topbar.js — Barra superior del lector con título y atajos.
 *
 * Botones y atajos asociados:
 *   ←       prev
 *   Auto    toggle auto
 *   Skip    skip rápido (también con Ctrl mantenido)
 *   Log     backlog
 *   Save    save panel
 *   ☰       menú
 *
 * No mantiene estado propio: las acciones se delegan al engine vía actions. */

export class Topbar {
  /**
   * @param {HTMLElement} rootEl
   * @param {Object} actions  { prev, auto, skip, backlog, saves, menu }
   */
  constructor(rootEl, actions) {
    this.actions = actions;
    this.el = document.createElement('div');
    this.el.className = 'vn-topbar';
    this.el.innerHTML = `
      <button class="vn-btn" data-act="prev"   title="Anterior (←)">←</button>
      <span class="vn-title"></span>
      <button class="vn-btn" data-act="auto"   title="Auto-avance (A)">Auto</button>
      <button class="vn-btn" data-act="skip"   title="Skip (Ctrl)">Skip</button>
      <button class="vn-btn" data-act="backlog" title="Historial (L)">Log</button>
      <button class="vn-btn" data-act="saves"  title="Guardar/Cargar (S)">Save</button>
      <button class="vn-btn" data-act="menu"   title="Menú (Esc)">☰</button>
    `;
    rootEl.appendChild(this.el);
    this.titleEl = this.el.querySelector('.vn-title');
    this.el.addEventListener('click', (e) => {
      const act = e.target?.dataset?.act;
      if (act && this.actions[act]) this.actions[act]();
    });
  }

  setTitle(s) { this.titleEl.textContent = s || ''; }

  /** Marca/desmarca el botón Auto como activo. */
  setAuto(on) {
    this.el.querySelector('[data-act="auto"]')?.classList.toggle('active', !!on);
  }
}
