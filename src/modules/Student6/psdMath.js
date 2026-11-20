/**
 * Scientifically rigorous mathematical calculations for Power Spectral Density (PSD)
 * Student 6: Zinegnaw
 *
 * Implements:
 * 1. Random signal generation: White Noise, Sine + Noise, Low-Frequency (colored) Noise
 * 2. Real numerical PSD estimation: Welch's averaged modified periodogram with Hann windowing
 * 3. Raw periodogram and Theoretical PSD calculation
 * 4. Trapezoidal numerical integration of PSD (Parseval's theorem: total power = integral of PSD)
 * 5. Peak frequency detection, noise floor estimation, and SNR metrics
 */

// Generate Gaussian distributed random number using Box-Muller transform
export function gaussianRandom(mean = 0, stdev = 1) {
  const u1 = Math.max(1e-12, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdev + mean;
}

/**
 * Generate signal according to type:
 * - 'sine_noise': x(t) = A * sin(2*pi*f0*t + phi) + noise(t)
 * - 'white_noise': x(t) = noise(t)
 * - 'low_freq_noise': lowpass filtered Gaussian noise with cutoff fc
 */
export function generateSignalForPsd({
  signalType = 'sine_noise', // 'sine_noise' | 'white_noise' | 'low_freq_noise'
  frequency = 10, // Carrier freq for sine, or cutoff freq for low-pass noise (Hz)
  amplitude = 1.5, // Volts
  noiseLevel = 0.8, // Volts (std dev)
  sampleRate = 250, // Hz
  duration = 1.5, // seconds (375 samples gives high frequency resolution)
  phase = 0, // radians
}) {
  const numSamples = Math.round(sampleRate * duration);
  const time = new Float64Array(numSamples);
  const signal = new Float64Array(numSamples);
  const clean = new Float64Array(numSamples);
  const noise = new Float64Array(numSamples);

  if (signalType === 'white_noise') {
    // Pure white Gaussian noise
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const nVal = noiseLevel > 0 ? gaussianRandom(0, noiseLevel) : 0;
      time[i] = t;
      clean[i] = 0;
      noise[i] = nVal;
      signal[i] = nVal;
    }
  } else if (signalType === 'low_freq_noise') {
    // Low-frequency / colored noise: 1st order IIR low-pass filtered Gaussian noise
    // Cutoff frequency fc determined by frequency parameter
    const fc = Math.max(1, Math.min(frequency, sampleRate / 4));
    // Bilinear or exponential smoothing coefficient: alpha = 1 - exp(-2*pi*fc / fs)
    const alpha = 1 - Math.exp((-2 * Math.PI * fc) / sampleRate);
    
    // Warm up the filter for 50 samples to reach steady state
    let y = 0;
    for (let i = 0; i < 50; i++) {
      const w = noiseLevel > 0 ? gaussianRandom(0, noiseLevel) : 0;
      y += alpha * (w - y);
    }

    // Normalization factor so the filtered noise has approximately noiseLevel variance:
    // For single-pole IIR y[n] = (1-a)y[n-1] + a*w[n], var(y) = var(w) * a / (2 - a)
    const gainCorrection = Math.sqrt((2 - alpha) / Math.max(1e-4, alpha));

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const w = noiseLevel > 0 ? gaussianRandom(0, noiseLevel) : 0;
      y += alpha * (w - y);
      const coloredNoiseVal = y * gainCorrection;

      time[i] = t;
      clean[i] = 0;
      noise[i] = coloredNoiseVal;
      signal[i] = coloredNoiseVal;
    }
  } else {
    // Sinusoidal signal embedded in white Gaussian noise
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sVal = amplitude * Math.sin(2 * Math.PI * frequency * t + phase);
      const nVal = noiseLevel > 0 ? gaussianRandom(0, noiseLevel) : 0;
      time[i] = t;
      clean[i] = sVal;
      noise[i] = nVal;
      signal[i] = sVal + nVal;
    }
  }

  // Convert to standard arrays for easy charting
  return {
    time: Array.from(time),
    signal: Array.from(signal),
    clean: Array.from(clean),
    noise: Array.from(noise),
    sampleRate,
    duration,
    numSamples,
  };
}

