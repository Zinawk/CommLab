/**
 * Accurate mathematical functions for Signal Autocorrelation Analysis
 * Student 6: Zinegnaw
 */

// Generate standard normal Gaussian random variable using Box-Muller transform
export function gaussianRandom(mean = 0, stdev = 1) {
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdev + mean;
}

/**
 * Generate discrete time vector and realization of a stationary AR(1) process
 * with optional periodic sine component:
 *   x[k] = ar[k] + A * sin(2*pi*f*t_k),  where ar[k] = phi * ar[k-1] + eps[k]
 * Stationary variance of ar[k] is noiseLevel^2.
 */
export function generateNoisySignal({
  frequency = 10, // Hz (optional sine frequency)
  amplitude = 0.0, // Volts (optional sine amplitude)
  arCoeff = 0.9, // AR(1) persistence phi in [0, 0.98)
  noiseLevel = 1.0, // AR(1) stationary std dev sigma
  sampleRate = 1000, // samples per second (1 sample = 1 ms)
  duration = 0.4, // 0.4 s -> 401 samples (t = 0 .. 400 ms)
}) {
  const numSamples = Math.round(sampleRate * duration) + 1;
  const rho = Math.max(0, Math.min(0.98, arCoeff));
  const innovStd = noiseLevel * Math.sqrt(Math.max(0, 1 - rho * rho));

  // Warm up AR(1) process so it starts in stationary equilibrium
  let arState = noiseLevel > 0 ? gaussianRandom(0, noiseLevel) : 0;
  for (let w = 0; w < 150; w++) {
    arState = rho * arState + (innovStd > 0 ? gaussianRandom(0, innovStd) : 0);
  }

  const time = [];
  const signal = [];
  const clean = [];
  const noise = [];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const cleanVal = amplitude > 0 ? amplitude * Math.sin(2 * Math.PI * frequency * t) : 0;
    arState = noiseLevel > 0
      ? rho * arState + gaussianRandom(0, innovStd)
      : 0;
    const totalVal = cleanVal + arState;

    time.push(t);
    clean.push(cleanVal);
    noise.push(arState);
    signal.push(totalVal);
  }

  return { time, signal, clean, noise, sampleRate, duration, numSamples };
}

/**
 * Evaluate the empirical autocorrelation formula over the realized window [-T, T]:
 *   R_X(tau) = (1 / 2T) * integral_{-T}^{T} x(t) * x(t - tau) dt
 * Using trapezoidal integration over the realized overlap and normalized by R_X(0)
 * so R_X(0) = 1.0, R_X(-tau) = R_X(tau) (strictly even), and |R_X(tau)| <= R_X(0).
 */
export function computeAutocorrelation(signalOrData, maxLagSamples, sampleRate, normalize = true) {
  const arr = Array.isArray(signalOrData)
    ? signalOrData
    : (signalOrData?.signal || []);
  const N = arr.length;
  const lags = [];
  const rawAutocorr = [];

  if (N < 2) {
    return { lags: [0], autocorr: [0], rawAutocorr: [0], avgPower: 0 };
  }

  const maxSafeLag = Math.min(maxLagSamples, N - 2);
  const twoT = N - 1; // 2T in sample intervals (dt cancels in trapezoidal integral / 2T)

  for (let m = -maxSafeLag; m <= maxSafeLag; m++) {
    const absM = Math.abs(m);
    const count = N - absM;
    let sum = 0;

    if (count >= 2) {
      sum = 0.5 * arr[absM] * arr[0] + 0.5 * arr[N - 1] * arr[N - 1 - absM];
      for (let n = absM + 1; n < N - 1; n++) {
        sum += arr[n] * arr[n - absM];
      }
    } else if (count === 1) {
      sum = arr[absM] * arr[0];
    }

    const rVal = sum / twoT;
    lags.push(m / sampleRate);
    rawAutocorr.push(rVal);
  }

  const centerIdx = maxSafeLag;
  const avgPower = rawAutocorr[centerIdx] || 0;
  const autocorr = normalize && avgPower > 1e-12
    ? rawAutocorr.map((v) => v / avgPower)
    : rawAutocorr;

  return { lags, autocorr, rawAutocorr, avgPower };
}
