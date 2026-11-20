/**
 * Shared Safe Waveform & Custom Mathematical Function Engine
 * Used by Modulation Modules (Task 5 DSB-SC/AM, Task 6 Conventional AM, Task 7 SSB-AM).
 */

export const WAVEFORM_PRESETS = [
  { id: 'sine', label: 'Sinusoidal', formula: 'Am * cos(2π fm t)' },
  { id: 'triangle', label: 'Triangle', formula: 'Am * tri(2π fm t)' },
  { id: 'square', label: 'Square', formula: 'Am * square(2π fm t)' },
  { id: 'sawtooth', label: 'Sawtooth', formula: 'Am * saw(2π fm t)' },
  { id: 'multitone', label: 'Multi-Tone', formula: 'Am * (0.65 cos(2π fm t) + 0.35 sin(5π fm t))' },
  { id: 'sinc', label: 'Sinc Pulse', formula: 'Am * sinc(4 * frac(fm t) - 2)' },
  { id: 'custom', label: 'Custom f(t)', formula: 'User Expression' },
];

export const CUSTOM_FUNCTION_EXAMPLES = [
  { label: 'Harmonic Sum', expr: 'cos(2*pi*fm*t) + 0.5*sin(4*pi*fm*t)' },
  { label: 'Beat Envelope', expr: 'cos(2*pi*fm*t) * cos(pi*fm*t)' },
  { label: 'Damped Wave', expr: 'exp(-2*((fm*t) % 1)) * sin(2*pi*fm*t)' },
  { label: 'Sinc Pulse', expr: 'sinc(4*((fm*t % 1) - 0.5))' },
  { label: 'AM Chirp', expr: 'sin(2*pi*fm*t * (1 + 0.5*sin(pi*fm*t)))' },
  { label: 'Step + Sine', expr: '0.6*cos(2*pi*fm*t) + 0.4*square(6*pi*fm*t)' },
];

export const DEFAULT_CUSTOM_EXPR = 'cos(2*pi*fm*t) + 0.5*sin(4*pi*fm*t)';

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  abs: Math.abs,
  sqrt: (x) => (x >= 0 ? Math.sqrt(x) : 0),
  exp: Math.exp,
  ln: (x) => (x > 0 ? Math.log(x) : 0),
  log: (x) => (x > 0 ? Math.log10(x) : 0),
  log10: (x) => (x > 0 ? Math.log10(x) : 0),
  log2: (x) => (x > 0 ? Math.log2(x) : 0),
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  mod: (a, b) => (b === 0 ? 0 : ((a % b) + b) % b),
  clamp: (x, lo, hi) => Math.min(hi, Math.max(lo, x)),
  // DSP & Communication Systems helper functions
  sgn: (x) => (x > 0 ? 1 : x < 0 ? -1 : 0),
  sign: (x) => (x > 0 ? 1 : x < 0 ? -1 : 0),
  step: (x) => (x >= 0 ? 1 : 0),
  u: (x) => (x >= 0 ? 1 : 0),
  rect: (x) => (Math.abs(x) <= 0.5 ? 1 : 0),
  tri: (x) => (Math.abs(x) <= 1 ? 1 - Math.abs(x) : 0),
  sinc: (x) => {
    if (Math.abs(x) < 1e-9) return 1;
    const px = Math.PI * x;
    return Math.sin(px) / px;
  },
  square: (x) => (Math.cos(x) >= 0 ? 1 : -1),
  sq: (x) => (Math.cos(x) >= 0 ? 1 : -1),
  saw: (x) => {
    const phase = (((x / (2 * Math.PI)) % 1) + 1) % 1;
    return 2 * phase - 1;
  },
  sawtooth: (x) => {
    const phase = (((x / (2 * Math.PI)) % 1) + 1) % 1;
    return 2 * phase - 1;
  },
  triangle: (x) => {
    const normPhase = (((x / (2 * Math.PI) + 0.5) % 1) + 1) % 1;
    return 1 - 4 * Math.abs(normPhase - 0.5);
  },
  frac: (x) => ((x % 1) + 1) % 1,
};

const CONSTANTS = {
  pi: Math.PI,
  π: Math.PI,
  e: Math.E,
  tau: 2 * Math.PI,
};

const SCOPE_VARS = new Set(['t', 'fm', 'f0', 'Am', 'am', 'a', 'fc', 'Ac', 'ac', 'w', 'omega']);

/**
 * Tokenize an expression string with support for implicit multiplication.
 */