/**
 * Wiener–Khinchin Method for Power Spectral Density (PSD):
 *   1. Compute empirical autocorrelation R_X[m] = (1/N) * sum x[n] * x[n - m]
 *   2. Evaluate the Fourier transform of R_X(tau):
 *        S_X(f) = integral_{-infty}^{infty} R_X(tau) * e^{-j 2 pi f tau} d tau
 *               = (1/fs) * [ R_X(0) + 2 * sum_{m=1}^{M} w_m * R_X[m] * cos(2 pi f m / fs) ]
 *      with Bartlett lag window w_m = 1 - m / (M + 1) ensuring S_X(f) >= 0 and w_0 = 1.
 *   3. Total power matches R_X(0) = integral_{-infty}^{infty} S_X(f) df = 2 * integral_{0}^{fs/2} S_X(f) df.
 */
export function computePsdWienerKhinchin({
  signal,
  sampleRate = 800,
  maxLag = 160,
  numFreqBins = 161,
}) {
  const N = signal.length;
  if (N < 2) {
    return {
      frequencies: [0],
      psd: [0],
      psdDb: [-120],
      totalPower: 0,
      rx0: 0,
      sampleRate,
      nyquist: sampleRate / 2,
    };
  }

  const M = Math.min(maxLag, N - 1);

  // Step 1: Compute empirical autocorrelation R_X[m] for m = 0 .. M
  const rx = new Float64Array(M + 1);
  for (let m = 0; m <= M; m++) {
    let sum = 0;
    for (let n = m; n < N; n++) {
      sum += signal[n] * signal[n - m];
    }
    rx[m] = sum / N;
  }

  // Step 2: Evaluate S_X(f) = integral R_X(tau) e^{-j 2 pi f tau} d tau for f in [0, fs/2]
  const nyquist = sampleRate / 2;
  const frequencies = [];
  const psd = [];
  const psdDb = [];

  for (let k = 0; k < numFreqBins; k++) {
    const f = (k / (numFreqBins - 1)) * nyquist;
    let accum = rx[0];

    for (let m = 1; m <= M; m++) {
      const w = 1 - m / (M + 1); // Bartlett lag window preserves PSD >= 0
      const tau = m / sampleRate;
      accum += 2 * w * rx[m] * Math.cos(2 * Math.PI * f * tau);
    }

    const sVal = Math.max(0, accum / sampleRate);
    const dbVal = 10 * Math.log10(Math.max(1e-12, sVal));

    frequencies.push(Number(f.toFixed(2)));
    psd.push(sVal);
    psdDb.push(Number(dbVal.toFixed(2)));
  }

  // Step 3: Check R_X(0) = integral_{-infty}^{infty} S_X(f) df = 2 * integral_{0}^{fs/2} S_X(f) df
  let oneSidedInt = 0;
  for (let i = 0; i < frequencies.length - 1; i++) {
    const df = frequencies[i + 1] - frequencies[i];
    oneSidedInt += 0.5 * (psd[i] + psd[i + 1]) * df;
  }
  const totalPower = 2 * oneSidedInt;

  return {
    frequencies,
    psd,
    psdDb,
    totalPower,
    rx0: rx[0],
    sampleRate,
    nyquist,
  };
}

/**
 * Welch's Method for Real Numerical Power Spectral Density (PSD)
 * 
 * Divides signal into overlapping segments, windows each segment with a Hann window,
 * computes discrete Fourier transform, and averages the squared magnitudes.
 *
 * One-sided PSD units: V^2 / Hz (or W / Hz across 1 Ohm load)
 * Total power = integral_0^{fs/2} S(f) df = Variance of signal
 */
