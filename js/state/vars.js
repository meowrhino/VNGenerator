/* state/vars.js — Variables del juego + evaluador de condiciones.
 *
 * Modelo:
 *   - El estado del juego es un objeto plano `vars` con claves arbitrarias.
 *   - Las "operaciones" desde un slide son simples:
 *       { set:  { afinidad_ana: 5 } }       asigna
 *       { add:  { afinidad_ana: 1 } }       suma (resta con valor negativo)
 *       { setFlag: "leyendo_diario" }       crea bool true
 *       { unsetFlag: "leyendo_diario" }     borra
 *   - Las "condiciones" son cadenas con operadores básicos:
 *       "afinidad_ana >= 3"
 *       "tiene_llave && !sabia_la_verdad"
 *       "(afinidad_ana > 0 || gusta_luis) && capítulo == 2"
 *
 * El evaluador NO usa eval() ni new Function() (riesgo XSS si el JSON viene
 * de una fuente no confiable). Implementamos un parser/intérprete diminuto
 * que sólo entiende: identificadores, números, strings, !, &&, ||,
 * ==, !=, <, <=, >, >=, +, -, *, /, paréntesis. */

export class VarStore {
  constructor(initial = {}) {
    this.vars = { ...initial };
  }

  get(key) { return this.vars[key]; }
  set(key, val) { this.vars[key] = val; }
  has(key) { return Object.prototype.hasOwnProperty.call(this.vars, key); }
  snapshot() { return { ...this.vars }; }
  restore(snap) { this.vars = { ...snap }; }
  reset(initial = {}) { this.vars = { ...initial }; }

  /** Aplica un bloque ops a la store. Idempotente respecto al orden de keys. */
  applyOps(ops) {
    if (!ops) return;
    if (ops.set) {
      for (const [k, v] of Object.entries(ops.set)) this.vars[k] = v;
    }
    if (ops.add) {
      for (const [k, v] of Object.entries(ops.add)) {
        this.vars[k] = (this.vars[k] || 0) + v;
      }
    }
    if (ops.setFlag) {
      const flags = Array.isArray(ops.setFlag) ? ops.setFlag : [ops.setFlag];
      flags.forEach(f => { this.vars[f] = true; });
    }
    if (ops.unsetFlag) {
      const flags = Array.isArray(ops.unsetFlag) ? ops.unsetFlag : [ops.unsetFlag];
      flags.forEach(f => { delete this.vars[f]; });
    }
  }

  /** Evalúa una condición y devuelve un boolean. */
  eval(expr) {
    if (typeof expr !== 'string' || !expr.trim()) return true;
    try {
      const tokens = tokenizeExpr(expr);
      const parser = new Parser(tokens, this.vars);
      const result = parser.parseOr();
      if (parser.pos < tokens.length) {
        throw new Error('tokens sobrantes en ' + JSON.stringify(expr));
      }
      return !!result;
    } catch (err) {
      console.warn('[vars] expresión inválida:', expr, err.message);
      return false;
    }
  }
}

/* === Tokenizer === */
const TOKEN_RE = /\s*(?:(\d+(?:\.\d+)?)|"([^"]*)"|'([^']*)'|(&&|\|\||==|!=|<=|>=|[+\-*/<>!()])|([A-Za-z_][A-Za-z0-9_.]*))/g;

function tokenizeExpr(str) {
  const out = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  let lastEnd = 0;
  while ((m = TOKEN_RE.exec(str)) !== null) {
    if (m.index !== lastEnd) {
      // Hubo caracteres no consumidos entre tokens
      throw new Error(`carácter inesperado cerca de "${str.slice(lastEnd, m.index)}"`);
    }
    if (m[1] !== undefined)      out.push({ t: 'num', v: parseFloat(m[1]) });
    else if (m[2] !== undefined) out.push({ t: 'str', v: m[2] });
    else if (m[3] !== undefined) out.push({ t: 'str', v: m[3] });
    else if (m[4] !== undefined) out.push({ t: 'op',  v: m[4] });
    else if (m[5] !== undefined) {
      const id = m[5];
      if (id === 'true')       out.push({ t: 'num', v: 1 });
      else if (id === 'false') out.push({ t: 'num', v: 0 });
      else if (id === 'null')  out.push({ t: 'num', v: 0 });
      else                     out.push({ t: 'id', v: id });
    }
    lastEnd = TOKEN_RE.lastIndex;
  }
  if (lastEnd !== str.length && str.slice(lastEnd).trim()) {
    throw new Error(`final inesperado: "${str.slice(lastEnd)}"`);
  }
  return out;
}