function tokenize(input) {
  const rawTokens = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number literal (supports decimals & scientific notation like 1e-3)
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let hasDot = false;
      while (i < len && /[0-9.]/.test(input[i])) {
        if (input[i] === '.') {
          if (hasDot) throw new Error(`Invalid number near "${input.slice(i)}"`);
          hasDot = true;
        }
        numStr += input[i++];
      }
      if (numStr === '.') throw new Error('Unexpected "."');
      if (i < len && (input[i] === 'e' || input[i] === 'E')) {
        const next = input[i + 1];
        if (/[0-9+-]/.test(next || '')) {
          numStr += input[i++];
          if (input[i] === '+' || input[i] === '-') {
            numStr += input[i++];
          }
          let expDigits = '';
          while (i < len && /[0-9]/.test(input[i])) {
            expDigits += input[i++];
          }
          if (!expDigits) throw new Error('Invalid scientific notation exponent');
          numStr += expDigits;
        }
      }
      const value = Number(numStr);
      if (!Number.isFinite(value)) throw new Error(`Invalid number "${numStr}"`);
      rawTokens.push({ type: 'number', value });
      continue;
    }

    // Identifier (variable, constant, or function name)
    if (/[a-zA-Z_π]/.test(ch)) {
      let ident = '';
      while (i < len && /[a-zA-Z0-9_π]/.test(input[i])) {
        ident += input[i++];
      }
      rawTokens.push({ type: 'ident', value: ident });
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^' || ch === '%') {
      rawTokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    if (ch === '(' || ch === ')' || ch === ',') {
      rawTokens.push({ type: ch, value: ch });
      i++;
      continue;
    }

    throw new Error(`Unsupported character "${ch}"`);
  }

  // Insert implicit '*' tokens where mathematically natural:
  // e.g. 2t -> 2 * t, 2pi -> 2 * pi, 2(t+1) -> 2 * (t+1), (t+1)(t-1) -> (t+1)*(t-1), t sin(t) -> t * sin(t)
  const tokens = [];
  for (let idx = 0; idx < rawTokens.length; idx++) {
    const prev = tokens[tokens.length - 1];
    const curr = rawTokens[idx];

    if (prev) {
      const prevIsValue =
        prev.type === 'number' ||
        prev.type === ')' ||
        (prev.type === 'ident' && !isFunctionCallLookahead(prev.value, rawTokens[idx]));
      const currStartsValue =
        curr.type === 'number' || curr.type === '(' || curr.type === 'ident';

      // Avoid inserting '*' between function name and '('
      const prevIsFuncBeforeParen =
        prev.type === 'ident' &&
        curr.type === '(' &&
        Object.prototype.hasOwnProperty.call(FUNCTIONS, prev.value.toLowerCase());

      if (prevIsValue && currStartsValue && !prevIsFuncBeforeParen) {
        tokens.push({ type: 'op', value: '*' });
      }
    }
    tokens.push(curr);
  }

  return tokens;
}

function isFunctionCallLookahead(identName, nextToken) {
  return (
    nextToken &&
    nextToken.type === '(' &&
    Object.prototype.hasOwnProperty.call(FUNCTIONS, identName.toLowerCase())
  );
}

/**
 * Recursive-descent parser producing a fast executable AST evaluator.
 */
