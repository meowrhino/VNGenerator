/* core/typewriter.js — Render de texto carácter a carácter con marcadores
 * inline para pausas y formato.
 *
 * El usuario escribe el texto con marcadores estilo NScripter pero más legibles:
 *
 *   "Hola...[w:600] estoy[w:300] pensando."        → pausa 600ms y 300ms
 *   "Esta palabra es **importante** ¿no?"           → negrita
 *   "Y *esta* va en cursiva."                       → itálica
 *   "Texto en [c:#ff6b9d]rosa[/c] y luego normal."  → color
 *   "Línea con\\nsalto manual."                     → \n literal
 *
 * El parser convierte la cadena a una lista de "tokens":
 *   { type: 'char',  value: 'a' }
 *   { type: 'wait',  ms: 500 }
 *   { type: 'open',  tag: 'b' | 'i' | 'span', attrs?: {color} }
 *   { type: 'close', tag: ... }
 *
 * El reproductor consume los tokens uno a uno con setInterval o equivalentes,
 * y mantiene una pila de tags abiertos para poder cerrarlos al saltar al final
 * (cuando el usuario hace click para "completar" la animación). */

const TAG_RE = /\[(w|c|\/c)(?::([^\]]*))?\]/g;
const FMT_RE = /(\*\*|\*)/g;

/** Tokeniza una cadena con marcadores. Devuelve un array de tokens planos. */
export function tokenize(str) {
  if (!str) return [];
  // 1) Sustituyo \\n por salto literal (el usuario lo escribe escapado).
  str = str.replace(/\\n/g, '\n');

  // 2) Primero proceso negritas/itálicas con un parser simple por trozos.
  //    No soporta nested complex, pero sí los casos básicos (bastante para VN).
  const formatted = parseFormatting(str);

  // 3) Luego dentro de cada chunk de texto, detecto [w:N], [c:#xxx]…[/c].
  const tokens = [];
  for (const chunk of formatted) {
    if (chunk.type !== 'text') {
      tokens.push(chunk);
      continue;
    }
    let lastIndex = 0;
    TAG_RE.lastIndex = 0;
    let m;
    while ((m = TAG_RE.exec(chunk.value)) !== null) {
      // Texto antes del tag → caracteres
      const before = chunk.value.slice(lastIndex, m.index);
      for (const ch of before) tokens.push({ type: 'char', value: ch });
      // El tag
      const [, name, arg] = m;
      if (name === 'w') {
        const ms = parseInt(arg, 10) || 0;
        tokens.push({ type: 'wait', ms });
      } else if (name === 'c') {
        tokens.push({ type: 'open', tag: 'span', attrs: { color: arg } });
      } else if (name === '/c') {
        tokens.push({ type: 'close', tag: 'span' });
      }
      lastIndex = TAG_RE.lastIndex;
    }
    const tail = chunk.value.slice(lastIndex);
    for (const ch of tail) tokens.push({ type: 'char', value: ch });
  }
  return tokens;
}

/** Devuelve [{type:'text', value}, {type:'open', tag:'b'|'i'}, …] cubriendo bold/italic. */
function parseFormatting(str) {
  const out = [];
  const stack = []; // 'b' | 'i'
  let buf = '';
  let i = 0;
  while (i < str.length) {
    if (str[i] === '*' && str[i + 1] === '*') {
      if (buf) { out.push({ type: 'text', value: buf }); buf = ''; }
      if (stack[stack.length - 1] === 'b') {
        stack.pop();
        out.push({ type: 'close', tag: 'b' });
      } else {
        stack.push('b');
        out.push({ type: 'open', tag: 'b' });
      }
      i += 2;
    } else if (str[i] === '*') {
      if (buf) { out.push({ type: 'text', value: buf }); buf = ''; }
      if (stack[stack.length - 1] === 'i') {
        stack.pop();
        out.push({ type: 'close', tag: 'i' });
      } else {
        stack.push('i');
        out.push({ type: 'open', tag: 'i' });
      }
      i += 1;
    } else {
      buf += str[i];
      i += 1;
    }
  }
  if (buf) out.push({ type: 'text', value: buf });
  // Cerrar cualquier tag abierto colgado (texto malformado)
  while (stack.length) out.push({ type: 'close', tag: stack.pop() });
  return out;
}

/** Renderiza tokens en el elemento dado, devolviendo un controlador con
 *  start(), complete() y onDone(cb). */
export class Typewriter {
  constructor(el, opts = {}) {
    this.el = el;
    this.speed = opts.speed || 30;          // chars / segundo
    this.tokens = [];
    this.idx = 0;
    this.timer = null;
    this.done = false;
    this.onDoneCb = null;
    this.openTags = [];                     // stack de elementos DOM abiertos
  }

  reset(text) {
    this.tokens = tokenize(text);
    this.idx = 0;
    this.done = false;
    this.openTags = [];
    this.el.innerHTML = '';
  }

  start() {
    if (!this.tokens.length) { this._finish(); return; }
    const interval = 1000 / this.speed;
    this._step(interval);
  }

  _step(interval) {
    clearTimeout(this.timer);
    if (this.idx >= this.tokens.length) { this._finish(); return; }
    const t = this.tokens[this.idx++];
    if (t.type === 'char') {
      this._appendChar(t.value);
      this.timer = setTimeout(() => this._step(interval), interval);
    } else if (t.type === 'open') {
      this._openTag(t);
      this._step(interval);    // tags no consumen tiempo
    } else if (t.type === 'close') {
      this._closeTag(t);
      this._step(interval);
    } else if (t.type === 'wait') {
      this.timer = setTimeout(() => this._step(interval), t.ms);
    }
  }

  /** Añade un char al elemento de tag abierto más reciente, o al raíz. */
  _appendChar(ch) {
    const target = this.openTags.length
      ? this.openTags[this.openTags.length - 1]
      : this.el;
    target.appendChild(document.createTextNode(ch));
  }

  _openTag(t) {
    let el;
    if (t.tag === 'span') {
      el = document.createElement('span');
      if (t.attrs?.color) el.style.color = t.attrs.color;
    } else {
      el = document.createElement(t.tag);
    }
    const target = this.openTags.length
      ? this.openTags[this.openTags.length - 1]
      : this.el;
    target.appendChild(el);
    this.openTags.push(el);
  }

  _closeTag(_t) { this.openTags.pop(); }

  /** Saltar al final inmediatamente, completando todos los chars y tags pendientes. */
  complete() {
    if (this.done) return;
    clearTimeout(this.timer);
    while (this.idx < this.tokens.length) {
      const t = this.tokens[this.idx++];
      if (t.type === 'char') this._appendChar(t.value);
      else if (t.type === 'open') this._openTag(t);
      else if (t.type === 'close') this._closeTag(t);
      // wait se ignora al saltar
    }
    this._finish();
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    clearTimeout(this.timer);
    this.onDoneCb?.();
  }

  onDone(cb) { this.onDoneCb = cb; }

  destroy() {
    clearTimeout(this.timer);
    this.done = true;
  }
}
