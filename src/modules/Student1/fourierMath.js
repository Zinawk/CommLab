import {
  compileCustomFunction,
  evaluateMessageSignal,
} from '../../utils/waveformParser.js';

/**
 * Fourier Analysis & Amplitude Modulation — Mathematical Engine
 * Task 1 (Biftu)
 */

export const TASK1_WAVEFORMS = [
  { id: 'square', label: 'Square', formula: 'A · sgn(sin(2π f₀ t))' },
  { id: 'triangle', label: 'Triangle', formula: 'A · tri(2π f₀ t)' },
  { id: 'sawtooth', label: 'Sawtooth', formula: '2A · (f₀t − ⌊f₀t + ½⌋)' },
  { id: 'half_rect', label: 'Half-Rect', formula: 'max(0, A · sin(2π f₀ t))' },
  { id: 'full_rect', label: 'Full-Rect', formula: 'A · |sin(2π f₀ t)|' },
  { id: 'pulse', label: 'Pulse (25%)', formula: 'A · rect_25%(f₀ t)' },
  { id: 'custom', label: 'Custom f(t)', formula: 'User Function x(t)' },
];

export const DEFAULT_TASK1_CUSTOM_EXPR = 'sin(2*pi*f0*t) + 0.5*cos(6*pi*f0*t)';

export const TASK1_FUNCTION_EXAMPLES = [
  { label: 'Odd Harmonics', expr: 'sin(2*pi*f0*t) + 0.5*sin(6*pi*f0*t)' },
  { label: 'Mixed Harmonic', expr: 'cos(2*pi*f0*t) + 0.6*sin(4*pi*f0*t) + 0.3*cos(6*pi*f0*t)' },
  { label: 'Exp Decay', expr: 'exp(-2.5*(f0*t % 1)) * sin(2*pi*f0*t)' },
  { label: 'Sinc Pulse', expr: 'sinc(4*((f0*t % 1) - 0.5))' },
  { label: 'Beat Wave', expr: 'sin(2*pi*f0*t) * cos(pi*f0*t)' },
  { label: 'Square+Tri', expr: '0.7*square(2*pi*f0*t) + 0.3*tri(4*(f0*t % 1) - 2)' },
];

export const DEFAULT_FOURIER_PARAMS = {
  waveform: 'square',
  customExpr: DEFAULT_TASK1_CUSTOM_EXPR,
  scaleCustomByA: true,
  harmonicsCount: 5, // N active harmonics
  amplitude: 1.0, // Peak amplitude A in Volts (V)
  fundamentalFreq: 2.0, // f0 in Hertz (Hz)
  // Amplitude & Frequency Modulation parameters
  modulationMode: 'none', // 'none' | 'envelope' | 'carrier' | 'fm_wave' | 'fm_carrier'
  modDepth: 0.6, // AM Modulation index / depth μ (0.1 - 1.6)
  modFreq: 0.5, // Modulating frequency fm (Hz) for Envelope AM & Waveform FM
  fmDev: 1.0, // Peak frequency deviation Δf (Hz) for Waveform FM
  fmSensitivity: 6.0, // Frequency sensitivity kf (Hz/V) for Carrier FM
  carrierAmp: 1.0, // Carrier amplitude Ac (V) for Carrier AM & Carrier FM
  carrierFreq: 16.0, // Carrier frequency fc (Hz) for Carrier AM & Carrier FM
};

export const FOURIER_LIMITS = {
  harmonicsCount: { min: 1, max: 25, step: 1 },
  amplitude: { min: 0.2, max: 3.0, step: 0.1 },
  fundamentalFreq: { min: 0.5, max: 5.0, step: 0.5 },
  modDepth: { min: 0.1, max: 1.6, step: 0.05 },
  modFreq: { min: 0.25, max: 4.0, step: 0.25 },
  fmDev: { min: 0.1, max: 4.0, step: 0.1 },
  fmSensitivity: { min: 1.0, max: 15.0, step: 0.5 },
  carrierAmp: { min: 0.4, max: 2.5, step: 0.1 },
  carrierFreq: { min: 6.0, max: 30.0, step: 1.0 },
};

const ZERO_EPS = 1e-11;

