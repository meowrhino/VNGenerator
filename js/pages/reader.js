/* pages/reader.js — Entry point del lector (reader.html).
 *
 * Lee el parámetro ?vn=path/a/chapter.json, carga el JSON y arranca el engine. */

import { Engine } from '../core/engine.js';
import { loadChapter } from '../data/loader.js';

const root = document.getElementById('vn-root');

(async function main() {
  const params = new URLSearchParams(location.search);
  const path = params.get('vn');

  if (!path) {
    root.innerHTML = `
      <div class="error">
        <h2>Falta el parámetro <code>?vn=</code></h2>
        <p><a href="./index.html">Volver a la biblioteca</a></p>
      </div>`;
    return;
  }

  try {
    const chapter = await loadChapter(path);
    if (chapter.theme) root.dataset.theme = chapter.theme;   // skin opcional (p.ej. "umineko")
    const engine = new Engine(root);
    window.engine = engine; // handle de depuración (jump a slides, inspección)
    await engine.play(chapter);
  } catch (err) {
    root.innerHTML = `
      <div class="error">
        <h2>Error cargando capítulo</h2>
        <p>${err.message}</p>
        <p><a href="./index.html">Volver</a></p>
      </div>`;
    console.error(err);
  }
})();
