/* ui/toast.js — Notificación flotante temporal en el lector. */

export class Toast {
  constructor(rootEl) {
    this.el = document.createElement('div');
    this.el.className = 'vn-toast';
    rootEl.appendChild(this.el);
    this._t = null;
  }

  show(msg, ms = 1800) {
    this.el.textContent = msg;
    this.el.classList.add('show');
    clearTimeout(this._t);
    this._t = setTimeout(() => this.el.classList.remove('show'), ms);
  }
}
