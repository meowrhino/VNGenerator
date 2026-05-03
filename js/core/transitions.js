// transitions.js — Catálogo de transiciones inspiradas en NScripter
//
// Cada transición es una función async que recibe (layers, prevSlide, curSlide, opts)
// y resuelve cuando termina la animación.
//
// Tipos disponibles:
//   - instant      (= NScripter effect 1)
//   - fade         (= effect 10, fade vía negro)
//   - fadeWhite    (= effect 11, fade vía blanco)
//   - crossfade    (= effect 2/3)
//   - wipe-left, wipe-right, wipe-up, wipe-down  (= effects 4-7)
//   - dissolve     (mask-image custom)
//   - pixelate     (= effects 8/9)
//   - iris-in, iris-out
//   - slide-in (from: left/right/up/down)
//   - blinds
//   - shake (no-op visual entre slides, sólo "vpunch")
//
// Si tr.perLayer existe, aplicamos transición por capa individualmente.
// Si no, aplicamos transición global a todo el stage.

import { LAYER_NAMES } from './layers.js';
import { waitAnim } from './util.js';

// ===== Helpers =====
//
// waitAnim(anim) — espera el .finished de una WAAPI animation, capturando
//   AbortError. Está en core/util.js para reutilizarse.

function animateOpacity(el, from, to, duration, easing = 'ease') {
  return el.animate(
    [{ opacity: from }, { opacity: to }],
    { duration, easing, fill: 'forwards' }
  );
}

function animateMask(el, fromMask, toMask, duration) {
  return el.animate(
    [{ webkitMaskImage: fromMask, maskImage: fromMask },
     { webkitMaskImage: toMask, maskImage: toMask }],
    { duration, easing: 'ease', fill: 'forwards' }
  );
}

// Asegura que un elemento aplica los slots de prev/cur en su capa
function applySlot(layers, name, slot) {
  return layers.setLayer(name, slot, { startHidden: true });
}

function getSlotsForSlide(slide) {
  const layers = slide?.layers || {};
  const out = {};
  LAYER_NAMES.forEach(n => { out[n] = layers[n] || null; });
  return out;
}

// Detecta qué capas cambiaron entre prev y cur
function diffLayers(prev, cur) {
  const a = getSlotsForSlide(prev);
  const b = getSlotsForSlide(cur);
  const changed = [];
  LAYER_NAMES.forEach(n => {
    const sa = a[n], sb = b[n];
    const same = (sa?.src === sb?.src) && (sa?.x === sb?.x) && (sa?.y === sb?.y);
    if (!same) changed.push(n);
  });
  return { changed, prev: a, cur: b };
}

// ===== Transiciones individuales (operan sobre un único elemento) =====