export function validateFourierParams(raw = {}) {
  const merged = { ...DEFAULT_FOURIER_PARAMS, ...raw };

  const clamp = (val, { min, max }, fallback) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };

  const validWaveforms = new Set(TASK1_WAVEFORMS.map((w) => w.id));
  const validModModes = new Set(['none', 'envelope', 'carrier', 'fm_wave', 'fm_carrier']);

  return {
    waveform: validWaveforms.has(merged.waveform) ? merged.waveform : 'square',
    customExpr: typeof merged.customExpr === 'string' ? merged.customExpr : DEFAULT_TASK1_CUSTOM_EXPR,
    scaleCustomByA: merged.scaleCustomByA !== false,
    harmonicsCount: Math.round(
      clamp(
        merged.harmonicsCount,
        FOURIER_LIMITS.harmonicsCount,
        DEFAULT_FOURIER_PARAMS.harmonicsCount
      )
    ),
    amplitude: Number(
      clamp(merged.amplitude, FOURIER_LIMITS.amplitude, DEFAULT_FOURIER_PARAMS.amplitude).toFixed(2)
    ),
    fundamentalFreq: Number(
      clamp(
        merged.fundamentalFreq,
        FOURIER_LIMITS.fundamentalFreq,
        DEFAULT_FOURIER_PARAMS.fundamentalFreq
      ).toFixed(2)
    ),
    modulationMode: validModModes.has(merged.modulationMode) ? merged.modulationMode : 'none',
    modDepth: Number(
      clamp(merged.modDepth, FOURIER_LIMITS.modDepth, DEFAULT_FOURIER_PARAMS.modDepth).toFixed(2)
    ),
    modFreq: Number(
      clamp(merged.modFreq, FOURIER_LIMITS.modFreq, DEFAULT_FOURIER_PARAMS.modFreq).toFixed(2)
    ),
    fmDev: Number(
      clamp(merged.fmDev, FOURIER_LIMITS.fmDev, DEFAULT_FOURIER_PARAMS.fmDev).toFixed(2)
    ),
    fmSensitivity: Number(
      clamp(
        merged.fmSensitivity,
        FOURIER_LIMITS.fmSensitivity,
        DEFAULT_FOURIER_PARAMS.fmSensitivity
      ).toFixed(2)
    ),
    carrierAmp: Number(
      clamp(merged.carrierAmp, FOURIER_LIMITS.carrierAmp, DEFAULT_FOURIER_PARAMS.carrierAmp).toFixed(2)
    ),
    carrierFreq: Number(
      clamp(merged.carrierFreq, FOURIER_LIMITS.carrierFreq, DEFAULT_FOURIER_PARAMS.carrierFreq).toFixed(1)
    ),
  };
}

export function evalIdealSquare(t, amplitude, f0) {
  const s = Math.sin(2 * Math.PI * f0 * t);
  if (Math.abs(s) <= ZERO_EPS) return 0;
  return s > 0 ? amplitude : -amplitude;
}

/**
 * Evaluate any Task 1 base waveform (or custom expression) at time t.
 */
export function evalTask1Waveform(t, params, compiledCustom = null) {
  const { waveform, amplitude: A, fundamentalFreq: f0, carrierAmp, carrierFreq, scaleCustomByA } = params;
  const phase = (((f0 * t) % 1) + 1) % 1;

  switch (waveform) {
    case 'square':
      return evalIdealSquare(t, A, f0);

    case 'triangle':
      return A * ((2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f0 * t)));

    case 'sawtooth':
      return 2 * A * (phase - 0.5);

    case 'half_rect':
      return Math.max(0, A * Math.sin(2 * Math.PI * f0 * t));

    case 'full_rect':
      return A * Math.abs(Math.sin(2 * Math.PI * f0 * t));

    case 'pulse':
      return phase < 0.25 ? A : 0;

    case 'custom': {
      const activeCustom = compiledCustom || compileCustomFunction(params.customExpr);
      if (activeCustom && activeCustom.ok && activeCustom.evaluate) {
        return evaluateMessageSignal({
          waveform: 'custom',
          Am: A,
          fm: f0,
          Ac: carrierAmp,
          fc: carrierFreq,
          t,
          compiledCustom: activeCustom,
          scaleCustomByAm: scaleCustomByA,
        });
      }
      return evalIdealSquare(t, A, f0);
    }

    default:
      return evalIdealSquare(t, A, f0);
  }
}

/**
 * Compute exact/numerical Fourier series coefficients { a0, harmonics: [{ order, an, bn, mag, isOdd }] }.
 */
