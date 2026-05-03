// loader.js — Carga de capítulos JSON y manifest
// Soporta: fetch de URL, File API, drag & drop.

export async function loadChapter(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo cargar ${url}: ${r.status}`);
  const data = await r.json();
  validateChapter(data);
  // Resuelve assets relativos al directorio del JSON
  if (!data.assets) data.assets = {};
  if (data.assets.images && !data.assets.images.startsWith('http') && !data.assets.images.startsWith('/')) {
    const baseDir = url.substring(0, url.lastIndexOf('/') + 1);
    if (!data.assets.images.startsWith(baseDir)) {
      data.assets.images = baseDir + data.assets.images.replace(/^\.\//, '');
    }
  }
  if (data.assets.audio && !data.assets.audio.startsWith('http') && !data.assets.audio.startsWith('/')) {
    const baseDir = url.substring(0, url.lastIndexOf('/') + 1);
    if (!data.assets.audio.startsWith(baseDir)) {
      data.assets.audio = baseDir + data.assets.audio.replace(/^\.\//, '');
    }
  }
  // Resolver srcs de imágenes en cada slide
  resolveImageSrcs(data);
  return data;
}

export async function loadChapterFromFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  validateChapter(data);
  return data;
}

export async function loadManifest(url = './manifest.json') {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo cargar manifest: ${r.status}`);
  return await r.json();
}

export function validateChapter(data) {
  if (!data || typeof data !== 'object') throw new Error('Capítulo inválido: no es un objeto');
  if (!Array.isArray(data.slides)) throw new Error('Capítulo inválido: falta array "slides"');
  if (data.slides.length === 0) throw new Error('Capítulo inválido: array de slides vacío');
  data.slides.forEach((s, i) => {
    if (!s || typeof s !== 'object') throw new Error(`Slide ${i} no es objeto`);
    if (s.choice && !Array.isArray(s.choice.options)) {
      throw new Error(`Slide ${i}: choice.options debe ser array`);
    }
  });
  return true;
}

export function resolveImageSrcs(chapter) {
  const base = chapter.assets?.images || '';
  const prefix = base && !base.endsWith('/') ? base + '/' : base;
  chapter.slides.forEach(s => {
    if (!s.layers) return;
    Object.keys(s.layers).forEach(layerName => {
      const slot = s.layers[layerName];
      if (slot && slot.src && !slot.src.startsWith('http') && !slot.src.startsWith('/') && !slot.src.startsWith('data:') && !slot.src.startsWith('blob:')) {
        slot.src = prefix + slot.src;
      }
    });
  });
}

// Crea un capítulo en blanco para el generador
export function emptyChapter() {
  return {
    $schema: 'vngenerator/v1',
    id: 'nuevo-' + Date.now(),
    title: 'Capítulo nuevo',
    author: '',
    resolution: { w: 1920, h: 1080 },
    defaults: {
      transition: { type: 'fade', duration: 400 },
      textSpeed: 30,
    },
    assets: { images: './img/', audio: './audio/' },
    slides: [
      {
        id: 's001',
        layers: { bg1: null, charCenter: null },
        text: { speaker: '', body: 'Empieza aquí...' },
        transition: 'default',
      },
    ],
  };
}
