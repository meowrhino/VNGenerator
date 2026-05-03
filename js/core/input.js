/* core/input.js — Captura de input del lector y mapeo a acciones del engine.
 *
 * Ratón/táctil: click sobre el stage avanza al siguiente slide. Clicks dentro
 * de la UI (topbar, choices, menus) no avanzan (los maneja la propia UI).
 *
 * Teclado:
 *   Espacio / Enter / →     → next
 *   ← / Backspace            → prev
 *   Esc                      → toggleMenu
 *   L                        → backlog
 *   S                        → save panel
 *   Ctrl (mantenido)         → skip rápido
 *   A                        → toggle auto
 *   M                        → toggle mute
 *
 * El módulo es agnóstico: recibe un objeto `actions` con métodos llamables
 * y se desconecta con el método returneado. */

const STAGE_IGNORE_SELECTORS = [
  '.vn-topbar', '.vn-choices', '.vn-menu',
  '.vn-overlay', '.vn-end', '.vn-toast',
];

/**
 * @param {HTMLElement} root  el contenedor del lector
 * @param {Object} actions    { next, prev, menu, backlog, saves, skip, auto, mute }
 * @returns {() => void}      función de cleanup
 */
export function bindInput(root, actions) {
  const onPointer = (e) => {
    if (STAGE_IGNORE_SELECTORS.some(sel => e.target.closest(sel))) return;
    e.preventDefault();
    actions.next?.();
  };

  const onKey = (e) => {
    // Ignorar si hay un input/textarea con foco
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    switch (e.key) {
      case ' ':
      case 'Enter':
      case 'ArrowRight':
        e.preventDefault();
        actions.next?.();
        break;
      case 'ArrowLeft':
      case 'Backspace':
        e.preventDefault();
        actions.prev?.();
        break;
      case 'Escape':
        actions.menu?.();
        break;
      case 'l': case 'L':
        actions.backlog?.();
        break;
      case 's': case 'S':
        actions.saves?.();
        break;
      case 'a': case 'A':
        actions.auto?.();
        break;
      case 'm': case 'M':
        actions.mute?.();
        break;
    }
  };

  // Skip mientras se mantenga Ctrl
  let ctrlActive = false;
  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && !ctrlActive) {
      ctrlActive = true;
      actions.skipStart?.();
    }
  };
  const onKeyUp = (e) => {
    if (ctrlActive && !e.ctrlKey && !e.metaKey) {
      ctrlActive = false;
      actions.skipStop?.();
    }
  };

  root.addEventListener('click', onPointer);
  root.addEventListener('touchend', onPointer);
  document.addEventListener('keydown', onKey);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  return function unbind() {
    root.removeEventListener('click', onPointer);
    root.removeEventListener('touchend', onPointer);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  };
}