function computeFourierSeriesCoefficients(params, maxOrder, compiledCustom = null) {
  const { waveform, amplitude: A, fundamentalFreq: f0 } = params;

  if (waveform === 'square') {
    const harmonics = [];
    for (let n = 1; n <= maxOrder; n++) {
      const isOdd = n % 2 === 1;
      const bn = isOdd ? (4 * A) / (Math.PI * n) : 0;
      harmonics.push({ order: n, an: 0, bn, mag: Math.abs(bn), isOdd });
    }
    return { a0: 0, totalPower: A * A, harmonics };
  }

  // Numerical Fourier integration over 1 period T0 = 1 / f0
  const M = 512;
  const T0 = 1 / f0;
  const dt = T0 / M;
  const samples = new Float64Array(M);

  let sum = 0;
  let sumSq = 0;
  for (let k = 0; k < M; k++) {
    const t = (k + 0.5) * dt;
    const val = evalTask1Waveform(t, params, compiledCustom);
    samples[k] = val;
    sum += val;
    sumSq += val * val;
  }

  const a0 = Math.abs(sum / M) < 1e-8 ? 0 : sum / M;
  const totalPower = sumSq / M;
  const harmonics = [];

  for (let n = 1; n <= maxOrder; n++) {
    let sumCos = 0;
    let sumSin = 0;
    const twoPiNf0 = 2 * Math.PI * n * f0;
    for (let k = 0; k < M; k++) {
      const t = (k + 0.5) * dt;
      const ang = twoPiNf0 * t;
      sumCos += samples[k] * Math.cos(ang);
      sumSin += samples[k] * Math.sin(ang);
    }
    let an = (2 / M) * sumCos;
    let bn = (2 / M) * sumSin;
    if (Math.abs(an) < 1e-7) an = 0;
    if (Math.abs(bn) < 1e-7) bn = 0;
    const mag = Math.hypot(an, bn);
    harmonics.push({
      order: n,
      an,
      bn,
      mag: mag < 1e-7 ? 0 : mag,
      isOdd: n % 2 === 1,
    });
  }

  return { a0, totalPower, harmonics };
}

/**
 * In-place radix-2 Cooley-Tukey FFT on power-of-2 arrays (re, im).
 * Used to compute exact FM Bessel and generalized Fourier sideband spectra.
 */
function fftComplex(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      const ti = im[i];
      re[i] = re[j];
      im[i] = im[j];
      re[j] = tr;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm;
        const vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;
        const nextWRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextWRe;
      }
    }
  }
}

/**
 * Compute Bessel coefficients J_k(beta) for -maxK <= k <= maxK via FFT of exp(j * beta * sin(u)).
 */
function computeBesselRange(beta) {
  const needed = Math.max(128, Math.ceil(Math.abs(beta) * 4 + 32));
  let M = 128;
  while (M < needed && M < 1024) M <<= 1;

  const re = new Float64Array(M);
  const im = new Float64Array(M);
  for (let i = 0; i < M; i++) {
    const u = (2 * Math.PI * i) / M;
    const phase = beta * Math.sin(u);
    re[i] = Math.cos(phase);
    im[i] = Math.sin(phase);
  }
  fftComplex(re, im);

  const half = M >> 1;
  return {
    M,
    getJ(k) {
      if (Math.abs(k) >= half) return 0;
      const idx = ((k % M) + M) % M;
      return re[idx] / M;
    },
  };
}

/**
 * Compute Fourier Spectrum for baseband, AM (Envelope / Carrier), or FM (Waveform / Carrier).
 */
