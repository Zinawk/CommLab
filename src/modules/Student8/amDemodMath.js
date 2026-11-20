/**
 * Mathematical models and simulation engine for Conventional Amplitude Modulation (AM)
 * and Diode-RC Envelope Demodulation with Low-Pass Filtering.
 *
 * Core Conventional AM Formula:
 *   s(t) = [1 + μ * m(t)] * cos(2π fc t)
 *
 * where m(t) = cos(2π fm t) is the message signal, and μ is the modulation index.
 * The upper and lower envelopes are:
 *   E+(t) = [1 + μ * m(t)]
 *   E-(t) = -[1 + μ * m(t)]
 *
 * Demodulation Stages:
 *   1. Diode-RC Envelope Detector:
 *      Condition: 1/ωc << RC << 1/ωm
 *      Capacitor charges rapidly on positive carrier peaks when s(t) > Vc,
 *      and exponentially discharges through resistor R when s(t) < Vc.
 *      When μ <= 1, the envelope is 1 + μ m(t) (undistorted).
 *      When μ > 1 (overmodulation), the carrier phase inverts when 1 + μ m(t) < 0,
 *      and the diode rectifies positive carrier peaks to |1 + μ m(t)|,
 *      producing characteristic fold-over cusps (envelope distortion).
 *   2. Low-Pass Filter (LPF):
 *      Zero-phase low-pass filtering eliminates high-frequency RF carrier ripples
 *      without phase delay, faithfully tracking the detected envelope contour
 *      (including overmodulation distortion when μ > 1).
 */

export const AM_LIMITS = {
  fm: { min: 2.0, max: 12.0, step: 0.5, default: 5.0, unit: 'Hz' },
  fc: { min: 40.0, max: 120.0, step: 5.0, default: 60.0, unit: 'Hz' },
  mu: { min: 0.1, max: 1.8, step: 0.05, default: 0.7, unit: '' },
};

/**
 * Computes 2nd-order Butterworth low-pass filter coefficients via Bilinear Transform
 * with frequency pre-warping.
 */
function getButterworth2Coeffs(fCutoff, sampleRate) {
  const nyquist = sampleRate / 2;
  const fcClamped = Math.min(Math.max(fCutoff, 0.5), nyquist * 0.9);
  const K = Math.tan((Math.PI * fcClamped) / sampleRate);
  const K2 = K * K;
  const sqrt2K = Math.SQRT2 * K;
  const norm = 1 / (1 + sqrt2K + K2);

  const b0 = K2 * norm;
  const b1 = 2 * b0;
  const b2 = b0;
  const a1 = 2 * (K2 - 1) * norm;
  const a2 = (1 - sqrt2K + K2) * norm;

  return { b0, b1, b2, a1, a2 };
}

/**
 * Applies a zero-phase 2nd-order biquad (forward-backward filtfilt)
 * across an array with zero phase distortion.
 */
