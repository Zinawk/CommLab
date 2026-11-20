/**
 * Random Signal and Noise Simulator — Mathematical Engine
 * Task 7: Makol
 *
 * Models a discrete-amplitude random signal S[n] corrupted by additive random noise W[n]:
 *   X[n] = S[n] + W[n]
 *
 * Supports real-time streaming sample draws and computes:
 * 1. Sample & theoretical Mean (μ) and Variance (σ²) for Signal, Noise, and Received Signal
 * 2. PMF (Probability Mass Function) of discrete random signal S[n]
 * 3. PDF (Probability Density Function) of received signal X[n]
 * 4. CDF (Cumulative Distribution Function) of received signal X[n]
 */

export const DEFAULT_RANDOM_PARAMS = {
  signalModel: 'binary', // 'binary' | 'pam4'
  noiseModel: 'gaussian', // 'gaussian' | 'uniform'
  amplitude: 1.5, // Signal scale A in Volts (V)
  noiseStd: 0.6, // Noise standard deviation σ_w in Volts (V)
  noiseMean: 0.0, // Noise mean μ_w in Volts (V)
};

export const RANDOM_LIMITS = {
  amplitude: { min: 0.5, max: 3.0, step: 0.1 },
  noiseStd: { min: 0.1, max: 2.0, step: 0.1 },
  noiseMean: { min: -1.5, max: 1.5, step: 0.1 },
};

export const MAX_BUFFER_SAMPLES = 400;
export const DISPLAY_WINDOW_SAMPLES = 80;

/**
 * Validate and clamp simulation parameters.
 */
export function validateRandomParams(raw = {}) {
  const merged = { ...DEFAULT_RANDOM_PARAMS, ...raw };

  const validSignals = ['binary', 'pam4'];
  const validNoises = ['gaussian', 'uniform'];

  const clamp = (val, { min, max }, fallback) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, num));
  };

  return {
    signalModel: validSignals.includes(merged.signalModel) ? merged.signalModel : 'binary',
    noiseModel: validNoises.includes(merged.noiseModel) ? merged.noiseModel : 'gaussian',
    amplitude: Number(
      clamp(merged.amplitude, RANDOM_LIMITS.amplitude, DEFAULT_RANDOM_PARAMS.amplitude).toFixed(2)
    ),
    noiseStd: Number(
      clamp(merged.noiseStd, RANDOM_LIMITS.noiseStd, DEFAULT_RANDOM_PARAMS.noiseStd).toFixed(2)
    ),
    noiseMean: Number(
      clamp(merged.noiseMean, RANDOM_LIMITS.noiseMean, DEFAULT_RANDOM_PARAMS.noiseMean).toFixed(2)
    ),
  };
}

/**
 * Box-Muller transform for standard normal N(0, 1).
 */
function nextStandardNormal(rng = Math.random) {
  let u1 = rng();
  const u2 = rng();
  if (u1 < 1e-12) u1 = 1e-12;
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Generate raw independent random draws for streaming simulation.
 * Storing raw draws allows instant parameter re-evaluation even when paused.
 */
export function createSampleDraws(count, startIndex = 0, rng = Math.random) {
  const draws = new Array(count);
  for (let i = 0; i < count; i++) {
    draws[i] = {
      n: startIndex + i,
      uSym: rng(),
      zNorm: nextStandardNormal(rng),
      uUni: rng(),
    };
  }
  return draws;
}

/**
 * High-accuracy error function erf(z) (Abramowitz & Stegun 7.1.26, error < 1.5e-7).
 */
export function erf(z) {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z);
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t);
  return sign * (1 - poly * Math.exp(-x * x));
}

/**
 * Return discrete alphabet levels { value, prob } for the chosen Random Signal model.
 */
export function getSignalAlphabet(signalModel, A) {
  if (signalModel === 'pam4') {
    return [
      { value: -1.5 * A, prob: 0.25 },
      { value: -0.5 * A, prob: 0.25 },
      { value: 0.5 * A, prob: 0.25 },
      { value: 1.5 * A, prob: 0.25 },
    ];
  }
  return [
    { value: -A, prob: 0.5 },
    { value: A, prob: 0.5 },
  ];
}

function evalNoisePdf(w, noiseModel, muW, sigmaW) {
  if (sigmaW <= 1e-9) return 0;
  if (noiseModel === 'uniform') {
    const halfWidth = Math.sqrt(3) * sigmaW;
    return Math.abs(w - muW) <= halfWidth ? 1 / (2 * halfWidth) : 0;
  }
  const z = (w - muW) / sigmaW;
  return Math.exp(-0.5 * z * z) / (Math.sqrt(2 * Math.PI) * sigmaW);
}