export function computeFourierSpectrum(rawParams, compiledCustom = null) {
  const params = validateFourierParams(rawParams);
  const {
    waveform,
    harmonicsCount: N,
    fundamentalFreq: f0,
    modulationMode,
    modDepth,
    modFreq,
    fmDev,
    fmSensitivity,
    carrierAmp,
    carrierFreq,
  } = params;

  const isOddOnlyWaveform = waveform === 'square' || waveform === 'triangle';
  const maxActiveOrder = isOddOnlyWaveform ? 2 * N - 1 : N;
  const maxOrder = isOddOnlyWaveform ? Math.max(12, 2 * N + 1) : Math.max(12, N + 2);

  const { a0, totalPower: basePower, harmonics } = computeFourierSeriesCoefficients(
    params,
    maxOrder,
    compiledCustom
  );

  // Fundamental (or strongest harmonic) reference for relative ratios
  const firstNonZero = harmonics.find((h) => h.mag > 1e-5);
  const refAmp = harmonics[0]?.mag > 1e-5 ? harmonics[0].mag : firstNonZero?.mag || 1;

  const components = [];
  let capturedBasePower = a0 * a0;

  for (let i = 0; i < harmonics.length; i++) {
    const h = harmonics[i];
    const n = h.order;
    const isActive = isOddOnlyWaveform ? h.isOdd && n <= maxActiveOrder : n <= maxActiveOrder;
    const activeAmp = isActive ? h.mag : 0;

    const relativeRatio = refAmp > 1e-9 ? h.mag / refAmp : 0;
    const relativePercent = relativeRatio * 100;
    const dbValue =
      h.mag > 1e-9 && refAmp > 1e-9 ? Math.max(-60, 20 * Math.log10(h.mag / refAmp)) : -60;

    const powerContribution = isActive ? 0.5 * activeAmp * activeAmp : 0;
    if (isActive) capturedBasePower += powerContribution;

    const powerRatioPercent = basePower > 1e-9 ? (powerContribution / basePower) * 100 : 0;
    const cumulativePowerPercent = basePower > 1e-9 ? (capturedBasePower / basePower) * 100 : 100;

    components.push({
      order: n,
      m: h.isOdd ? (n + 1) / 2 : null,
      freqHz: n * f0,
      isOdd: h.isOdd,
      isActive,
      amplitude: activeAmp,
      theoreticalAmplitude: h.mag,
      relativeRatio,
      relativePercent,
      fractionalLabel:
        waveform === 'square'
          ? n === 1
            ? '1'
            : `1/${n}`
          : waveform === 'triangle'
          ? n === 1
            ? '1'
            : `1/${n}²`
          : `n=${n}`,
      dbValue,
      powerWatts: powerContribution,
      powerRatioPercent,
      cumulativePowerWatts: capturedBasePower,
      cumulativePowerPercent,
    });
  }

  // Sideband stems when Amplitude Modulation is active
  const modStems = [];
  let maxDisplayFreq = maxOrder * f0;
  let displayPeakAmp = Math.max(refAmp, ...components.map((c) => c.amplitude));
  let totalModPower = basePower;
  let capturedModPower = capturedBasePower;

  if (modulationMode === 'envelope') {
    // y(t) = [1 + μ cos(2π fm t)] * x(t)
    totalModPower = basePower * (1 + 0.5 * modDepth * modDepth);
    capturedModPower = capturedBasePower * (1 + 0.5 * modDepth * modDepth);

    if (Math.abs(a0) > 1e-5) {
      modStems.push({
        freqHz: modFreq,
        amp: modDepth * Math.abs(a0),
        kind: 'sideband',
        label: `f_m`,
      });
    }

    for (const c of components) {
      if (!c.isActive || c.amplitude <= 1e-6) continue;
      const sbAmp = 0.5 * modDepth * c.amplitude;
      const fLow = Math.abs(c.freqHz - modFreq);
      const fHigh = c.freqHz + modFreq;
      modStems.push({
        freqHz: fLow,
        amp: sbAmp,
        kind: 'sideband',
        label: `${c.order}f₀−fₘ`,
      });
      modStems.push({
        freqHz: fHigh,
        amp: sbAmp,
        kind: 'sideband',
        label: `${c.order}f₀+fₘ`,
      });
      if (fHigh > maxDisplayFreq) maxDisplayFreq = fHigh;
    }
  } else if (modulationMode === 'carrier') {
    // s(t) = [Ac + μ x(t)] * cos(2π fc t)
    const carrierLineAmp = Math.abs(carrierAmp + modDepth * a0);
    modStems.push({
      freqHz: carrierFreq,
      amp: carrierLineAmp,
      kind: 'carrier',
      label: `fc`,
    });
    displayPeakAmp = carrierLineAmp;
    maxDisplayFreq = carrierFreq + maxActiveOrder * f0 + 2;

    const acTotalPower = 0.5 * (carrierAmp + modDepth * a0) ** 2 + 0.5 * modDepth * modDepth * Math.max(0, basePower - a0 * a0);
    const acCapturedPower = 0.5 * (carrierAmp + modDepth * a0) ** 2 + 0.5 * modDepth * modDepth * Math.max(0, capturedBasePower - a0 * a0);
    totalModPower = acTotalPower;
    capturedModPower = acCapturedPower;

    for (const c of components) {
      if (!c.isActive || c.amplitude <= 1e-6) continue;
      const sbAmp = 0.5 * modDepth * c.amplitude;
      if (sbAmp > displayPeakAmp) displayPeakAmp = sbAmp;

      const fLsb = carrierFreq - c.freqHz;
      const fUsb = carrierFreq + c.freqHz;
      if (fLsb >= 0) {
        modStems.push({
          freqHz: fLsb,
          amp: sbAmp,
          kind: 'sideband',
          label: `fc−${c.order}f₀`,
        });
      }
      modStems.push({
        freqHz: fUsb,
        amp: sbAmp,
        kind: 'sideband',
        label: `fc+${c.order}f₀`,
      });
    }
  } else if (modulationMode === 'fm_wave') {
    // Frequency-modulated waveform: f_inst(t) = f0 + Δf cos(2π fm t)
    // Each active harmonic n splits into Bessel sidebands at |n*f0 + k*fm| with amp c_n |J_k(n*beta)|
    const beta = fmDev / Math.max(0.05, modFreq);
    const stemMap = new Map();
    const addStemPhasor = (freq, reVal, imVal, kind, label) => {
      const fRounded = Math.round(freq * 1000) / 1000;
      const existing = stemMap.get(fRounded);
      if (existing) {
        existing.re += reVal;
        existing.im += imVal;
      } else {
        stemMap.set(fRounded, { freqHz: freq, re: reVal, im: imVal, kind, label });
      }
    };

    if (Math.abs(a0) > 1e-5) {
      addStemPhasor(0, a0, 0, 'carrier', 'DC');
    }

    for (const c of components) {
      if (!c.isActive || c.amplitude <= 1e-6) continue;
      const h = harmonics.find((item) => item.order === c.order);
      if (!h) continue;
      const nBeta = c.order * beta;
      const bessel = computeBesselRange(nBeta);
      const maxK = Math.min(40, Math.ceil(Math.abs(nBeta) + 8));

      // Harmonic phasor: Re{ (an - j*bn) * exp(j 2π n f0 t) }
      for (let k = -maxK; k <= maxK; k++) {
        const jk = bessel.getJ(k);
        if (Math.abs(jk) < 0.004) continue;
        const pRe = h.an * jk;
        const pIm = -h.bn * jk;
        const rawFreq = c.freqHz + k * modFreq;
        const foldedFreq = Math.abs(rawFreq);
        const kind = k === 0 ? 'carrier' : 'sideband';
        const signStr = k > 0 ? `+${k}` : `${k}`;
        const label = k === 0 ? `${c.order}f₀` : `${c.order}f₀${signStr}fₘ`;
        if (rawFreq >= 0) {
          addStemPhasor(foldedFreq, pRe, pIm, kind, label);
        } else {
          // Conjugate contribution from negative frequency folding
          addStemPhasor(foldedFreq, pRe, -pIm, kind, label);
        }
      }
    }

    displayPeakAmp = 0.1;
    let stemPower = 0;
    for (const entry of stemMap.values()) {
      const amp = Math.hypot(entry.re, entry.im);
      if (amp < 1e-4) continue;
      if (entry.freqHz > maxDisplayFreq) maxDisplayFreq = entry.freqHz;
      if (amp > displayPeakAmp) displayPeakAmp = amp;
      stemPower += entry.freqHz < 1e-6 ? amp * amp : 0.5 * amp * amp;
      modStems.push({
        freqHz: entry.freqHz,
        amp,
        kind: entry.kind,
        label: entry.label,
      });
    }
    modStems.sort((a, b) => a.freqHz - b.freqHz);
    // Prune max display freq sensibly when high harmonics spread
    maxDisplayFreq = Math.max(maxOrder * f0, Math.min(maxDisplayFreq + modFreq, maxOrder * f0 + Math.max(12, maxActiveOrder * fmDev + 4 * modFreq)));
    totalModPower = basePower;
    capturedModPower = Math.min(basePower, Math.max(stemPower, capturedBasePower * 0.999));
  } else if (modulationMode === 'fm_carrier') {
    // Carrier FM: s(t) = Ac cos(2π fc t + 2π kf ∫ x_N(τ) dτ)
    const activeHarmonics = harmonics.filter((h) =>
      isOddOnlyWaveform ? h.isOdd && h.order <= maxActiveOrder && h.mag > 0 : h.order <= maxActiveOrder && h.mag > 0
    );

    const M = 512;
    const T0 = 1 / f0;
    const re = new Float64Array(M);
    const im = new Float64Array(M);
    let maxAcSwing = 0;

    for (let i = 0; i < M; i++) {
      const t = (i / M) * T0;
      let xAc = 0;
      let psi = 0;
      for (let idx = 0; idx < activeHarmonics.length; idx++) {
        const h = activeHarmonics[idx];
        const ang = 2 * Math.PI * h.order * f0 * t;
        xAc += h.an * Math.cos(ang) + h.bn * Math.sin(ang);
        psi += (fmSensitivity * (h.an * Math.sin(ang) + h.bn * (1 - Math.cos(ang)))) / (h.order * f0);
      }
      if (Math.abs(xAc) > maxAcSwing) maxAcSwing = Math.abs(xAc);
      re[i] = Math.cos(psi);
      im[i] = Math.sin(psi);
    }

    fftComplex(re, im);

    const fCenter = carrierFreq + fmSensitivity * a0;
    const half = M >> 1;
    const thresh = carrierAmp * 0.004;
    let capturedCarrierFmPower = 0;
    displayPeakAmp = 0.1;

    // Collect significant sideband lines around fCenter + m * f0
    let maxStemFreq = fCenter + f0;
    for (let m = -(half - 1); m < half; m++) {
      const idx = ((m % M) + M) % M;
      const magNorm = Math.hypot(re[idx], im[idx]) / M;
      const amp = carrierAmp * magNorm;
      if (amp < thresh) continue;

      const fLine = fCenter + m * f0;
      if (fLine < 0) continue;

      capturedCarrierFmPower += 0.5 * amp * amp;
      if (amp > displayPeakAmp) displayPeakAmp = amp;
      if (fLine > maxStemFreq) maxStemFreq = fLine;

      modStems.push({
        freqHz: fLine,
        amp,
        kind: m === 0 ? 'carrier' : 'sideband',
        label: m === 0 ? 'fc' : m > 0 ? `fc+${m}f₀` : `fc−${Math.abs(m)}f₀`,
      });
    }
    modStems.sort((a, b) => a.freqHz - b.freqHz);

    const deltaF = fmSensitivity * maxAcSwing;
    maxDisplayFreq = Math.max(
      carrierFreq + maxActiveOrder * f0 + 2,
      Math.min(Math.max(maxStemFreq + 2 * f0, fCenter + deltaF + 4 * f0), fCenter + 80)
    );
    totalModPower = 0.5 * carrierAmp * carrierAmp;
    capturedModPower = Math.min(totalModPower, capturedCarrierFmPower);
  }

  // Theoretical decay envelopes (shown for square & triangle baseband)
  const envSteps = 120;
  const envelopeLinear = [];
  const envelopeRelative = [];
  const envelopeDb = [];
  const envelopePower = [];

  if ((waveform === 'square' || waveform === 'triangle') && modulationMode === 'none') {
    const A = params.amplitude;
    for (let i = 0; i <= envSteps; i++) {
      const kFrac = 0.8 + (i / envSteps) * (maxOrder - 0.3);
      const freq = kFrac * f0;
      const linVal =
        waveform === 'square' ? (4 * A) / (Math.PI * kFrac) : (8 * A) / (Math.PI * Math.PI * kFrac * kFrac);
      const relVal = waveform === 'square' ? 1 / kFrac : 1 / (kFrac * kFrac);
      envelopeLinear.push({ freqHz: freq, order: kFrac, val: linVal });
      envelopeRelative.push({ freqHz: freq, order: kFrac, val: relVal });
      envelopeDb.push({ freqHz: freq, order: kFrac, val: 20 * Math.log10(relVal) });
      envelopePower.push({ freqHz: freq, order: kFrac, val: 0.5 * linVal * linVal });
    }
  }

  const powerRatioPercent =
    totalModPower > 1e-9
      ? Math.min(100, (capturedModPower / totalModPower) * 100)
      : 100;
  const rmsError = Math.sqrt(Math.max(0, totalModPower - capturedModPower));

  // FM summary metrics for display
  let fmMetrics = null;
  if (modulationMode === 'fm_wave') {
    const beta = fmDev / Math.max(0.05, modFreq);
    fmMetrics = {
      deltaF: fmDev,
      beta,
      carsonBw: 2 * (fmDev + modFreq),
      fMin: f0 - fmDev,
      fMax: f0 + fmDev,
    };
  } else if (modulationMode === 'fm_carrier') {
    // Estimate peak x(t) swing from active harmonics over 1 period
    const activeHarmonics = harmonics.filter((h) =>
      isOddOnlyWaveform ? h.isOdd && h.order <= maxActiveOrder && h.mag > 0 : h.order <= maxActiveOrder && h.mag > 0
    );
    let maxPos = -Infinity;
    let minVal = Infinity;
    for (let k = 0; k < 256; k++) {
      const t = (k / 256) / f0;
      let val = a0;
      for (const h of activeHarmonics) {
        const ang = 2 * Math.PI * h.order * f0 * t;
        val += h.an * Math.cos(ang) + h.bn * Math.sin(ang);
      }
      if (val > maxPos) maxPos = val;
      if (val < minVal) minVal = val;
    }
    const peakSwing = Math.max(0.5 * (maxPos - minVal), 0);
    const deltaF = fmSensitivity * peakSwing;
    const beta = deltaF / Math.max(0.05, f0);
    fmMetrics = {
      deltaF,
      beta,
      carsonBw: 2 * (deltaF + f0),
      fMin: carrierFreq + fmSensitivity * minVal,
      fMax: carrierFreq + fmSensitivity * maxPos,
    };
  }

  return {
    N,
    waveform,
    modulationMode,
    a0,
    maxOddOrder: maxActiveOrder,
    maxActiveOrder,
    maxOrder,
    maxFreq: maxDisplayFreq,
    components,
    modStems,
    envelopeLinear,
    envelopeRelative,
    envelopeDb,
    envelopePower,
    fundamentalAmp: displayPeakAmp,
    totalSquarePower: totalModPower,
    capturedPower: capturedModPower,
    powerRatioPercent,
    rmsError,
    fmMetrics,
  };
}