export function compileCustomFunction(exprString) {
  const trimmed = (exprString || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Enter an expression in terms of t (e.g. cos(2*pi*fm*t))',
      usesAm: false,
      evaluate: null,
    };
  }

  try {
    const tokens = tokenize(trimmed);
    let pos = 0;
    let usesAm = false;

    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    function parseExpression() {
      let left = parseTerm();
      while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const right = parseTerm();
        const l = left;
        const r = right;
        left = op === '+' ? (s) => l(s) + r(s) : (s) => l(s) - r(s);
      }
      return left;
    }

    function parseTerm() {
      let left = parseUnary();
      while (
        peek() &&
        peek().type === 'op' &&
        (peek().value === '*' || peek().value === '/' || peek().value === '%')
      ) {
        const op = consume().value;
        const right = parseUnary();
        const l = left;
        const r = right;
        if (op === '*') {
          left = (s) => l(s) * r(s);
        } else if (op === '/') {
          left = (s) => {
            const denom = r(s);
            return Math.abs(denom) < 1e-12 ? 0 : l(s) / denom;
          };
        } else {
          left = (s) => {
            const denom = r(s);
            return Math.abs(denom) < 1e-12 ? 0 : ((l(s) % denom) + denom) % denom;
          };
        }
      }
      return left;
    }

    function parseUnary() {
      if (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const operand = parseUnary();
        return op === '-' ? (s) => -operand(s) : operand;
      }
      return parsePower();
    }

    function parsePower() {
      const base = parsePrimary();
      if (peek() && peek().type === 'op' && peek().value === '^') {
        consume();
        const exponent = parseUnary(); // right-associative
        return (s) => Math.pow(base(s), exponent(s));
      }
      return base;
    }

    function parsePrimary() {
      const tok = peek();
      if (!tok) {
        throw new Error('Unexpected end of expression');
      }

      if (tok.type === 'number') {
        consume();
        const v = tok.value;
        return () => v;
      }

      if (tok.type === '(') {
        consume();
        const inner = parseExpression();
        if (!peek() || peek().type !== ')') {
          throw new Error('Missing closing parenthesis ")"');
        }
        consume();
        return inner;
      }

      if (tok.type === 'ident') {
        consume();
        const rawName = tok.value;
        const lowerName = rawName.toLowerCase();

        // Function call
        if (peek() && peek().type === '(') {
          const fn = FUNCTIONS[lowerName];
          if (!fn) {
            throw new Error(`Unknown function "${rawName}"`);
          }
          consume(); // '('
          const args = [];
          if (!peek() || peek().type !== ')') {
            args.push(parseExpression());
            while (peek() && peek().type === ',') {
              consume();
              args.push(parseExpression());
            }
          }
          if (!peek() || peek().type !== ')') {
            throw new Error(`Missing ")" after ${rawName}(...)`);
          }
          consume();
          if (args.length === 0) {
            throw new Error(`Function "${rawName}" requires at least 1 argument`);
          }
          if (args.length === 1) {
            const a0 = args[0];
            return (s) => fn(a0(s));
          }
          if (args.length === 2) {
            const a0 = args[0];
            const a1 = args[1];
            return (s) => fn(a0(s), a1(s));
          }
          return (s) => fn(...args.map((a) => a(s)));
        }

        // Constant
        if (Object.prototype.hasOwnProperty.call(CONSTANTS, lowerName)) {
          const c = CONSTANTS[lowerName];
          return () => c;
        }

        // Scope variable
        if (SCOPE_VARS.has(rawName) || SCOPE_VARS.has(lowerName)) {
          if (rawName === 'Am' || lowerName === 'am' || rawName === 'A' || lowerName === 'a') {
            usesAm = true;
            return (s) => (s.Am !== undefined ? s.Am : s.A);
          }
          if (rawName === 'Ac' || lowerName === 'ac') {
            return (s) => s.Ac;
          }
          if (lowerName === 'fm' || lowerName === 'f0') {
            return (s) => (s.fm !== undefined ? s.fm : s.f0);
          }
          if (lowerName === 'fc') return (s) => s.fc;
          if (lowerName === 'w' || lowerName === 'omega') {
            return (s) => 2 * Math.PI * (s.fm !== undefined ? s.fm : s.f0);
          }
          if (lowerName === 't') return (s) => s.t;
        }

        throw new Error(`Unknown variable "${rawName}". Use t, fm, Am, fc, Ac, pi`);
      }

      throw new Error(`Unexpected token "${tok.value}"`);
    }

    const astFn = parseExpression();
    if (pos < tokens.length) {
      throw new Error(`Unexpected token "${tokens[pos].value}"`);
    }

    const safeEvaluate = (scope) => {
      const val = astFn(scope);
      if (!Number.isFinite(val)) return 0;
      return Math.max(-50, Math.min(50, val));
    };

    // Smoke test at sample time
    safeEvaluate({ t: 0.001, fm: 280, Am: 1, fc: 10000, Ac: 1 });

    return {
      ok: true,
      error: null,
      usesAm,
      evaluate: safeEvaluate,
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Invalid expression',
      usesAm: false,
      evaluate: null,
    };
  }
}

/**
 * Evaluate any built-in waveform or compiled custom function at time t.
 */
export function evaluateMessageSignal({
  waveform = 'sine',
  Am = 1.0,
  fm = 280,
  Ac = 1.0,
  fc = 10000,
  t = 0,
  compiledCustom = null,
  scaleCustomByAm = true,
}) {
  const phaseAngle = 2 * Math.PI * fm * t;

  if (waveform === 'custom' && compiledCustom && compiledCustom.ok && compiledCustom.evaluate) {
    const raw = compiledCustom.evaluate({ t, fm, Am, fc, Ac });
    const shouldScale = scaleCustomByAm && !compiledCustom.usesAm;
    return shouldScale ? Am * raw : raw;
  }

  if (waveform === 'square') {
    return Math.cos(phaseAngle) >= 0 ? Am : -Am;
  }

  if (waveform === 'triangle') {
    const normPhase = (((fm * t + 0.5) % 1) + 1) % 1;
    return Am * (1 - 4 * Math.abs(normPhase - 0.5));
  }

  if (waveform === 'sawtooth') {
    const normPhase = (((fm * t) % 1) + 1) % 1;
    return Am * (2 * normPhase - 1);
  }

  if (waveform === 'multitone') {
    return Am * (0.65 * Math.cos(phaseAngle) + 0.35 * Math.sin(2.5 * phaseAngle));
  }

  if (waveform === 'sinc') {
    const cyclePhase = (((fm * t) % 1) + 1) % 1;
    const x = 4 * (cyclePhase - 0.5);
    if (Math.abs(x) < 1e-9) return Am;
    const px = Math.PI * x;
    return Am * (Math.sin(px) / px);
  }

  // Default: 'sine' (cosine phase-aligned)
  return Am * Math.cos(phaseAngle);
}
