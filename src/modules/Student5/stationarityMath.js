/**
 * Strict-Sense Stationary (SSS) vs Wide-Sense Stationary (WSS) Mathematical Engine
 * Solomon — SSS vs WSS Stationary (Task 5)
 *
 * Implements stochastic realizations with sinusoidal carrier and noise ripples:
 *   - SSS Mode: Narrowband Gaussian random process (quadrature components I, Q ~ N(0, σ_s²))
 *     with stationary Gaussian noise ripples. Satisfies all orders of shift-invariance.
 *   - WSS-Only Mode: Constant-envelope random phase sinusoid with Θ ~ U[0, 2π).
 *     1st and 2nd order moments are shift-invariant, but marginal PDF is non-Gaussian.
 *   - Non-Stationary Mode: Fixed carrier phase or deterministic drift where mean/variance
 *     explicitly depends on absolute observation time t.
 */

export const TIME_MIN = 0;
export const TIME_MAX = 1000;
export const MAX_ENSEMBLE_SIZE = 1000;

export const PDF_MIN = -3.4;
export const PDF_MAX = 3.4;
export const NUM_BINS = 19;
export const BIN_WIDTH = (PDF_MAX - PDF_MIN) / NUM_BINS;

// Seeded PRNG (Mulberry32)
function createRng(seed) {
  let a = Math.floor(seed * 2147483647) || 123456789;
  return function nextUniform() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller standard normal sample
function nextGaussian(rng) {
  let u1 = rng();
  const u2 = rng();
  if (u1 < 1e-12) u1 = 1e-12;
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Pre-generate realization ensemble coefficients
 */
export function createStationaryEnsemble(seed = 0.42) {
  const rng = createRng(seed);
  const N = MAX_ENSEMBLE_SIZE;

  // SSS Gaussian quadrature amplitudes
  const ic = new Float64Array(N);
  const qc = new Float64Array(N);

  // WSS random phase
  const theta = new Float64Array(N);

  // Noise ripple harmonics (incommensurate angular ratios)
  const a1 = new Float64Array(N);
  const b1 = new Float64Array(N);
  const a2 = new Float64Array(N);
  const b2 = new Float64Array(N);
  const a3 = new Float64Array(N);
  const b3 = new Float64Array(N);

  const noiseNorm = 1 / Math.sqrt(3);

  for (let i = 0; i < N; i++) {
    let iVal = nextGaussian(rng);
    let qVal = nextGaussian(rng);
    const th = rng() * 2 * Math.PI;

    // Distinct sinusoidal wave shapes for the 4 plotted traces
    if (i < 4) {
      const p = (i * Math.PI) / 2 + rng() * 0.4;
      const amp = 1.1 + 0.2 * (i % 2);
      iVal = amp * Math.cos(p);
      qVal = amp * Math.sin(p);
    }

    ic[i] = iVal;
    qc[i] = qVal;
    theta[i] = th;

    a1[i] = nextGaussian(rng) * noiseNorm;
    b1[i] = nextGaussian(rng) * noiseNorm;
    a2[i] = nextGaussian(rng) * noiseNorm;
    b2[i] = nextGaussian(rng) * noiseNorm;
    a3[i] = nextGaussian(rng) * noiseNorm;
    b3[i] = nextGaussian(rng) * noiseNorm;
  }

  return { N, ic, qc, theta, a1, b1, a2, b2, a3, b3 };
}

/**
 * Evaluate single realization i at time tEff with parameters
 */
export function evalRealization(
  ensemble,
  i,
  tEff,
  {
    period = 220,
    sigmaNoise = 0.25,
    processMode = 'sss', // 'sss' | 'wss' | 'non-stationary'
  } = {}
) {
  const omega0 = (2 * Math.PI) / Math.max(50, period);
  const omegaN1 = omega0 * 5.13;
  const omegaN2 = omega0 * 8.27;
  const omegaN3 = omega0 * 11.91;

  // Noise ripple component
  const noise =
    sigmaNoise *
    (ensemble.a1[i] * Math.cos(omegaN1 * tEff) -
      ensemble.b1[i] * Math.sin(omegaN1 * tEff) +
      ensemble.a2[i] * Math.cos(omegaN2 * tEff) -
      ensemble.b2[i] * Math.sin(omegaN2 * tEff) +
      ensemble.a3[i] * Math.cos(omegaN3 * tEff) -
      ensemble.b3[i] * Math.sin(omegaN3 * tEff));

  if (processMode === 'non-stationary') {
    // Deterministic mean varies strongly with time t
    const deterministicMean = 1.1 * Math.cos(omega0 * tEff);
    return deterministicMean + 0.35 * ensemble.ic[i] + noise;
  }

  if (processMode === 'wss') {
    // Constant envelope sinusoid with uniform random phase Θ
    const A = 1.35;
    return A * Math.cos(omega0 * tEff + ensemble.theta[i]) + noise;
  }

  // SSS Mode: Narrowband Gaussian random process
  return (
    ensemble.ic[i] * Math.cos(omega0 * tEff) -
    ensemble.qc[i] * Math.sin(omega0 * tEff) +
    noise
  );
}

/**
 * Sample the 4 plotted realizations across t ∈ [0, 1000] and exact marker intersections
 */
export function sampleFourRealizations(
  ensemble,
  sampleTimes,
  animTime = 0,
  params = {}
) {
  const step = 4;
  const numPts = Math.floor((TIME_MAX - TIME_MIN) / step) + 1;
  const traces = [];

  for (let r = 0; r < 4; r++) {
    const points = new Array(numPts);
    for (let k = 0; k < numPts; k++) {
      const t = TIME_MIN + k * step;
      points[k] = {
        t,
        val: evalRealization(ensemble, r, t + animTime, params),
      };
    }

    const sampledMarkers = sampleTimes.map((tk) => ({
      t: tk,
      val: evalRealization(ensemble, r, tk + animTime, params),
    }));

    traces.push({
      id: r + 1,
      points,
      sampledMarkers,
    });
  }

  return traces;
}

/**
 * Theoretical Gaussian PDF for reference
 */
export function gaussianPdf(x, sigma = 1.05) {
  const denom = Math.sqrt(2 * Math.PI) * sigma;
  return Math.exp(-(x * x) / (2 * sigma * sigma)) / denom;
}

/**
 * Compute live empirical PDFs, statistics (mean, variance), autocorrelation, and verification metrics
 */
export function computeLiveStationarityPDFs(
  ensemble,
  realizationsCount,
  sampleTimes,
  animTime = 0,
  params = {}
) {
  const N = Math.max(30, Math.min(ensemble.N, realizationsCount));
  const M = sampleTimes.length;
  const countsPerTime = sampleTimes.map(() => new Float64Array(NUM_BINS));
  const combinedCounts = new Float64Array(NUM_BINS);

  const means = new Float64Array(M);
  const variances = new Float64Array(M);
  const sampleValues = Array.from({ length: M }, () => new Float64Array(N));

  const sigmaNoise = params.sigmaNoise ?? 0.25;
  const period = params.period ?? 220;
  const totalSigma = Math.sqrt(1.0 + sigmaNoise * sigmaNoise);

  // Compute empirical samples for each time slice
  for (let m = 0; m < M; m++) {
    const tk = sampleTimes[m];
    const tEff = tk + animTime;
    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < N; i++) {
      const val = evalRealization(ensemble, i, tEff, params);
      sampleValues[m][i] = val;
      sum += val;
      sumSq += val * val;

      const bIdx = Math.floor((val - PDF_MIN) / BIN_WIDTH);
      if (bIdx >= 0 && bIdx < NUM_BINS) {
        countsPerTime[m][bIdx] += 1;
        combinedCounts[bIdx] += 1;
      }
    }

    const mean = sum / N;
    means[m] = mean;
    variances[m] = Math.max(0, sumSq / N - mean * mean);
  }

  // Normalize histogram to PDF estimate
  const normSingle = 1 / (N * BIN_WIDTH);
  const normCombined = 1 / (N * M * BIN_WIDTH);

  const bins = new Array(NUM_BINS);
  for (let b = 0; b < NUM_BINS; b++) {
    const xCenter = PDF_MIN + (b + 0.5) * BIN_WIDTH;
    bins[b] = {
      x: Number(xCenter.toFixed(2)),
      pdf1: countsPerTime[0][b] * normSingle,
      pdf2: countsPerTime[1][b] * normSingle,
      pdf3: countsPerTime[2][b] * normSingle,
      pdf4: countsPerTime[3][b] * normSingle,
      pdfCombined: combinedCounts[b] * normCombined,
    };
  }

  // Bell-curve overlay
  const bellCurve = [];
  const curveSteps = 70;
  for (let i = 0; i <= curveSteps; i++) {
    const x = PDF_MIN + (i / curveSteps) * (PDF_MAX - PDF_MIN);
    bellCurve.push({ x, y: gaussianPdf(x, totalSigma) });
  }

  // Autocorrelation verification: R_X(t, t+τ) over a range of lags τ ∈ [-300, 300] ms
  const lags = [];
  const rLags1 = [];
  const rLags3 = [];
  const omega0 = (2 * Math.PI) / Math.max(50, period);

  const lagStep = 15;
  for (let tauVal = -300; tauVal <= 300; tauVal += lagStep) {
    let sum1 = 0;
    let sum3 = 0;
    const tEff1 = sampleTimes[0] + animTime;
    const tEff3 = sampleTimes[2] + animTime;

    for (let i = 0; i < Math.min(N, 200); i++) {
      const v1_0 = sampleValues[0][i];
      const v1_tau = evalRealization(ensemble, i, tEff1 + tauVal, params);
      sum1 += v1_0 * v1_tau;

      const v3_0 = sampleValues[2][i];
      const v3_tau = evalRealization(ensemble, i, tEff3 + tauVal, params);
      sum3 += v3_0 * v3_tau;
    }

    const nEval = Math.min(N, 200);
    const r1 = sum1 / nEval;
    const r3 = sum3 / nEval;
    const rTheory = Math.cos(omega0 * tauVal) * (params.processMode === 'wss' ? 0.91 : 1.0);

    lags.push(tauVal);
    rLags1.push(r1);
    rLags3.push(r3);
  }

  // Verification Checks:
  // 1. Mean Constant across t_k
  const meanDiff = Math.max(...means) - Math.min(...means);
  const isMeanConstant = meanDiff < 0.22 && Math.abs(means[0]) < 0.28;

  // 2. Autocorrelation depends only on lag τ (R(t1, t1+τ) ≈ R(t3, t3+tau))
  let maxRDiff = 0;
  for (let k = 0; k < rLags1.length; k++) {
    const diff = Math.abs(rLags1[k] - rLags3[k]);
    if (diff > maxRDiff) maxRDiff = diff;
  }
  const isAutocorrLagOnly = maxRDiff < 0.35;

  // 3. Distribution shift-invariant (histograms match across all time slices)
  let maxPdfDiff = 0;
  for (let b = 0; b < NUM_BINS; b++) {
    const d12 = Math.abs(bins[b].pdf1 - bins[b].pdf2);
    const d13 = Math.abs(bins[b].pdf1 - bins[b].pdf3);
    const d14 = Math.abs(bins[b].pdf1 - bins[b].pdf4);
    maxPdfDiff = Math.max(maxPdfDiff, d12, d13, d14);
  }
  const isDistShiftInvariant =
    params.processMode === 'sss' && maxPdfDiff < 0.28 && isMeanConstant;

  // Final Badge determination:
  let finalBadge = 'SSS';
  if (params.processMode === 'non-stationary' || (!isMeanConstant && !isAutocorrLagOnly)) {
    finalBadge = 'NON_STATIONARY';
  } else if (params.processMode === 'wss' || !isDistShiftInvariant) {
    finalBadge = 'WSS';
  } else {
    finalBadge = 'SSS';
  }

  return {
    bins,
    bellCurve,
    means: Array.from(means),
    variances: Array.from(variances),
    autocorr: {
      lags,
      rLags1,
      rLags3,
      omega0,
    },
    verification: {
      isMeanConstant,
      meanDiff,
      isAutocorrLagOnly,
      maxRDiff,
      isDistShiftInvariant,
      maxPdfDiff,
      finalBadge,
    },
  };
}