/**
 * Compute time-domain waveforms: ideal target, Fourier partial sum x_N(t),
 * optional individual harmonic traces, and AM/FM modulated signals + guides.
 */
export function computeTimeDomainWaveforms(
  rawParams,
  maxDisplayedIndividual = 7,
  compiledCustom = null
) {
  const params = validateFourierParams(rawParams);
  const {
    waveform,
    harmonicsCount: N,
    amplitude: A,
    fundamentalFreq: f0,
    modulationMode,
    modDepth,
    modFreq,
    fmDev,
    fmSensitivity,
    carrierAmp,
    carrierFreq,
  } = params;

  const isOddOnlyWaveform = waveform === 'square' || waveform === 'triangle';
  const maxActiveOrder = isOddOnlyWaveform ? 2 * N - 1 : N;

  const { a0, harmonics } = computeFourierSeriesCoefficients(
    params,
    maxActiveOrder,
    compiledCustom
  );

  const activeTerms = harmonics.filter((h) =>
    isOddOnlyWaveform ? h.isOdd && h.order <= maxActiveOrder && h.mag > 0 : h.order <= maxActiveOrder && h.mag > 0
  );

  const period = 1 / f0;
  const tStart = 0;
  // Choose time window so both fundamental and modulation envelope/warping are clearly visible
  let tEnd = 2 * period;
  if (modulationMode === 'envelope' || modulationMode === 'fm_wave') {
    const modPeriod = 1 / Math.max(0.25, modFreq);
    tEnd = Math.max(2 * period, Math.min(6 * period, 1.5 * modPeriod));
  } else if (modulationMode === 'carrier' || modulationMode === 'fm_carrier') {
    tEnd = 2 * period;
  }

  const numSamples = 1000;
  const dt = (tEnd - tStart) / numSamples;

  const shownCount = Math.min(activeTerms.length, maxDisplayedIndividual);
  const individualTraces = activeTerms.slice(0, shownCount).map((term) => ({
    order: term.order,
    freqHz: term.order * f0,
    coeff: term.mag,
    fractionLabel: term.order === 1 ? '1' : waveform === 'square' ? `1/${term.order}` : `n=${term.order}`,
    values: new Array(numSamples + 1),
  }));

  const points = new Array(numSamples + 1);
  let peakApprox = 0;
  let maxAbsIdeal = 0;

  // Pre-scan ideal signal peak over 1 period for envelope / reference scaling
  let idealAbsPeak = 0;
  for (let k = 0; k < 256; k++) {
    const val = Math.abs(evalTask1Waveform((k / 256) * period, params, compiledCustom));
    if (val > idealAbsPeak) idealAbsPeak = val;
  }
  idealAbsPeak = Math.max(idealAbsPeak, A, 0.1);

  for (let i = 0; i <= numSamples; i++) {
    const t = tStart + i * dt;
    const baseIdeal = evalTask1Waveform(t, params, compiledCustom);

    let baseRecon = a0;
    for (let mIdx = 0; mIdx < activeTerms.length; mIdx++) {
      const term = activeTerms[mIdx];
      const ang = 2 * Math.PI * term.order * f0 * t;
      const hVal = term.an * Math.cos(ang) + term.bn * Math.sin(ang);
      baseRecon += hVal;
      if (mIdx < shownCount) {
        individualTraces[mIdx].values[i] = hVal;
      }
    }

    let idealOut = baseIdeal;
    let reconOut = baseRecon;
    let envPos = null;
    let envNeg = null;
    let refTrace = null;
    let instFreq = f0;

    if (modulationMode === 'envelope') {
      const modFactor = 1 + modDepth * Math.cos(2 * Math.PI * modFreq * t);
      idealOut = modFactor * baseIdeal;
      reconOut = modFactor * baseRecon;
      envPos = idealAbsPeak * modFactor;
      envNeg = -idealAbsPeak * modFactor;
    } else if (modulationMode === 'carrier') {
      const cosCarrier = Math.cos(2 * Math.PI * carrierFreq * t);
      const envIdeal = carrierAmp + modDepth * baseIdeal;
      const envRecon = carrierAmp + modDepth * baseRecon;
      idealOut = envIdeal * cosCarrier;
      reconOut = envRecon * cosCarrier;
      envPos = envRecon;
      envNeg = -envRecon;
      instFreq = carrierFreq;
    } else if (modulationMode === 'fm_wave') {
      // Instantaneous frequency f_inst(t) = f0 + Δf cos(2π fm t)
      const phiCycles = f0 * t + (fmDev / (2 * Math.PI * modFreq)) * Math.sin(2 * Math.PI * modFreq * t);
      const tEff = phiCycles / f0;
      idealOut = evalTask1Waveform(tEff, params, compiledCustom);
      let fmRecon = a0;
      for (let mIdx = 0; mIdx < activeTerms.length; mIdx++) {
        const term = activeTerms[mIdx];
        const ang = 2 * Math.PI * term.order * phiCycles;
        fmRecon += term.an * Math.cos(ang) + term.bn * Math.sin(ang);
      }
      reconOut = fmRecon;
      refTrace = baseRecon; // Unmodulated wave for visual compression/stretching comparison
      instFreq = f0 + fmDev * Math.cos(2 * Math.PI * modFreq * t);
    } else if (modulationMode === 'fm_carrier') {
      // Exact analytical integral of x_N(t) for carrier phase
      let integralX = a0 * t;
      for (let mIdx = 0; mIdx < activeTerms.length; mIdx++) {
        const term = activeTerms[mIdx];
        const w = 2 * Math.PI * term.order * f0;
        const ang = w * t;
        integralX += (term.an * Math.sin(ang) + term.bn * (1 - Math.cos(ang))) / w;
      }
      const totalPhase = 2 * Math.PI * (carrierFreq * t + fmSensitivity * integralX);
      reconOut = carrierAmp * Math.cos(totalPhase);
      idealOut = reconOut;
      envPos = carrierAmp;
      envNeg = -carrierAmp;
      refTrace = (baseRecon / idealAbsPeak) * (carrierAmp * 0.72);
      instFreq = carrierFreq + fmSensitivity * baseRecon;
    }

    const absRecon = Math.abs(reconOut);
    if (absRecon > peakApprox) peakApprox = absRecon;
    if (Math.abs(idealOut) > maxAbsIdeal) maxAbsIdeal = Math.abs(idealOut);

    points[i] = {
      t,
      baseIdeal,
      baseRecon,
      ideal: idealOut,
      reconstructed: reconOut,
      envPos,
      envNeg,
      refTrace,
      instFreq,
    };
  }

  const overshootPercent =
    idealAbsPeak > 1e-6 && modulationMode === 'none'
      ? Math.max(0, ((peakApprox - idealAbsPeak) / idealAbsPeak) * 100)
      : 0;

  return {
    tStart,
    tEnd,
    period,
    points,
    individualTraces,
    peakApprox,
    maxAbsSignal: Math.max(peakApprox, maxAbsIdeal, modulationMode === 'fm_carrier' ? carrierAmp : A),
    idealAbsPeak,
    overshootPercent,
    theoreticalGibbsLimit: 17.89797,
    shownCount,
  };
}

