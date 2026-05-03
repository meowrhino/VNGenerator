/* generator/editors.js — Editor del slide actual.
 *
 * Dispatcher: si el slide es choice → renderChoiceEditor; si no → renderSlideEditor.
 *
 * El editor es REGENERADO cada vez que cambia el slide activo (no diff).
 * La complejidad de mantener bindings vivos no compensa para 200 inputs. */

import { state, activeSlide, touchSlide, on } from './state.js';
import { LAYER_NAMES } from '../core/layers.js';
import { TRANSITION_TYPES } from '../core/transitions.js';
import { setPath, escapeHtml, escapeAttr } from '../core/util.js';

export function mountEditor(el, deps) {
  const render = () => {
    const s = activeSlide();
    if (!s) {
      el.innerHTML = '<p class="empty">No hay slide seleccionado.</p>';
      return;
    }
    if (s.choice) {
      renderChoiceEditor(el, s);
    } else {
      renderSlideEditor(el, s);
    }
    deps?.onAfterRender?.();
  };
  render();
  on('slide', render);
  on('chapter', render);
}

/* ===== Editor de slide normal ===== */

function renderSlideEditor(el, s) {
  el.innerHTML = `
    <h3>Slide #${state.activeSlideIdx + 1}</h3>
    <label>ID <input data-slide="id" value="${escapeAttr(s.id || '')}"></label>

    <fieldset>
      <legend>Texto</legend>
      <label>Hablante <input data-slide="text.speaker" value="${escapeAttr(s.text?.speaker || '')}"></label>
      <label>Cuerpo (admite <code>**bold**</code>, <code>*italic*</code>, <code>[w:500]</code>, <code>[c:#79c0ff]color[/c]</code>)
        <textarea data-slide="text.body" rows="4">${escapeHtml(s.text?.body || '')}</textarea>
      </label>
    </fieldset>

    <fieldset>
      <legend>Capas</legend>
      ${LAYER_NAMES.map(n => layerRowHtml(s, n)).join('')}
    </fieldset>

    <fieldset>
      <legend>Transición</legend>
      ${transitionRowsHtml(s)}
    </fieldset>

    <fieldset>
      <legend>Movimiento (msp/amsp)</legend>
      ${motionRowsHtml(s)}
    </fieldset>

    <fieldset>
      <legend>Audio</legend>
      <label>BGM <input data-slide="audio.bgm" value="${escapeAttr(s.audio?.bgm || '')}" placeholder="vacío = no cambia"></label>
      <label>Voice <input data-slide="audio.voice" value="${escapeAttr(s.audio?.voice || '')}"></label>
      <label>SE <input data-slide="audio.se" value="${escapeAttr(s.audio?.se || '')}"></label>
    </fieldset>

    <fieldset>
      <legend>Variables (set/add/setFlag)</legend>
      <label>JSON
        <textarea data-slide-json="vars" rows="3" placeholder='{"set":{"x":1},"add":{"y":-1},"setFlag":"hablado_con_ana"}'>${escapeHtml(JSON.stringify(s.vars || {}, null, 0))}</textarea>
      </label>
    </fieldset>

    <fieldset>
      <legend>Salto / subrutinas</legend>
      <label>goto (id) <input data-slide="goto" value="${escapeAttr(s.goto || '')}" placeholder="vacío = avance lineal"></label>
      <label>gotoIf (condición) <input data-slide="gotoIf" value="${escapeAttr(s.gotoIf || '')}" placeholder='ej: "afinidad_ana >= 3"'></label>
      <label>Delay del goto (ms) <input type="number" data-slide="gotoDelay" value="${s.gotoDelay ?? ''}" placeholder="800"></label>
      <label>gosub (id) <input data-slide="gosub" value="${escapeAttr(s.gosub || '')}"></label>
      <label><input type="checkbox" data-slide-bool="return" ${s.return ? 'checked' : ''}> return (volver del gosub)</label>
    </fieldset>

    <fieldset>
      <legend>CG</legend>
      <label><input type="checkbox" data-slide-bool="tag-cg" ${s.tag === 'cg' ? 'checked' : ''}> Marcar como CG (aparece en galería)</label>
    </fieldset>
  `;
  bindSlideInputs(el, s);
}

