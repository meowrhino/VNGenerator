/* core/util.js — Utilidades genéricas usadas por varios módulos. */

/** Escapa caracteres HTML inseguros para inserción en innerHTML. */
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

/** Escapa para usar dentro de un atributo HTML (alias de escapeHtml). */
export function escapeAttr(s) { return escapeHtml(s); }

/** Asigna o borra una clave por path 'a.b.c'. Si val es '' o undefined, la borra. */
export function setPath(obj, path, val) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const lastKey = parts[parts.length - 1];
  if (val === '' || val === undefined) {
    delete cur[lastKey];
  } else {
    cur[lastKey] = val;
  }
}

/** Resuelve una clave por path 'a.b.c'. Devuelve undefined si algún tramo falta. */
export function getPath(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/** Promesa que resuelve tras `ms` milisegundos. */
export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Espera a que una WAAPI animation acabe.
 *
 * Captura AbortError (si la cancelan) y aplica un fallback de tiempo: si la
 * animation no progresa (típico cuando la pestaña pasa a background y
 * Chromium pausa el timeline) seguimos avanzando con setTimeout. Este
 * fallback se calcula con la duración nominal + un margen de 80ms.
 */
export function waitAnim(anim) {
  const dur = anim.effect?.getTiming?.().duration || 0;
  const fallbackMs = (typeof dur === 'number' ? dur : 0) + 80;
  return Promise.race([
    anim.finished.catch(() => {}),
    new Promise(r => setTimeout(r, fallbackMs)),
  ]);
}

/** Clona profundamente un objeto serializable a JSON. */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