/**
 * Self-contained verification suite verifying square-wave properties.
 */
export function runFourierVerificationSuite() {
  const A = 2.0;
  const f0 = 1.0;
  const spec = computeFourierSpectrum({ waveform: 'square', harmonicsCount: 10, amplitude: A, fundamentalFreq: f0 });
  const b1 = (4 * A) / Math.PI;

  const oddChecks = [3, 5, 7, 9].every((order) => {
    const comp = spec.components.find((c) => c.order === order);
    const expected = b1 / order;
    return comp && Math.abs(comp.theoreticalAmplitude - expected) < 1e-10;
  });

  const evenChecks = spec.components
    .filter((c) => !c.isOdd)
    .every((c) => c.amplitude === 0 && c.theoreticalAmplitude === 0);

  const spec25 = computeFourierSpectrum({ waveform: 'square', harmonicsCount: 25, amplitude: A, fundamentalFreq: f0 });
  const parsevalPassed = spec25.powerRatioPercent > 98.7 && spec25.powerRatioPercent <= 100;

  const wave25 = computeTimeDomainWaveforms({ waveform: 'square', harmonicsCount: 25, amplitude: 1.0, fundamentalFreq: 1.0 });
  const gibbsPassed = wave25.peakApprox > 1.15 && wave25.peakApprox < 1.19;

  return [
    { name: '1/n Harmonic Decay: b_n = b₁ / n for all odd n', passed: oddChecks },
    { name: 'Odd Harmonics Only: b_2k = 0 for all even k', passed: evenChecks },
    { name: 'Parseval Identity: P_N → A² as N increases', passed: parsevalPassed },
    { name: 'Gibbs Phenomenon: peak overshoot converges to ~17.9%', passed: gibbsPassed },
  ];
}