function evalNoiseCdf(w, noiseModel, muW, sigmaW) {
  if (sigmaW <= 1e-9) return w >= muW ? 1 : 0;
  if (noiseModel === 'uniform') {
    const halfWidth = Math.sqrt(3) * sigmaW;
    const low = muW - halfWidth;
    if (w <= low) return 0;
    if (w >= muW + halfWidth) return 1;
    return (w - low) / (2 * halfWidth);
  }
  const z = (w - muW) / (Math.SQRT2 * sigmaW);
  return 0.5 * (1 + erf(z));
}

function computeMoments(arr) {
  const N = arr.length;
  if (N === 0) return { mean: 0, variance: 0, std: 0 };
  let sum = 0;
  for (let i = 0; i < N; i++) sum += arr[i];
  const mean = sum / N;

  let sqSum = 0;
  for (let i = 0; i < N; i++) {
    const d = arr[i] - mean;
    sqSum += d * d;
  }
  const variance = sqSum / N;
  return { mean, variance, std: Math.sqrt(variance) };
}

/**
 * Evaluate waveforms, sample/theoretical moments, PMF, PDF, and CDF from live sample draws.
 */
export function evaluateSimulationFromDraws(draws, rawParams) {
  const params = validateRandomParams(rawParams);
  const { signalModel, noiseModel, amplitude: A, noiseStd: sigmaW, noiseMean: muW } = params;

  const alphabet = getSignalAlphabet(signalModel, A);
  const M = alphabet.length;
  const N = draws.length;

  const theoSignalMean = alphabet.reduce((acc, item) => acc + item.value * item.prob, 0);
  const theoSignalVar = alphabet.reduce(
    (acc, item) => acc + (item.value - theoSignalMean) ** 2 * item.prob,
    0
  );
  const theoNoiseMean = muW;
  const theoNoiseVar = sigmaW * sigmaW;
  const theoCombinedMean = theoSignalMean + theoNoiseMean;
  const theoCombinedVar = theoSignalVar + theoNoiseVar;

  const maxAlphabetAbs = Math.abs(alphabet[M - 1].value);
  const xSpanHalf = maxAlphabetAbs + Math.max(0.8, 3.4 * sigmaW);
  const xMin = muW - xSpanHalf;
  const xMax = muW + xSpanHalf;
  const numBins = 22;
  const binWidth = (xMax - xMin) / numBins;

  if (N === 0) {
    return {
      params,
      sampleCount: 0,
      waveformPoints: [],
      moments: {
        signal: { mean: null, variance: null, std: null, theoMean: theoSignalMean, theoVar: theoSignalVar },
        noise: { mean: null, variance: null, std: null, theoMean: theoNoiseMean, theoVar: theoNoiseVar },
        combined: { mean: null, variance: null, std: null, theoMean: theoCombinedMean, theoVar: theoCombinedVar },
      },
      pmfData: alphabet.map((item) => ({
        level: Number(item.value.toFixed(2)),
        empiricalProb: 0,
        theoreticalProb: item.prob,
        count: 0,
      })),
      xMin,
      xMax,
      binWidth,
      pdfBins: [],
      pdfCurve: [],
      cdfPoints: [],
    };
  }

  const signalSamples = new Float64Array(N);
  const noiseSamples = new Float64Array(N);
  const combinedSamples = new Float64Array(N);
  const levelCounts = new Int32Array(M);
  const uniformHalfWidth = Math.sqrt(3) * sigmaW;

  for (let i = 0; i < N; i++) {
    const d = draws[i];

    let cumProb = 0;
    let chosenIdx = M - 1;
    for (let k = 0; k < M; k++) {
      cumProb += alphabet[k].prob;
      if (d.uSym <= cumProb) {
        chosenIdx = k;
        break;
      }
    }
    const sVal = alphabet[chosenIdx].value;
    levelCounts[chosenIdx] += 1;

    const wVal =
      noiseModel === 'uniform'
        ? muW + (2 * d.uUni - 1) * uniformHalfWidth
        : muW + sigmaW * d.zNorm;

    signalSamples[i] = sVal;
    noiseSamples[i] = wVal;
    combinedSamples[i] = sVal + wVal;
  }

  const signalStats = computeMoments(signalSamples);
  const noiseStats = computeMoments(noiseSamples);
  const combinedStats = computeMoments(combinedSamples);

  // Latest DISPLAY_WINDOW_SAMPLES for live scrolling time-domain display
  const startDisp = Math.max(0, N - DISPLAY_WINDOW_SAMPLES);
  const displayLen = N - startDisp;
  const waveformPoints = new Array(displayLen);
  for (let i = 0; i < displayLen; i++) {
    const idx = startDisp + i;
    waveformPoints[i] = {
      n: draws[idx].n,
      signal: signalSamples[idx],
      noise: noiseSamples[idx],
      combined: combinedSamples[idx],
    };
  }

  const pmfData = alphabet.map((item, idx) => ({
    level: Number(item.value.toFixed(2)),
    empiricalProb: levelCounts[idx] / N,
    theoreticalProb: item.prob,
    count: levelCounts[idx],
  }));

  const binCounts = new Int32Array(numBins);
  for (let i = 0; i < N; i++) {
    const idx = Math.floor((combinedSamples[i] - xMin) / binWidth);
    if (idx >= 0 && idx < numBins) {
      binCounts[idx] += 1;
    }
  }

  const pdfBins = new Array(numBins);
  for (let b = 0; b < numBins; b++) {
    const xCenter = xMin + (b + 0.5) * binWidth;
    pdfBins[b] = {
      x: xCenter,
      density: binCounts[b] / (N * binWidth),
    };
  }

  const curveSteps = 90;
  const pdfCurve = new Array(curveSteps + 1);
  const cdfPoints = new Array(curveSteps + 1);
  const sortedCombined = Float64Array.from(combinedSamples).sort();
  let sortPtr = 0;

  for (let i = 0; i <= curveSteps; i++) {
    const x = xMin + (i / curveSteps) * (xMax - xMin);

    let theoPdf = 0;
    let theoCdf = 0;
    for (let k = 0; k < M; k++) {
      theoPdf += alphabet[k].prob * evalNoisePdf(x - alphabet[k].value, noiseModel, muW, sigmaW);
      theoCdf += alphabet[k].prob * evalNoiseCdf(x - alphabet[k].value, noiseModel, muW, sigmaW);
    }

    while (sortPtr < N && sortedCombined[sortPtr] <= x) {
      sortPtr += 1;
    }

    pdfCurve[i] = { x, density: theoPdf };
    cdfPoints[i] = {
      x,
      empiricalCdf: sortPtr / N,
      theoreticalCdf: Math.min(1, Math.max(0, theoCdf)),
    };
  }

  return {
    params,
    sampleCount: N,
    waveformPoints,
    moments: {
      signal: { ...signalStats, theoMean: theoSignalMean, theoVar: theoSignalVar },
      noise: { ...noiseStats, theoMean: theoNoiseMean, theoVar: theoNoiseVar },
      combined: { ...combinedStats, theoMean: theoCombinedMean, theoVar: theoCombinedVar },
    },
    pmfData,
    xMin,
    xMax,
    binWidth,
    pdfBins,
    pdfCurve,
    cdfPoints,
  };
}

