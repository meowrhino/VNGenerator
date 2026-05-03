/* pages/gallery.js — Página biblioteca (index.html).
 *
 * Renderiza el manifest como una lista tipográfica (estilo arXiv / GitHub
 * repos), no un grid de cards. Cada VN es una fila con thumbnail pequeño,
 * título, autor, descripción, tags y un contador de slides (si lo cargamos).
 *
 * Mantiene la lógica simple: fetch del manifest, render. Sin frameworks. */

import { loadManifest } from '../data/loader.js';
import { escapeHtml } from '../core/util.js';

const root = document.getElementById('gallery-root');

(async function main() {
  try {
    const manifest = await loadManifest('./manifest.json');
    render(manifest);
  } catch (err) {
    root.innerHTML = `
      <div class="error">
        <h2>No se pudo cargar la biblioteca</h2>
        <p>${escapeHtml(err.message)}</p>
        <p>Asegúrate de servir el sitio con un servidor HTTP (no <code>file://</code>).</p>
      </div>`;
  }
})();

function render(manifest) {
  const vns = manifest.vns || [];
  root.innerHTML = `
    <header class="g-head">
      <div>
        <h1>${escapeHtml(manifest.title || 'VNGenerator')}</h1>
        <p class="g-subtitle">${escapeHtml(manifest.description || '')}</p>
      </div>
      <nav>
        <a href="./generator.html" class="primary">+ Nuevo capítulo</a>
        <a href="./generator.html?load">↑ Importar JSON</a>
      </nav>
    </header>

    <div class="g-meta-bar">
      <div class="g-count"><strong>${vns.length}</strong> ${vns.length === 1 ? 'capítulo' : 'capítulos'}</div>
      <div class="g-sort">vanilla · sin frameworks · ES modules</div>
    </div>

    <ul class="g-list" id="g-list" role="list" style="list-style:none; padding:0; margin:0;">
      ${vns.length ? vns.map(rowHtml).join('') : '<li class="g-empty">No hay capítulos en el manifest todavía.</li>'}
    </ul>

    <footer class="g-foot">
      VNGenerator · <a href="https://github.com" target="_blank" rel="noopener">vanilla web</a> · sin build step
    </footer>
  `;
}

function rowHtml(vn) {
  const href = `./reader.html?vn=${encodeURIComponent(vn.path)}`;
  const initial = (vn.title || '?').slice(0, 1).toUpperCase();
  const cover = vn.cover
    ? `style="background-image:url('${vn.cover}')"`
    : '';
  const placeholder = vn.cover ? '' : `<div class="g-thumb-placeholder">${escapeHtml(initial)}</div>`;
  const tags = (vn.tags || []).map(t => `<span class="badge">${escapeHtml(t)}</span>`).join('');
  const slug = vn.path.split('/').slice(-2, -1)[0] || '';

  return `
    <li>
      <a class="g-row" href="${href}">
        <div class="g-thumb" ${cover}>${placeholder}</div>
        <div class="g-info">
          <h2>${escapeHtml(vn.title || 'Sin título')}</h2>
          <div class="g-info-line">
            ${vn.author ? `<span class="g-author">${escapeHtml(vn.author)}</span>` : ''}
            <span class="g-id">id: ${escapeHtml(slug)}</span>
          </div>
          <p>${escapeHtml(vn.description || '')}</p>
          ${tags ? `<div class="g-tags">${tags}</div>` : ''}
        </div>
        <div class="g-side">
          <div class="g-stat">leer <strong>›</strong></div>
        </div>
      </a>
    </li>
  `;
}