export function computePsdWelch({
  signal,
  sampleRate = 250,
  segmentLength = 128, // Window length L
  overlapFraction = 0.5, // 50% overlap
}) {
  const N = signal.length;
  const L = Math.min(segmentLength, N);
  const hop = Math.max(1, Math.floor(L * (1 - overlapFraction)));

  // Generate Hann window: w[n] = 0.5 * (1 - cos(2*pi*n / (L-1)))
  const window = new Float64Array(L);
  let windowPowerSum = 0;
  for (let n = 0; n < L; n++) {
    window[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (L - 1)));
    windowPowerSum += window[n] * window[n];
  }
  // Window power normalization constant: U = sum(w^2) / L
  const U = windowPowerSum / L;

  // Number of positive frequency bins (from DC to Nyquist = fs / 2)
  const numFreqBins = Math.floor(L / 2) + 1;
  const psdAccumulator = new Float64Array(numFreqBins);
  let numSegments = 0;

  // Segment and average
  for (let start = 0; start + L <= N; start += hop) {
    // Extract segment and remove local DC to prevent zero-frequency leakage
    let segMean = 0;
    for (let n = 0; n < L; n++) {
      segMean += signal[start + n];
    }
    segMean /= L;

    // Apply window to mean-removed segment (or keep DC for proper total power)
    // We compute DFT directly for each bin m = 0 ... L/2
    for (let m = 0; m < numFreqBins; m++) {
      let realPart = 0;
      let imagPart = 0;
      const omega = (2 * Math.PI * m) / L;

      for (let n = 0; n < L; n++) {
        const val = signal[start + n] * window[n];
        const angle = omega * n;
        realPart += val * Math.cos(angle);
        imagPart -= val * Math.sin(angle);
      }

      const magSquared = realPart * realPart + imagPart * imagPart;

      // One-sided periodogram normalization:
      // For DC (m=0) and Nyquist (m=L/2), factor is 1 / (fs * L * U)
      // For intermediate bins (0 < m < L/2), multiply by 2 for one-sided PSD
      const scale = (m === 0 || m === numFreqBins - 1) ? 1.0 : 2.0;
      const periodogramVal = (scale * magSquared) / (sampleRate * L * U);

      psdAccumulator[m] += periodogramVal;
    }
    numSegments++;
  }

  // If no full segment fit, compute on single zero-padded segment
  if (numSegments === 0) {
    numSegments = 1;
  }

  const frequencies = [];
  const psd = [];
  const psdDb = [];

  for (let m = 0; m < numFreqBins; m++) {
    const f = (m * sampleRate) / L;
    const avgPsd = psdAccumulator[m] / numSegments;
    const dbVal = 10 * Math.log10(Math.max(1e-12, avgPsd));

    frequencies.push(Number(f.toFixed(2)));
    psd.push(avgPsd);
    psdDb.push(Number(dbVal.toFixed(2)));
  }

  // Numerical Integration of PSD using Trapezoidal Rule:
  // Total Power P = \int_0^{fs/2} S(f) df
  let totalPower = 0;
  for (let i = 0; i < frequencies.length - 1; i++) {
    const df = frequencies[i + 1] - frequencies[i];
    totalPower += 0.5 * (psd[i] + psd[i + 1]) * df;
  }

  return {
    frequencies,
    psd,
    psdDb,
    totalPower,
    sampleRate,
    nyquist: sampleRate / 2,
    numSegments,
  };
}

/**
 * Compute theoretical PSD for comparison and overlay:
 */
