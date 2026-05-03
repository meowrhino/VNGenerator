/* state/history.js — Historial de líneas leídas (backlog).
 *
 * Cada vez que el engine pasa por un slide con texto, registramos una entrada:
 *   { speaker, body, slideIdx, audio }
 *
 * El engine puede reproducir voz desde una entrada del backlog usando audio.voice.
 * El límite por defecto es 200 entradas (se descarta el inicio si crece más). */

const DEFAULT_LIMIT = 200;

export class TextHistory {
  constructor(limit = DEFAULT_LIMIT) {
    this.limit = limit;
    /** @type {Array<{speaker?:string, body:string, slideIdx:number, audio?:object}>} */
    this.entries = [];
  }

  push(entry) {
    if (!entry || !entry.body) return;
    this.entries.push(entry);
    if (this.entries.length > this.limit) {
      this.entries.splice(0, this.entries.length - this.limit);
    }
  }

  clear() { this.entries.length = 0; }
  all() { return this.entries.slice(); }
  get length() { return this.entries.length; }
  snapshot() { return this.entries.slice(); }
  restore(snap) { this.entries = (snap || []).slice(); }
}
