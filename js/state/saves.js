/* state/saves.js — Guardado/carga de partidas en localStorage.
 *
 * Estructura de un save:
 *   {
 *     v: 1,                      // schema version, para futuros migrations
 *     chapter: "demo-cap-01",
 *     timestamp: 1714745234234,
 *     idx: 12,
 *     history: [0, 5, 11],
 *     callStack: [],
 *     vars: { afinidad_ana: 3 },
 *     log: [{speaker, body, slideIdx}],   // backlog comprimido
 *     thumb: "data:image/png;base64,…"    // captura del momento
 *     preview: "Ana: Hola...",            // texto último para listar
 *   }
 *
 * Slot keys en localStorage:  vng:save:<chapter>:<slot>
 *   slot 0    → autosave
 *   slot -1   → quicksave
 *   slot N>0  → manuales numerados */

const PREFIX = 'vng:save:';
const CG_PREFIX = 'vng:cg:';

export class SaveStore {
  constructor(chapterId) {
    this.chapter = chapterId;
  }

  _key(slot) { return `${PREFIX}${this.chapter}:${slot}`; }

  /** Lista todos los slots existentes ordenados por timestamp desc. */
  list() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith(`${PREFIX}${this.chapter}:`)) continue;
      try {
        const data = JSON.parse(localStorage.getItem(k));
        const slot = parseInt(k.split(':').pop(), 10);
        out.push({ slot, ...data });
      } catch { /* ignorar slot corrupto */ }
    }
    out.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return out;
  }

  read(slot) {
    const raw = localStorage.getItem(this._key(slot));
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  write(slot, data) {
    const payload = { v: 1, chapter: this.chapter, timestamp: Date.now(), ...data };
    localStorage.setItem(this._key(slot), JSON.stringify(payload));
    return payload;
  }

  delete(slot) {
    localStorage.removeItem(this._key(slot));
  }

  /** Limpia todos los saves de este capítulo. */
  clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(`${PREFIX}${this.chapter}:`)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }
}

/** Marca CGs como vistas. Usado por el engine al pasar slides con tag:"cg". */
export const CGTracker = {
  unlock(chapterId, src) {
    const key = `${CG_PREFIX}${chapterId}`;
    const set = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    if (set.has(src)) return false;
    set.add(src);
    localStorage.setItem(key, JSON.stringify([...set]));
    return true;
  },

  unlocked(chapterId) {
    const key = `${CG_PREFIX}${chapterId}`;
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  },

  clear(chapterId) {
    localStorage.removeItem(`${CG_PREFIX}${chapterId}`);
  },
};