function layerRowHtml(s, name) {
  const slot = s.layers?.[name];
  return `
    <div class="gen-layer-row">
      <strong>${name}</strong>
      <input data-layer-src="${name}" placeholder="archivo.webp" value="${escapeAttr(slot?.src || '')}">
      <input type="number" step="0.01" data-layer-x="${name}" placeholder="x" value="${slot?.x ?? ''}">
      <input type="number" step="0.01" data-layer-y="${name}" placeholder="y" value="${slot?.y ?? ''}">
      <input type="number" step="0.01" data-layer-scale="${name}" placeholder="sc" value="${slot?.scale ?? ''}">
    </div>
  `;
}

function transitionRowsHtml(s) {
  const tr = s.transition;
  const isPerLayer = tr && typeof tr === 'object' && tr.perLayer;
  const isObj = tr && typeof tr === 'object' && !isPerLayer;
  const isString = typeof tr === 'string';
  const mode = tr === null ? 'null'
              : tr === undefined ? 'default'
              : isPerLayer ? 'perLayer'
              : isObj ? 'global'
              : isString ? 'global' : 'default';

  let html = `
    <label>Modo
      <select data-tr-mode>
        <option value="default" ${mode === 'default' ? 'selected' : ''}>default (del capítulo)</option>
        <option value="null" ${mode === 'null' ? 'selected' : ''}>null (sin transición)</option>
        <option value="global" ${mode === 'global' ? 'selected' : ''}>global (un tipo)</option>
        <option value="perLayer" ${mode === 'perLayer' ? 'selected' : ''}>perLayer (por capa)</option>
      </select>
    </label>
  `;
  if (mode === 'global') {
    const type = isObj ? tr.type : tr;
    const dur = isObj ? (tr.duration ?? 400) : 400;
    html += `
      <label>Tipo <select data-tr-global-type>
        ${TRANSITION_TYPES.map(t => `<option value="${t}" ${t === type ? 'selected' : ''}>${t}</option>`).join('')}
      </select></label>
      <label>Duración (ms) <input type="number" data-tr-duration value="${dur}"></label>
    `;
  } else if (mode === 'perLayer') {
    html += LAYER_NAMES.map(n => {
      const sub = tr.perLayer?.[n];
      const subType = sub ? sub.type : 'fade';
      const subDur = sub ? (sub.duration ?? 400) : 400;
      const enabled = !!sub;
      return `
        <div class="gen-trlayer-row">
          <label><input type="checkbox" data-tr-layer-enabled="${n}" ${enabled ? 'checked' : ''}> ${n}</label>
          <select data-tr-layer-type="${n}" ${!enabled ? 'disabled' : ''}>
            ${TRANSITION_TYPES.map(t => `<option value="${t}" ${t === subType ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <input type="number" data-tr-layer-dur="${n}" value="${subDur}" ${!enabled ? 'disabled' : ''}>
        </div>
      `;
    }).join('');
  }
  return html;
}

function motionRowsHtml(s) {
  const m = s.motion || {};
  return LAYER_NAMES.map(n => {
    const lm = m[n];
    const hasMove = !!lm;
    const to = lm?.to || {};
    return `
      <div class="gen-trlayer-row">
        <label><input type="checkbox" data-mo-enabled="${n}" ${hasMove ? 'checked' : ''}> ${n} →</label>
        <span class="dim mono" style="font-size:10px;">
          x:<input type="number" step="0.01" data-mo-x="${n}" value="${to.x ?? ''}" placeholder="x" style="width:50px;display:inline-block;" ${!hasMove ? 'disabled' : ''}>
          y:<input type="number" step="0.01" data-mo-y="${n}" value="${to.y ?? ''}" placeholder="y" style="width:50px;display:inline-block;" ${!hasMove ? 'disabled' : ''}>
          sc:<input type="number" step="0.01" data-mo-sc="${n}" value="${to.scale ?? ''}" placeholder="1" style="width:50px;display:inline-block;" ${!hasMove ? 'disabled' : ''}>
        </span>
        <input type="number" data-mo-dur="${n}" value="${lm?.duration ?? 500}" ${!hasMove ? 'disabled' : ''}>
      </div>
    `;
  }).join('');
}

/* ===== Editor de choice ===== */

function renderChoiceEditor(el, s) {
  el.innerHTML = `
    <h3>Slide de elección #${state.activeSlideIdx + 1}</h3>
    <label>ID <input data-slide="id" value="${escapeAttr(s.id || '')}"></label>
    <label>Pregunta <input data-choice="prompt" value="${escapeAttr(s.choice?.prompt || '')}"></label>
    <fieldset>
      <legend>Opciones</legend>
      ${(s.choice?.options || []).map((o, i) => `
        <div class="gen-option-row" style="grid-template-columns:1fr 1fr 1fr 30px;">
          <input data-opt-label="${i}" placeholder="Etiqueta" value="${escapeAttr(o.label || '')}">
          <input data-opt-next="${i}"  placeholder="ID destino" value="${escapeAttr(o.next || '')}">
          <input data-opt-cond="${i}"  placeholder="condition (vacío = siempre)" value="${escapeAttr(o.condition || '')}">
          <button data-opt-del="${i}" class="danger">×</button>
        </div>
      `).join('')}
      <button id="btn-add-option">+ añadir opción</button>
    </fieldset>
  `;
  bindChoiceInputs(el, s);
}

/* ===== Bind inputs (slide normal) ===== */

function bindSlideInputs(el, s) {
  el.querySelectorAll('[data-slide]').forEach(inp => {
    inp.addEventListener('input', e => {
      const path = e.target.dataset.slide;
      let val = e.target.value;
      if (e.target.type === 'number') val = val === '' ? undefined : parseFloat(val);
      if (val === '' && path !== 'text.body') val = undefined;
      setPath(s, path, val);
      touchSlide();
    });
  });

  el.querySelectorAll('[data-slide-bool]').forEach(inp => {
    inp.addEventListener('change', e => {
      const key = e.target.dataset.slideBool;
      if (key === 'return') s.return = e.target.checked || undefined;
      if (key === 'tag-cg') {
        if (e.target.checked) s.tag = 'cg';
        else if (s.tag === 'cg') delete s.tag;
      }
      touchSlide();
    });
  });

  el.querySelectorAll('[data-slide-json]').forEach(inp => {
    inp.addEventListener('input', e => {
      try {
        s[e.target.dataset.slideJson] = JSON.parse(e.target.value || '{}');
        e.target.style.borderColor = '';
      } catch {
        e.target.style.borderColor = 'var(--danger)';
      }
    });
  });

  // Capas
  ['src', 'x', 'y', 'scale'].forEach(prop => {
    el.querySelectorAll(`[data-layer-${prop}]`).forEach(inp => {
      inp.addEventListener('input', e => {
        const name = e.target.dataset[`layer${prop[0].toUpperCase()}${prop.slice(1)}`];
        const raw = e.target.value;
        const val = (prop === 'src') ? raw
                  : (raw === '' ? undefined : parseFloat(raw));
        updateLayer(s, name, prop, val);
        touchSlide();
      });
    });
  });

  // Motion
  el.querySelectorAll('[data-mo-enabled]').forEach(inp => {
    inp.addEventListener('change', e => {
      const n = e.target.dataset.moEnabled;
      if (!s.motion) s.motion = {};
      if (e.target.checked) s.motion[n] = { to: {}, duration: 500 };
      else delete s.motion[n];
      if (Object.keys(s.motion).length === 0) delete s.motion;
      touchSlide();
    });
  });
  ['x', 'y', 'sc'].forEach(p => {
    el.querySelectorAll(`[data-mo-${p}]`).forEach(inp => {
      inp.addEventListener('input', e => {
        const n = e.target.dataset[`mo${p[0].toUpperCase()}${p.slice(1)}`];
        const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
        if (!s.motion?.[n]) return;
        const key = (p === 'sc') ? 'scale' : p;
        if (v === undefined) delete s.motion[n].to[key];
        else s.motion[n].to[key] = v;
      });
    });
  });
  el.querySelectorAll('[data-mo-dur]').forEach(inp => {
    inp.addEventListener('input', e => {
      const n = e.target.dataset.moDur;
      if (!s.motion?.[n]) return;
      s.motion[n].duration = parseInt(e.target.value, 10) || 500;
    });
  });

  // Transiciones
  bindTransitionInputs(el, s);
}

function bindTransitionInputs(el, s) {
  const trMode = el.querySelector('[data-tr-mode]');
  if (trMode) {
    trMode.addEventListener('change', e => {
      const m = e.target.value;
      if (m === 'default')        s.transition = 'default';
      else if (m === 'null')      s.transition = null;
      else if (m === 'global')    s.transition = { type: 'fade', duration: 400 };
      else if (m === 'perLayer')  s.transition = { perLayer: {} };
      touchSlide();
    });
  }
  const trGlobalType = el.querySelector('[data-tr-global-type]');
  if (trGlobalType) {
    trGlobalType.addEventListener('change', e => {
      if (typeof s.transition !== 'object' || !s.transition || s.transition.perLayer) {
        s.transition = { type: e.target.value, duration: 400 };
      } else {
        s.transition.type = e.target.value;
      }
      touchSlide();
    });
  }
  const trDur = el.querySelector('[data-tr-duration]');
  if (trDur) {
    trDur.addEventListener('input', e => {
      if (typeof s.transition === 'object' && s.transition && !s.transition.perLayer) {
        s.transition.duration = parseInt(e.target.value, 10) || 400;
      }
    });
  }
  el.querySelectorAll('[data-tr-layer-enabled]').forEach(inp => {
    inp.addEventListener('change', e => {
      const n = e.target.dataset.trLayerEnabled;
      if (!s.transition || !s.transition.perLayer) s.transition = { perLayer: {} };
      if (e.target.checked) s.transition.perLayer[n] = { type: 'fade', duration: 400 };
      else delete s.transition.perLayer[n];
      touchSlide();
    });
  });
  el.querySelectorAll('[data-tr-layer-type]').forEach(sel => {
    sel.addEventListener('change', e => {
      const n = e.target.dataset.trLayerType;
      if (s.transition?.perLayer?.[n]) s.transition.perLayer[n].type = e.target.value;
    });
  });
  el.querySelectorAll('[data-tr-layer-dur]').forEach(inp => {
    inp.addEventListener('input', e => {
      const n = e.target.dataset.trLayerDur;
      if (s.transition?.perLayer?.[n]) s.transition.perLayer[n].duration = parseInt(e.target.value, 10) || 400;
    });
  });
}

function bindChoiceInputs(el, s) {
  el.querySelectorAll('[data-slide]').forEach(inp => {
    inp.addEventListener('input', e => {
      setPath(s, e.target.dataset.slide, e.target.value);
      touchSlide();
    });
  });
  el.querySelectorAll('[data-choice]').forEach(inp => {
    inp.addEventListener('input', e => {
      if (!s.choice) s.choice = { options: [] };
      s.choice[e.target.dataset.choice] = e.target.value;
    });
  });
  el.querySelectorAll('[data-opt-label]').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = parseInt(e.target.dataset.optLabel, 10);
      s.choice.options[i].label = e.target.value;
    });
  });
  el.querySelectorAll('[data-opt-next]').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = parseInt(e.target.dataset.optNext, 10);
      s.choice.options[i].next = e.target.value;
    });
  });
  el.querySelectorAll('[data-opt-cond]').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = parseInt(e.target.dataset.optCond, 10);
      const v = e.target.value.trim();
      if (v) s.choice.options[i].condition = v;
      else delete s.choice.options[i].condition;
    });
  });
  el.querySelectorAll('[data-opt-del]').forEach(btn => {
    btn.addEventListener('click', e => {
      const i = parseInt(e.target.dataset.optDel, 10);
      s.choice.options.splice(i, 1);
      touchSlide();
    });
  });
  const addBtn = el.querySelector('#btn-add-option');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (!s.choice) s.choice = { options: [] };
      s.choice.options.push({ label: 'Nueva opción', next: '' });
      touchSlide();
    });
  }
}

function updateLayer(slide, name, key, val) {
  if (!slide.layers) slide.layers = {};
  if (val === '' || val === undefined || val === null) {
    if (slide.layers[name]) {
      delete slide.layers[name][key];
      if (Object.keys(slide.layers[name]).length === 0) slide.layers[name] = null;
    }
  } else {
    if (!slide.layers[name]) slide.layers[name] = {};
    slide.layers[name][key] = val;
  }
}