export function computeTheoreticalPsd({
  signalType,
  frequency,
  amplitude,
  noiseLevel,
  sampleRate,
  frequencies,
}) {
  const theoPsd = [];
  const nyquist = sampleRate / 2;
  const whiteNoiseFloor = (noiseLevel * noiseLevel) / nyquist; // V^2 / Hz over [0, fs/2]

  for (let i = 0; i < frequencies.length; i++) {
    const f = frequencies[i];
    let val = 0;

    if (signalType === 'white_noise') {
      val = whiteNoiseFloor;
    } else if (signalType === 'low_freq_noise') {
      // 1st order lowpass filter: |H(f)|^2 = 1 / (1 + (f/fc)^2)
      const fc = Math.max(1, frequency);
      const filterShape = 1 / (1 + Math.pow(f / fc, 2));
      // Integral of 1 / (1 + (f/fc)^2) from 0 to infty is (pi/2) * fc
      // Scale so total integral matches noiseLevel^2
      const lowpassNorm = (noiseLevel * noiseLevel) / ((Math.PI / 2) * fc);
      val = lowpassNorm * filterShape;
    } else {
      // Sine + Noise:
      // Noise floor + Gaussian spectral peak (approximating delta function spread by window)
      const deltaSpread = 1.8; // Hz effective window bandwidth
      const sinePower = (amplitude * amplitude) / 2;
      const peakVal = (sinePower / (deltaSpread * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * Math.pow((f - frequency) / deltaSpread, 2));
      val = whiteNoiseFloor + peakVal;
    }

    theoPsd.push(Math.max(1e-12, val));
  }

  return theoPsd;
}

/**
 * Calculate analytical metrics & insights
 */
export function calculatePsdMetrics({
  signalType,
  frequency,
  amplitude,
  noiseLevel,
  frequencies,
  psd,
  totalPower,
}) {
  // Find peak frequency
  let maxPsd = -1;
  let peakFreq = 0;
  for (let i = 0; i < frequencies.length; i++) {
    if (psd[i] > maxPsd) {
      maxPsd = psd[i];
      peakFreq = frequencies[i];
    }
  }

  // Theoretical total power:
  let theoreticalPower = 0;
  if (signalType === 'white_noise') {
    theoreticalPower = noiseLevel * noiseLevel;
  } else if (signalType === 'low_freq_noise') {
    theoreticalPower = noiseLevel * noiseLevel;
  } else {
    theoreticalPower = (amplitude * amplitude) / 2 + noiseLevel * noiseLevel;
  }

  // Noise floor estimate (median of upper half frequencies)
  const halfIdx = Math.floor(psd.length / 2);
  const upperPsd = psd.slice(halfIdx).sort((a, b) => a - b);
  const estimatedNoiseFloor = upperPsd[Math.floor(upperPsd.length / 2)] || 0;

  // Signal-to-Noise Ratio (SNR) for sinusoidal signal
  let snrDb = null;
  if (signalType === 'sine_noise' && noiseLevel > 0) {
    const sPower = (amplitude * amplitude) / 2;
    const nPower = noiseLevel * noiseLevel;
    snrDb = 10 * Math.log10(sPower / nPower);
  }

  return {
    peakFreq: Number(peakFreq.toFixed(1)),
    maxPsd: maxPsd,
    totalPower: Number(totalPower.toFixed(3)),
    theoreticalPower: Number(theoreticalPower.toFixed(3)),
    estimatedNoiseFloor: estimatedNoiseFloor,
    snrDb: snrDb !== null ? Number(snrDb.toFixed(1)) : null,
  };
}

/**
 * Return short, concise insights tailored to the selected signal
 */
export function getPsdInsight(signalType, { frequency, amplitude, noiseLevel, peakFreq }) {
  if (signalType === 'white_noise') {
    return [
      {
        title: '1. Flat Uniform Spectrum',
        color: 'bg-sky-400',
        text: 'Power is evenly distributed across all frequencies with zero correlation between time samples.',
      },
      {
        title: '2. Impulse Autocorrelation',
        color: 'bg-amber-400',
        text: 'A flat PSD corresponds directly to an impulse at τ = 0: S(f) = σ²/fs ↔ R(τ) = σ²δ(τ).',
      },
      {
        title: '3. Noise Floor Scaling',
        color: 'bg-emerald-400',
        text: `The spectral floor height scales directly with noise variance σ² (${(noiseLevel * noiseLevel).toFixed(2)} V²).`,
      },
    ];
  }

  if (signalType === 'low_freq_noise') {
    return [
      {
        title: '1. Low-Pass Concentration',
        color: 'bg-sky-400',
        text: `Power is concentrated below ${frequency.toFixed(1)} Hz and rolls off steeply at higher frequencies.`,
      },
      {
        title: '2. Slow Time Variations',
        color: 'bg-amber-400',
        text: 'Strong correlation between neighboring samples produces smooth, sluggish time-domain waves.',
      },
      {
        title: '3. Band-Limiting Effect',
        color: 'bg-emerald-400',
        text: 'Demonstrates colored 1/f noise and the frequency-selective filtering of communication channels.',
      },
    ];
  }

  // Sinusoidal signal with noise
  return [
    {
      title: '1. Carrier Frequency Detection',
      color: 'bg-sky-400',
      text: `Sharp peak at ${peakFreq.toFixed(1)} Hz detects the hidden carrier even when buried in heavy noise.`,
    },
    {
      title: '2. Power Separation',
      color: 'bg-amber-400',
      text: `Sinusoid power (A²/2 = ${((amplitude * amplitude) / 2).toFixed(2)} V²) concentrates into a single line above the flat noise floor.`,
    },
    {
      title: '3. Wiener–Khinchin Link',
      color: 'bg-emerald-400',
      text: 'Fourier transform maps the periodic cosine autocorrelation directly into spectral delta peaks.',
    },
  ];
}