/* === Parser de descenso recursivo === */
class Parser {
  constructor(tokens, vars) {
    this.tokens = tokens;
    this.pos = 0;
    this.vars = vars;
  }

  peek() { return this.tokens[this.pos]; }
  consume(t, v) {
    const tk = this.peek();
    if (!tk) throw new Error('final inesperado');
    if (tk.t !== t) throw new Error(`esperaba ${t} y vino ${tk.t}`);
    if (v !== undefined && tk.v !== v) throw new Error(`esperaba "${v}" y vino "${tk.v}"`);
    this.pos++;
    return tk;
  }
  match(t, v) {
    const tk = this.peek();
    if (!tk || tk.t !== t) return false;
    if (v !== undefined && tk.v !== v) return false;
    this.pos++;
    return tk;
  }

  // expr = or
  // or   = and ('||' and)*
  parseOr() {
    let l = this.parseAnd();
    while (this.match('op', '||')) {
      const r = this.parseAnd();
      l = !!(l || r);
    }
    return l;
  }
  // and = cmp ('&&' cmp)*
  parseAnd() {
    let l = this.parseCmp();
    while (this.match('op', '&&')) {
      const r = this.parseCmp();
      l = !!(l && r);
    }
    return l;
  }
  // cmp = add (('=='|'!='|'<'|'<='|'>'|'>=') add)?
  parseCmp() {
    let l = this.parseAdd();
    const tk = this.peek();
    if (tk && tk.t === 'op' && ['==','!=','<','<=','>','>='].includes(tk.v)) {
      this.pos++;
      const r = this.parseAdd();
      switch (tk.v) {
        case '==': return l == r;
        case '!=': return l != r;
        case '<':  return l <  r;
        case '<=': return l <= r;
        case '>':  return l >  r;
        case '>=': return l >= r;
      }
    }
    return l;
  }
  // add = mul (('+'|'-') mul)*
  parseAdd() {
    let l = this.parseMul();
    while (true) {
      if (this.match('op', '+'))      l = l + this.parseMul();
      else if (this.match('op', '-')) l = l - this.parseMul();
      else break;
    }
    return l;
  }
  // mul = unary (('*'|'/') unary)*
  parseMul() {
    let l = this.parseUnary();
    while (true) {
      if (this.match('op', '*'))      l = l * this.parseUnary();
      else if (this.match('op', '/')) l = l / this.parseUnary();
      else break;
    }
    return l;
  }
  // unary = '!' unary | '-' unary | atom
  parseUnary() {
    if (this.match('op', '!')) return !this.parseUnary();
    if (this.match('op', '-')) return -this.parseUnary();
    return this.parseAtom();
  }
  // atom = num | str | id | '(' or ')'
  parseAtom() {
    const tk = this.peek();
    if (!tk) throw new Error('expresión vacía');
    if (tk.t === 'num') { this.pos++; return tk.v; }
    if (tk.t === 'str') { this.pos++; return tk.v; }
    if (tk.t === 'id') {
      this.pos++;
      const v = this.vars[tk.v];
      if (v === undefined) return 0;
      return v;
    }
    if (tk.t === 'op' && tk.v === '(') {
      this.pos++;
      const inner = this.parseOr();
      this.consume('op', ')');
      return inner;
    }
    throw new Error(`token inesperado: ${tk.t} ${tk.v}`);
  }
}
