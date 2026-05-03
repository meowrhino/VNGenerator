/* ui/backlog.js — Overlay con el historial de líneas leídas.
 *
 * Cada entrada muestra speaker + body. Si la entrada tenía una voz asociada,
 * aparece un botón ♪ para reproducirla. Click en cualquier parte fuera de un
 * botón cierra el overlay. */

export class BacklogView {
  /**
   * @param {HTMLElement} rootEl
   * @param {object} deps  { onPlayVoice }
   */
  constructor(rootEl, deps = {}) {
    this.rootEl = rootEl;
    this.deps = deps;
    this.el = null;
  }

  isOpen() { return !!this.el; }

  open(entries) {
    if (this.el) this.close();
    this.el = document.createElement('div');
    this.el.className = 'vn-overlay vn-backlog';
    this.el.innerHTML = `
      <div class="vn-overlay-head">
        <h2>Historial · ${entries.length} ${entries.length === 1 ? 'línea' : 'líneas'}</h2>
        <button class="vn-overlay-close" data-act="close" title="Cerrar (L)">×</button>
      </div>
      <div class="vn-overlay-body">
        ${entries.length
          ? entries.map((e, i) => entryHtml(e, i)).join('')
          : '<div class="vn-backlog-empty">Aún no has leído ninguna línea.</div>'}
      </div>
    `;
    this.rootEl.appendChild(this.el);
    this.el.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      ev.stopPropagation();
      const act = btn.dataset.act;
      if (act === 'close') this.close();
      else if (act === 'voice') {
        const i = parseInt(btn.dataset.idx, 10);
        const entry = entries[i];
        if (entry?.audio?.voice) this.deps.onPlayVoice?.(entry.audio.voice);
      }
    });
    // scroll al final (línea más reciente)
    requestAnimationFrame(() => {
      const body = this.el.querySelector('.vn-overlay-body');
      if (body) body.scrollTop = body.scrollHeight;
    });
  }

  close() {
    this.el?.remove();
    this.el = null;
  }
}

function entryHtml(entry, i) {
  const speaker = entry.speaker
    ? `<div class="vn-backlog-speaker">${escape(entry.speaker)}</div>`
    : `<div class="vn-backlog-speaker empty">·</div>`;
  const voiceBtn = entry.audio?.voice
    ? `<button data-act="voice" data-idx="${i}" title="Reproducir voz">♪</button>`
    : '';
  return `
    <div class="vn-backlog-entry">
      ${speaker}
      <div class="vn-backlog-text">${renderInline(entry.body)}</div>
      <div class="vn-backlog-actions">${voiceBtn}</div>
    </div>
  `;
}

/** Renderiza marcadores inline a HTML seguro:
 *   **bold**  → <strong>bold</strong>
 *   *italic*  → <em>italic</em>
 *   [c:#xxx]…[/c] → <span style="color:#xxx">…</span>
 *   [w:N]     → desaparece (no aplica fuera del typewriter)
 *   \\n       → <br>
 * Escapa el resto. */
function renderInline(s) {
  if (!s) return '';
  let str = String(s).replace(/\\n/g, '\n').replace(/\[w:\d+\]/g, '');
  // Escapar primero, luego reactivar tags por sustitución segura
  str = escape(str);
  // **bold**
  str = str.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // *italic*
  str = str.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // [c:#xxx]…[/c]
  str = str.replace(/\[c:([^\]]+)\](.*?)\[\/c\]/g, (_, color, body) =>
    `<span style="color:${color.replace(/[^#a-zA-Z0-9_,()\\s.%]/g, '')}">${body}</span>`
  );
  // saltos
  str = str.replace(/\n/g, '<br>');
  return str;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