/**
 * Deterministic seeded PRNG (Mulberry32) for automated verification.
 */
function createSeededRng(seed) {
  let a = Math.floor(seed * 2147483647) || 987654321;
  return function nextUniform() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateRandomSignalAndNoise(rawParams, seed = 0.517, count = 400) {
  const rng = createSeededRng(seed);
  const draws = createSampleDraws(count, 0, rng);
  return evaluateSimulationFromDraws(draws, rawParams);
}

export function runRandomNoiseVerificationSuite() {
  const sim = simulateRandomSignalAndNoise(
    {
      signalModel: 'binary',
      noiseModel: 'gaussian',
      amplitude: 2.0,
      noiseStd: 0.8,
      noiseMean: 0.5,
    },
    0.12345,
    1000
  );

  const pmfSum = sim.pmfData.reduce((acc, d) => acc + d.empiricalProb, 0);
  const passPmf = Math.abs(pmfSum - 1.0) < 1e-9 && sim.pmfData.length === 2;

  const pdfArea = sim.pdfBins.reduce((acc, b) => acc + b.density * sim.binWidth, 0);
  const passPdf = pdfArea > 0.98 && pdfArea <= 1.0001;

  let monotone = true;
  for (let i = 1; i < sim.cdfPoints.length; i++) {
    if (
      sim.cdfPoints[i].empiricalCdf + 1e-12 < sim.cdfPoints[i - 1].empiricalCdf ||
      sim.cdfPoints[i].theoreticalCdf + 1e-12 < sim.cdfPoints[i - 1].theoreticalCdf
    ) {
      monotone = false;
    }
  }
  const passCdf =
    monotone &&
    sim.cdfPoints[0].theoreticalCdf < 0.02 &&
    sim.cdfPoints[sim.cdfPoints.length - 1].theoreticalCdf > 0.98;

  const passMoments =
    Math.abs(sim.moments.combined.theoMean - 0.5) < 1e-9 &&
    Math.abs(sim.moments.combined.theoVar - 4.64) < 1e-9 &&
    Math.abs(sim.moments.combined.mean - 0.5) < 0.2 &&
    Math.abs(sim.moments.combined.variance - 4.64) < 0.5;

  return [
    { name: 'PMF probabilities sum to 1.0000', passed: passPmf },
    { name: 'PDF normalized density integrates to ~1.00', passed: passPdf },
    { name: 'CDF monotonically non-decreasing from 0 to 1', passed: passCdf },
    { name: 'Sample & theoretical Mean and Variance match X = S + W', passed: passMoments },
  ];
}
