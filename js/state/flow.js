/* state/flow.js — Control de flujo del lector.
 *
 * Encapsula el cursor (slide actual), la historia para "anterior", el call
 * stack para gosub/return, y el avance condicional. El engine consulta este
 * módulo para saber cuál es el próximo slide; este módulo no conoce el DOM. */

export class FlowController {
  /**
   * @param {Array} slides       lista de slides del capítulo
   * @param {VarStore} vars      store de variables (para evaluar conditions/goto)
   */
  constructor(slides, vars) {
    this.slides = slides;
    this.vars = vars;
    this.idx = 0;
    /** @type {number[]} pila de índices visitados, para prev() */
    this.history = [];
    /** @type {number[]} pila de retorno para gosub/return */
    this.callStack = [];
    this.byId = new Map();
    slides.forEach((s, i) => { if (s.id) this.byId.set(s.id, i); });
  }

  current() { return this.slides[this.idx]; }
  prevSlide() { return this.history.length ? this.slides[this.history[this.history.length - 1]] : null; }

  /** Avanza al siguiente slide. Honra goto, gosub, condicionales. Devuelve { slide, prev }. */
  next() {
    const cur = this.slides[this.idx];

    // Aplicar ops de variables del slide actual antes de salir
    if (cur?.vars) this.vars.applyOps(cur.vars);

    // gosub: saltar a label, recordar dónde volver
    if (cur?.gosub) {
      const target = this.byId.get(cur.gosub);
      if (target == null) throw new Error(`gosub: slide no encontrado: ${cur.gosub}`);
      this.callStack.push(this.idx + 1);
      this.history.push(this.idx);
      this.idx = target;
      return { slide: this.slides[this.idx], prev: cur };
    }

    // return: saltar al tope del call stack
    if (cur?.return === true) {
      if (!this.callStack.length) {
        // sin contexto → tratar como next normal
      } else {
        const back = this.callStack.pop();
        this.history.push(this.idx);
        this.idx = back;
        return { slide: this.slides[this.idx], prev: cur };
      }
    }

    // goto explícito (con condición opcional)
    if (cur?.goto) {
      if (!cur.gotoIf || this.vars.eval(cur.gotoIf)) {
        const target = this.byId.get(cur.goto);
        if (target == null) throw new Error(`goto: slide no encontrado: ${cur.goto}`);
        this.history.push(this.idx);
        this.idx = target;
        return { slide: this.slides[this.idx], prev: cur };
      }
    }

    // Avance lineal
    if (this.idx >= this.slides.length - 1) {
      return { slide: null, prev: cur, end: true };
    }
    this.history.push(this.idx);
    this.idx++;
    return { slide: this.slides[this.idx], prev: cur };
  }

  /** Retrocede al slide anterior visitado. */
  prev() {
    if (!this.history.length) return null;
    const targetIdx = this.history.pop();
    const fromSlide = this.slides[this.idx];
    this.idx = targetIdx;
    return { slide: this.slides[this.idx], prev: fromSlide };
  }

  /** Salta a un id concreto (típicamente desde una choice). */
  jumpTo(id) {
    const target = this.byId.get(id);
    if (target == null) throw new Error(`jumpTo: id no encontrado: ${id}`);
    const fromSlide = this.slides[this.idx];
    this.history.push(this.idx);
    this.idx = target;
    return { slide: this.slides[this.idx], prev: fromSlide };
  }

  /** Posiciona el cursor sin tocar history (para load). */
  seek(idx, history = [], callStack = []) {
    this.idx = idx;
    this.history = [...history];
    this.callStack = [...callStack];
  }

  snapshot() {
    return {
      idx: this.idx,
      history: [...this.history],
      callStack: [...this.callStack],
    };
  }
}
