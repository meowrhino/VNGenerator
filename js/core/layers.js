// layers.js — Sistema de capas DOM-based
// Crea 6 capas absolutas apiladas con z-index implícito por orden de aparición.
// Cada capa contiene un slot de imagen (o nada). Para crossfades entre dos imágenes
// en la misma capa, usamos dos <img> apilados dentro del div de la capa.

export const LAYER_NAMES = [
  'bg1',        // fondo principal
  'overBg',     // sobrefondo (atmósfera, niebla, overlays)
  'charLeft',   // personaje izquierda
  'charCenter', // personaje centro
  'charRight',  // personaje derecha
  // 'text' lo gestiona el engine, no es una capa de imagen
];

export class Layers {
  constructor(root) {
    this.root = root;
    this.el = {};      // div de cada capa
    this.imgs = {};    // <img> activo en cada capa
    this.slots = {};   // último slot rendereado en cada capa
    this._build();
  }

  _build() {
    const stage = document.createElement('div');
    stage.className = 'vn-stage';
    LAYER_NAMES.forEach((n, i) => {
      const d = document.createElement('div');
      d.className = `vn-layer vn-layer-${n}`;
      d.style.zIndex = String(i + 1);
      d.dataset.layer = n;
      stage.appendChild(d);
      this.el[n] = d;
      this.imgs[n] = null;
      this.slots[n] = null;
    });
    this.root.appendChild(stage);
    this.stage = stage;
  }

  // Renderiza una capa. Si ya hay una imagen, la sustituye.
  // Devuelve { oldImg, newImg } para que transitions.js pueda crossfadear.
  setLayer(name, slot, opts = {}) {
    const el = this.el[name];
    if (!el) return { oldImg: null, newImg: null };

    const oldImg = this.imgs[name];

    if (!slot || !slot.src) {
      // Limpiar capa
      if (oldImg && !opts.keepOld) oldImg.remove();
      this.imgs[name] = null;
      this.slots[name] = null;
      return { oldImg, newImg: null };
    }

    // Si el slot es exactamente igual al anterior, no recrear.
    // Devolvemos oldImg=null para que el llamante no lo elimine: la imagen
    // ya está montada y debe seguir igual.
    if (this.slots[name]
      && this.slots[name].src === slot.src
      && this.slots[name].x === slot.x
      && this.slots[name].y === slot.y
      && this.slots[name].scale === slot.scale
      && !opts.force) {
      return { oldImg: null, newImg: oldImg };
    }

    const img = document.createElement('img');
    img.className = 'vn-layer-img';
    img.src = this._resolveSrc(slot.src);
    img.alt = '';
    img.draggable = false;

    // Distinguimos capas que llenan (bg1, overBg) de capas posicionadas (personajes)
    const isFillLayer = (name === 'bg1' || name === 'overBg');
    const hasPosition = (slot.x != null || slot.y != null);

    if (isFillLayer && !hasPosition) {
      // Fondo: llena toda la capa
      img.classList.add('vn-img-fill');
    } else {
      // Capa posicionada: el <img> se centra horizontalmente sobre x
      // y se ancla por la base sobre y. Convención:
      //   x: 0 = izquierda, 0.5 = centro, 1 = derecha   (o px > 1)
      //   y: 0 = suelo (default), 1 = techo              (o px > 1)
      // Esto es lo más intuitivo para autores: por defecto el char está en el suelo.
      img.classList.add('vn-img-positioned');
      const xRaw = slot.x != null ? slot.x : 0.5;
      const yRaw = slot.y != null ? slot.y : 0;
      const xIsFraction = (xRaw >= 0 && xRaw <= 1);
      const yIsFraction = (yRaw >= 0 && yRaw <= 1);
      img.style.left = xIsFraction ? `${xRaw * 100}%` : `${xRaw}px`;
      img.style.bottom = yIsFraction ? `${yRaw * 100}%` : `${yRaw}px`;
      img.style.top = 'auto';
      const sc = slot.scale != null ? slot.scale : 1;
      // translateX(-50%) centra horizontalmente sobre x; el bottom ancla por la base
      img.style.transform = `translateX(-50%) scale(${sc})`;
      img.style.transformOrigin = 'center bottom';
    }

    if (slot.anchor) img.dataset.anchor = slot.anchor;

    // Inicialmente invisible para que la transición lo entre
    if (opts.startHidden) img.style.opacity = '0';

    el.appendChild(img);
    this.imgs[name] = img;
    this.slots[name] = { ...slot };
    return { oldImg, newImg: img };
  }

  _resolveSrc(src) {
    if (!src) return '';
    if (src.startsWith('http') || src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) {
      return src;
    }
    return (this._basePath || '') + src;
  }

  setBasePath(p) {
    this._basePath = p;
    if (p && !p.endsWith('/')) this._basePath = p + '/';
  }

  removeOld(name, oldImg) {
    if (oldImg && oldImg.parentElement) oldImg.remove();
  }

  // Pone todas las capas en estado "vacío"
  reset() {
    LAYER_NAMES.forEach(n => {
      this.el[n].innerHTML = '';
      this.imgs[n] = null;
      this.slots[n] = null;
    });
  }

  getEl(name) { return this.el[name]; }
  getImg(name) { return this.imgs[name]; }
  getSlot(name) { return this.slots[name]; }
}