function applyFiltFiltBiquad(arr, fCutoff, sampleRate) {
  const n = arr.length;
  if (n < 4) return new Float64Array(arr);

  const { b0, b1, b2, a1, a2 } = getButterworth2Coeffs(fCutoff, sampleRate);

  // Forward pass
  const forward = new Float64Array(n);
  let x1 = arr[0];
  let x2 = arr[0];
  let y1 = arr[0];
  let y2 = arr[0];

  for (let i = 0; i < n; i++) {
    const x0 = arr[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    forward[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }

  // Backward pass (cancels all phase distortion)
  const backward = new Float64Array(n);
  x1 = forward[n - 1];
  x2 = forward[n - 1];
  y1 = forward[n - 1];
  y2 = forward[n - 1];

  for (let i = n - 1; i >= 0; i--) {
    const x0 = forward[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    backward[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }

  return backward;
}

/**
 * Computes all signals for Conventional AM across a synchronized time grid.
 *
 * @param {Object} params
 * @param {number} params.fm Message frequency in Hz
 * @param {number} params.fc Carrier frequency in Hz
 * @param {number} params.mu Modulation index μ
 * @param {number} params.timeOffset Running animation time in seconds
 * @param {number} [params.duration=1.0] Time duration in seconds
 * @param {number} [params.numSamples=700] Number of sampling points
 */
export function generateAmDemodSignals({
  fm = 1.5,
  fc = 25.0,
  mu = 0.7,
  timeOffset = 0,
  duration = 1.0,
  numSamples = 700,
}) {
  const dt = duration / (numSamples - 1);
  const sampleRate = (numSamples - 1) / duration;

  const timeArray = new Float64Array(numSamples);
  const messageArray = new Float64Array(numSamples);
  const carrierArray = new Float64Array(numSamples);
  const amSignalArray = new Float64Array(numSamples);
  const upperEnvelopeArray = new Float64Array(numSamples);
  const lowerEnvelopeArray = new Float64Array(numSamples);
  const detectedEnvelopeArray = new Float64Array(numSamples);
  const recoveredMessageArray = new Float64Array(numSamples);

  // Time constant RC satisfying the design condition: 1/ωc << RC << 1/ωm
  // Factor 2.0 maintains a stable envelope hold between carrier peaks without diagonal clipping
  const rc = 2.0 / (2 * Math.PI * Math.sqrt(Math.max(1, fc * fm)));

  // Padded simulation window to prevent boundary transient artifacts during animation
  const padLen = 64;
  const totalLen = numSamples + 2 * padLen;
  const detPadded = new Float64Array(totalLen);

  // Pre-roll warmup so the capacitor voltage is in steady-state before the padded window starts
  let vc = 1.0;
  const warmupSamples = 100;
  for (let k = -warmupSamples - padLen; k < -padLen; k++) {
    const tG = k * dt + timeOffset;
    const mWarm = Math.cos(2 * Math.PI * fm * tG);
    const cosCWarm = Math.cos(2 * Math.PI * fc * tG);
    const sWarm = (1 + mu * mWarm) * cosCWarm;
    if (sWarm > vc) {
      vc = vc + 0.95 * (sWarm - vc);
    } else {
      vc = vc * Math.exp(-dt / rc);
    }
  }

  let diodeConductingNow = false;

  // Simulate diode-RC detector continuously across padded timeline
  for (let idx = 0; idx < totalLen; idx++) {
    const k = idx - padLen;
    const t = k * dt;
    const tGlobal = t + timeOffset;

    const m = Math.cos(2 * Math.PI * fm * tGlobal);
    const cosC = Math.cos(2 * Math.PI * fc * tGlobal);
    const upperEnv = 1 + mu * m;
    const lowerEnv = -(1 + mu * m);
    const s = upperEnv * cosC;

    // Diode conducts on positive peaks (charging C), reverse-biases when s < Vc (discharging C through R)
    if (s > vc) {
      vc = vc + 0.95 * (s - vc);
      if (k === numSamples - 1) diodeConductingNow = true;
    } else {
      vc = vc * Math.exp(-dt / rc);
      if (k === numSamples - 1) diodeConductingNow = false;
    }

    detPadded[idx] = vc;

    if (k >= 0 && k < numSamples) {
      timeArray[k] = t;
      messageArray[k] = m;
      carrierArray[k] = cosC;
      amSignalArray[k] = s;
      upperEnvelopeArray[k] = upperEnv;
      lowerEnvelopeArray[k] = lowerEnv;
      detectedEnvelopeArray[k] = vc;
    }
  }

  // 5. Demodulated Output: Smooth out carrier ripple while faithfully preserving the envelope shape.
  // When μ <= 1, the detected envelope is a clean sinusoidal wave with DC offset.
  // When μ > 1 (overmodulation), the detected envelope has characteristic fold-over cusps in the troughs;
  // the filter cutoff rejects carrier frequency fc while passing baseband envelope distortion harmonics.
  const fCutoff = Math.min(fc * 0.40, Math.max(fm * 4.5, 8.5));
  const pass1 = applyFiltFiltBiquad(detPadded, fCutoff, sampleRate);
  const pass2 = applyFiltFiltBiquad(pass1, fCutoff, sampleRate);

  for (let i = 0; i < numSamples; i++) {
    recoveredMessageArray[i] = pass2[padLen + i];
  }

  // Determine modulation condition:
  // Undermodulation (μ < 1), Critical (μ = 1), Overmodulation (μ > 1)
  let condition = 'undermodulation';
  let conditionText = 'Undermodulation (μ < 1)';
  if (Math.abs(mu - 1.0) <= 0.04) {
    condition = 'critical';
    conditionText = '100% Modulation (μ = 1)';
  } else if (mu > 1.04) {
    condition = 'overmodulation';
    conditionText = 'Overmodulation (μ > 1)';
  }

  return {
    timeArray,
    messageArray,
    carrierArray,
    amSignalArray,
    upperEnvelopeArray,
    lowerEnvelopeArray,
    detectedEnvelopeArray,
    recoveredMessageArray,
    mu,
    condition,
    conditionText,
    diodeConductingNow,
  };
}