const PER_LAYER_TR = {
  instant: async (oldImg, newImg) => {
    if (oldImg) oldImg.remove();
    if (newImg) newImg.style.opacity = '1';
  },

  fade: async (oldImg, newImg, opts) => {
    const ms = opts.duration ?? 400;
    const tasks = [];
    if (oldImg) tasks.push(waitAnim(animateOpacity(oldImg, 1, 0, ms)));
    if (newImg) tasks.push(waitAnim(animateOpacity(newImg, 0, 1, ms)));
    await Promise.all(tasks);
    if (oldImg) oldImg.remove();
  },

  crossfade: async (oldImg, newImg, opts) => {
    // Idéntico a fade pero más rápido por defecto
    return PER_LAYER_TR.fade(oldImg, newImg, { duration: opts.duration ?? 300 });
  },

  'slide-in': async (oldImg, newImg, opts) => {
    const ms = opts.duration ?? 500;
    const from = opts.from || 'right';
    const map = {
      left:  { x: '-100%', y: '0' },
      right: { x: '100%',  y: '0' },
      up:    { x: '0',     y: '-100%' },
      down:  { x: '0',     y: '100%' },
    };
    const off = map[from] || map.right;
    const tasks = [];
    if (newImg) {
      newImg.style.opacity = '1';
      const a = newImg.animate(
        [{ transform: `translate(${off.x}, ${off.y})` }, { transform: 'translate(0,0)' }],
        { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
      );
      tasks.push(waitAnim(a));
    }
    if (oldImg) {
      const a = oldImg.animate(
        [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${off.x === '0' ? '0' : (off.x.startsWith('-') ? '100%' : '-100%')}, ${off.y === '0' ? '0' : (off.y.startsWith('-') ? '100%' : '-100%')})`, opacity: 0 }],
        { duration: ms, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }
      );
      tasks.push(waitAnim(a));
    }
    await Promise.all(tasks);
    if (oldImg) oldImg.remove();
  },

  'wipe-left': async (oldImg, newImg, opts) => wipe(oldImg, newImg, opts, 'right'),
  'wipe-right': async (oldImg, newImg, opts) => wipe(oldImg, newImg, opts, 'left'),
  'wipe-up': async (oldImg, newImg, opts) => wipe(oldImg, newImg, opts, 'bottom'),
  'wipe-down': async (oldImg, newImg, opts) => wipe(oldImg, newImg, opts, 'top'),

  dissolve: async (oldImg, newImg, opts) => {
    const ms = opts.duration ?? 700;
    if (newImg) {
      newImg.style.opacity = '1';
      // Mask que va de "todo transparente" a "todo opaco" con textura de ruido
      // Usamos un radial-gradient para simular el efecto sin necesidad de PNG externo,
      // pero si hay opts.mask, usamos esa imagen.
      const useNoise = opts.mask === 'noise' || !opts.mask;
      if (useNoise) {
        // Gradiente radial animado simula dissolve aceptable
        const a = newImg.animate(
          [{ clipPath: 'circle(0% at 50% 50%)' },
           { clipPath: 'circle(150% at 50% 50%)' }],
          { duration: ms, easing: 'ease-out', fill: 'forwards' }
        );
        await waitAnim(a);
      } else {
        // Máscara de imagen real
        const url = `url(${opts.mask})`;
        newImg.style.webkitMaskImage = url;
        newImg.style.maskImage = url;
        const a = newImg.animate(
          [{ webkitMaskSize: '300% 300%', maskSize: '300% 300%' },
           { webkitMaskSize: '100% 100%', maskSize: '100% 100%' }],
          { duration: ms, easing: 'ease', fill: 'forwards' }
        );
        await waitAnim(a);
      }
    }
    if (oldImg) {
      await waitAnim(animateOpacity(oldImg, 1, 0, ms));
      oldImg.remove();
    }
  },

  pixelate: async (oldImg, newImg, opts) => {
    const ms = opts.duration ?? 600;
    const half = ms / 2;
    const tasks = [];
    if (oldImg) {
      const a = oldImg.animate(
        [{ filter: 'blur(0) contrast(1)' },
         { filter: 'blur(20px) contrast(0.8)', opacity: 0 }],
        { duration: half, fill: 'forwards' }
      );
      tasks.push(waitAnim(a).then(() => oldImg.remove()));
    }
    if (newImg) {
      newImg.style.opacity = '1';
      newImg.style.filter = 'blur(20px)';
      const a = newImg.animate(
        [{ filter: 'blur(20px)', offset: 0 },
         { filter: 'blur(20px)', offset: 0.5 },
         { filter: 'blur(0)', offset: 1 }],
        { duration: ms, fill: 'forwards' }
      );
      tasks.push(waitAnim(a));
    }
    await Promise.all(tasks);
  },

  'iris-in': async (oldImg, newImg, opts) => {
    const ms = opts.duration ?? 700;
    if (newImg) {
      newImg.style.opacity = '1';
      const a = newImg.animate(
        [{ clipPath: 'circle(0% at 50% 50%)' },
         { clipPath: 'circle(75% at 50% 50%)' }],
        { duration: ms, easing: 'ease-out', fill: 'forwards' }
      );
      await waitAnim(a);
    }
    if (oldImg) oldImg.remove();
  },

  'iris-out': async (oldImg, newImg, opts) => {
    const ms = opts.duration ?? 700;
    if (oldImg) {
      const a = oldImg.animate(
        [{ clipPath: 'circle(75% at 50% 50%)' },
         { clipPath: 'circle(0% at 50% 50%)' }],
        { duration: ms, easing: 'ease-in', fill: 'forwards' }
      );
      await waitAnim(a);
      oldImg.remove();
    }
    if (newImg) newImg.style.opacity = '1';
  },

  blinds: async (oldImg, newImg, opts) => {
    const ms = opts.duration ?? 600;
    if (newImg) {
      newImg.style.opacity = '1';
      const a = newImg.animate(
        [{ webkitMaskImage: 'repeating-linear-gradient(to bottom, #000 0%, #000 0%, transparent 0%, transparent 10%)',
           maskImage: 'repeating-linear-gradient(to bottom, #000 0%, #000 0%, transparent 0%, transparent 10%)' },
         { webkitMaskImage: 'repeating-linear-gradient(to bottom, #000 0%, #000 10%, transparent 10%, transparent 10%)',
           maskImage: 'repeating-linear-gradient(to bottom, #000 0%, #000 10%, transparent 10%, transparent 10%)' }],
        { duration: ms, fill: 'forwards' }
      );
      // Truco simple: solo un fade ya que la animación de mask con %s repetidos
      // no es interpolable de forma fiable cross-browser.
      await waitAnim(animateOpacity(newImg, 0, 1, ms));
    }
    if (oldImg) {
      await waitAnim(animateOpacity(oldImg, 1, 0, ms));
      oldImg.remove();
    }
  },
};

// Wipe genérico — direction = 'left' | 'right' | 'top' | 'bottom' (de qué lado se descubre)
async function wipe(oldImg, newImg, opts, direction) {
  const ms = opts.duration ?? 600;
  const dirMap = {
    left:   ['inset(0 100% 0 0)', 'inset(0 0 0 0)'],
    right:  ['inset(0 0 0 100%)', 'inset(0 0 0 0)'],
    top:    ['inset(100% 0 0 0)', 'inset(0 0 0 0)'],
    bottom: ['inset(0 0 100% 0)', 'inset(0 0 0 0)'],
  };
  const [from, to] = dirMap[direction] || dirMap.left;
  if (newImg) {
    newImg.style.opacity = '1';
    const a = newImg.animate(
      [{ clipPath: from }, { clipPath: to }],
      { duration: ms, easing: 'ease', fill: 'forwards' }
    );
    await waitAnim(a);
  }
  if (oldImg) oldImg.remove();
}

// ===== Transiciones globales (efecto sobre toda la pantalla) =====

const GLOBAL_TR = {
  instant: async (layers, prev, cur) => {
    LAYER_NAMES.forEach(n => {
      const slot = cur?.layers?.[n];
      const { oldImg } = layers.setLayer(n, slot);
      if (oldImg) oldImg.remove();
      const newImg = layers.getImg(n);
      if (newImg) newImg.style.opacity = '1';
    });
  },

  fade: async (layers, prev, cur, opts) => {
    const ms = opts.duration ?? 400;
    // Black overlay
    await fadeViaColor(layers, prev, cur, ms, '#000');
  },

  fadeWhite: async (layers, prev, cur, opts) => {
    const ms = opts.duration ?? 400;
    await fadeViaColor(layers, prev, cur, ms, '#fff');
  },

  crossfade: async (layers, prev, cur, opts) => {
    const ms = opts.duration ?? 500;
    // Aplicar crossfade a cada capa que cambió
    const { changed } = diffLayers(prev, cur);
    const tasks = changed.map(name => {
      const slot = cur?.layers?.[name] || null;
      const { oldImg, newImg } = layers.setLayer(name, slot, { startHidden: true });
      return PER_LAYER_TR.crossfade(oldImg, newImg, { duration: ms });
    });
    await Promise.all(tasks);
  },

  shake: async (layers, prev, cur, opts) => {
    // Aplicar slots y luego shake
    GLOBAL_TR.instant(layers, prev, cur);
    const stage = layers.stage;
    const ms = opts.duration ?? 400;
    const a = stage.animate(
      [{ transform: 'translate(0,0)' },
       { transform: 'translate(-10px, 4px)' },
       { transform: 'translate(8px, -6px)' },
       { transform: 'translate(-6px, 8px)' },
       { transform: 'translate(0,0)' }],
      { duration: ms, fill: 'forwards' }
    );
    await waitAnim(a);
  },
};

// Para tipos no específicos, aplicamos la versión per-layer a TODAS las capas que cambiaron
async function applyGenericPerLayerToAll(type, layers, prev, cur, opts) {
  const fn = PER_LAYER_TR[type];
  if (!fn) {
    console.warn('Transición desconocida:', type, '— usando fade');
    return GLOBAL_TR.fade(layers, prev, cur, opts);
  }
  const { changed } = diffLayers(prev, cur);
  const tasks = changed.map(name => {
    const slot = cur?.layers?.[name] || null;
    const { oldImg, newImg } = layers.setLayer(name, slot, { startHidden: true });
    return fn(oldImg, newImg, opts);
  });
  await Promise.all(tasks);
}

async function fadeViaColor(layers, prev, cur, ms, color) {
  // Crea un overlay del color y lo anima 0 → 1 → 0 en una sola animation
  // de tres keyframes. El swap de capas ocurre programado a la mitad (con
  // setTimeout, no con un await intermedio). Esto evita conflictos entre
  // animaciones consecutivas con fill:'forwards' sobre la misma propiedad,
  // que en algunos motores dejan la segunda colgada.
  const overlay = document.createElement('div');
  overlay.className = 'vn-overlay-fade';
  overlay.style.background = color;
  overlay.style.opacity = '0';
  layers.root.appendChild(overlay);
  const half = ms / 2;
  let swapped = false;
  const swapTimer = setTimeout(() => {
    swapped = true;
    GLOBAL_TR.instant(layers, prev, cur);
  }, half);
  const a = overlay.animate(
    [{ opacity: 0, offset: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 1 }],
    { duration: ms, easing: 'linear', fill: 'forwards' }
  );
  // Fallback de seguridad: si por algún motivo la animation no progresa
  // (p.ej. pestaña en background con timeline pausado), forzamos la
  // resolución con un setTimeout de la misma duración.
  await Promise.race([waitAnim(a), new Promise(r => setTimeout(r, ms + 50))]);
  clearTimeout(swapTimer);
  if (!swapped) GLOBAL_TR.instant(layers, prev, cur);
  overlay.remove();
}

// ===== API pública =====

export async function applyTransition(layers, prevSlide, curSlide, tr) {
  // tr === null → instant sin animación
  if (tr === null) {
    return GLOBAL_TR.instant(layers, prevSlide, curSlide);
  }

  // tr.perLayer → transición específica por capa
  if (tr && tr.perLayer) {
    const tasks = LAYER_NAMES.map(name => {
      const sub = tr.perLayer[name];
      const slot = curSlide?.layers?.[name] || null;
      // Si perLayer[name] no está definido, mantenemos la capa instantánea
      if (sub === undefined) {
        const { oldImg } = layers.setLayer(name, slot);
        if (oldImg) oldImg.remove();
        const img = layers.getImg(name);
        if (img) img.style.opacity = '1';
        return Promise.resolve();
      }
      if (sub === null) {
        // Sin transición pero sí actualización
        const { oldImg } = layers.setLayer(name, slot);
        if (oldImg) oldImg.remove();
        const img = layers.getImg(name);
        if (img) img.style.opacity = '1';
        return Promise.resolve();
      }
      const fn = PER_LAYER_TR[sub.type];
      if (!fn) {
        console.warn('Transición per-layer desconocida:', sub.type);
        const { oldImg } = layers.setLayer(name, slot);
        if (oldImg) oldImg.remove();
        const img = layers.getImg(name);
        if (img) img.style.opacity = '1';
        return Promise.resolve();
      }
      const { oldImg, newImg } = layers.setLayer(name, slot, { startHidden: true });
      return fn(oldImg, newImg, sub);
    });
    await Promise.all(tasks);
    return;
  }

  // Transición global con tipo
  const type = tr.type || 'fade';
  const handler = GLOBAL_TR[type];
  if (handler) return handler(layers, prevSlide, curSlide, tr);
  // Si no hay handler global, intenta per-layer aplicado a todas las que cambiaron
  return applyGenericPerLayerToAll(type, layers, prevSlide, curSlide, tr);
}

export const TRANSITION_TYPES = [
  'instant', 'fade', 'fadeWhite', 'crossfade',
  'wipe-left', 'wipe-right', 'wipe-up', 'wipe-down',
  'dissolve', 'pixelate',
  'iris-in', 'iris-out',
  'slide-in', 'blinds', 'shake',
];

/**
 * Aplica MOVIMIENTO a las capas existentes (= msp/amsp en NScripter).
 * No recrea los <img>, solo anima sus propiedades transform/scale/opacity.
 *
 * Estructura del bloque motion en un slide:
 *   {
 *     "charLeft":   { "to": { "x": 0.7, "y": 0, "scale": 1.0 }, "duration": 600 },
 *     "charCenter": { "shake": { "amplitude": 8, "duration": 400 } },
 *     "charRight":  { "to": { "opacity": 0 }, "duration": 300 }
 *   }
 *
 * `to`     → interpola hacia los valores dados
 * `shake`  → meneo en pantalla (sobre la posición actual)
 *
 * Si una capa tiene motion pero no había <img>, se ignora silenciosamente.
 */
export async function applyMotion(layers, motion) {
  if (!motion) return;
  const tasks = [];
  for (const [name, m] of Object.entries(motion)) {
    const img = layers.getImg(name);
    const slot = layers.getSlot(name);
    if (!img || !slot) continue;

    if (m.shake) {
      const amp = m.shake.amplitude ?? 6;
      const dur = m.shake.duration ?? 400;
      tasks.push(waitAnim(img.animate(
        [
          { transform: img.style.transform },
          { transform: `${img.style.transform || ''} translate(-${amp}px, ${amp / 2}px)` },
          { transform: `${img.style.transform || ''} translate(${amp}px, -${amp / 2}px)` },
          { transform: img.style.transform },
        ],
        { duration: dur, easing: 'ease-out' }
      )));
      continue;
    }

    if (m.to) {
      const dur = m.duration ?? 500;
      const easing = m.easing || 'cubic-bezier(.2,.8,.2,1)';
      const to = m.to;
      // Calcular nuevo transform manteniendo translateX(-50%) si es positioned
      const isPositioned = img.classList.contains('vn-img-positioned');
      const newScale = to.scale != null ? to.scale : (slot.scale ?? 1);
      const newTransform = isPositioned
        ? `translateX(-50%) scale(${newScale})`
        : `scale(${newScale})`;
      const keyframe = { transform: newTransform };
      if (to.x != null) {
        keyframe.left   = (to.x >= 0 && to.x <= 1) ? `${to.x * 100}%` : `${to.x}px`;
      }
      if (to.y != null) {
        keyframe.bottom = (to.y >= 0 && to.y <= 1) ? `${to.y * 100}%` : `${to.y}px`;
      }
      if (to.opacity != null) keyframe.opacity = to.opacity;
      tasks.push(waitAnim(img.animate(
        [{}, keyframe],
        { duration: dur, easing, fill: 'forwards' }
      )));
      // Persistir en el slot para que prev/next no recreen
      if (to.x != null) slot.x = to.x;
      if (to.y != null) slot.y = to.y;
      if (to.scale != null) slot.scale = to.scale;
    }
  }
  await Promise.all(tasks);
}
