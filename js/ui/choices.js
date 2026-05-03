/* ui/choices.js — Pantalla de opciones (slide.choice).
 *
 * Cada opción puede tener una `condition` (string evaluable contra vars). Las
 * que no cumplen se muestran deshabilitadas (no disponibles), no se ocultan,
 * para que el jugador entienda que existe una rama bloqueada. */

export class Choices {
  /** @param {(opt: any) => void} onPick callback al elegir una opción */
  constructor(rootEl, onPick) {
    this.onPick = onPick;
    this.el = document.createElement('div');
    this.el.className = 'vn-choices vn-hidden';
    rootEl.appendChild(this.el);
  }

  /**
   * Muestra una pantalla de elecciones.
   * @param {Object} choice  { prompt?: string, options: [{label, next, condition?}] }
   * @param {(cond:string)=>boolean} evalCondition  función para evaluar condiciones
   */
  show(choice, evalCondition = () => true) {
    this.el.innerHTML = '';
    if (choice.prompt) {
      const p = document.createElement('div');
      p.className = 'vn-choice-prompt';
      p.textContent = choice.prompt;
      this.el.appendChild(p);
    }
    choice.options.forEach((opt) => {
      const enabled = !opt.condition || evalCondition(opt.condition);
      const btn = document.createElement('button');
      btn.className = 'vn-choice';
      btn.textContent = opt.label;
      btn.disabled = !enabled;
      if (!enabled && opt.lockedLabel) btn.textContent = opt.lockedLabel;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!enabled) return;
        this.hide();
        this.onPick(opt);
      });
      this.el.appendChild(btn);
    });
    this.el.classList.remove('vn-hidden');
  }

  hide() {
    this.el.innerHTML = '';
    this.el.classList.add('vn-hidden');
  }
}
