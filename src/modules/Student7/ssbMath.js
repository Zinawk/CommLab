/**
 * SSB-AM Modulation and Demodulation — Mathematical Engine
 * Task 7 (Makol)
 *
 * 1. Frequency Discrimination Method:
 *    - Message signal:   m(t) = Am * cos(2π fm t)
 *    - Carrier signal:   c(t) = Ac * cos(2π fc t)
 *    - AM (DSB-SC) sig:  s_am(t) = m(t) * c(t)
 *                          = (Am*Ac/2)*cos(2π(fc - fm)t)  [LSB]
 *                          + (Am*Ac/2)*cos(2π(fc + fm)t)  [USB]
 *    - Bandpass filter selects either USB (fc + fm) or LSB (fc - fm):
 *      s_ssb(t) = (Am*Ac/2) * cos(2π * f_ssb * t)
 *
 * 2. Coherent Detector (Demodulation):
 *    - Received signal:  r(t) = s_ssb(t)
 *    - Local carrier:    c_local(t) = cos(2π fc t)
 *    - Mixer output:     v(t) = r(t) * c_local(t)
 *                          = (Am*Ac/4)*cos(2π fm t) + (Am*Ac/4)*cos(2π(2fc ± fm)t)
 *    - Low-Pass Filter removes 2fc ± fm and restores amplitude (gain 4/Ac):
 *      m_hat(t) = Am * cos(2π fm t)
 */

export const DEFAULT_SSB_PARAMS = {
  sideband: 'USB', // 'USB' | 'LSB'
  fm: 2, // Message frequency (Hz)
  Am: 1.0, // Message amplitude (V)
  fc: 16, // Carrier frequency (Hz)
  Ac: 1.0, // Carrier amplitude (V)
};

export const SSB_LIMITS = {
  fm: { min: 1, max: 5, step: 0.5 },
  Am: { min: 0.5, max: 2.0, step: 0.1 },
  fc: { min: 10, max: 28, step: 1 },
  Ac: { min: 0.5, max: 2.0, step: 0.1 },
};

export function validateSsbParams(raw = {}) {
  const merged = { ...DEFAULT_SSB_PARAMS, ...raw };
  const clamp = (val, { min, max }, fallback) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, num));
  };

  return {
    sideband: merged.sideband === 'LSB' ? 'LSB' : 'USB',
    fm: Number(clamp(merged.fm, SSB_LIMITS.fm, DEFAULT_SSB_PARAMS.fm).toFixed(1)),
    Am: Number(clamp(merged.Am, SSB_LIMITS.Am, DEFAULT_SSB_PARAMS.Am).toFixed(1)),
    fc: Math.round(clamp(merged.fc, SSB_LIMITS.fc, DEFAULT_SSB_PARAMS.fc)),
    Ac: Number(clamp(merged.Ac, SSB_LIMITS.Ac, DEFAULT_SSB_PARAMS.Ac).toFixed(1)),
  };
}

/**
 * Compute time-domain waveforms and frequency spectra for SSB Generation & Coherent Detection.
 */
export function computeSsbSimulation(rawParams, timeOffset = 0) {
  const params = validateSsbParams(rawParams);
  const { sideband, fm, Am, fc, Ac } = params;

  const duration = 1.0; // 1.0 s visible window
  const sampleCount = 320;
  const sidebandAmp = (Am * Ac) / 2;
  const fUsb = fc + fm;
  const fLsb = Math.max(0.5, fc - fm);
  const fSsb = sideband === 'USB' ? fUsb : fLsb;

  const points = new Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const tLocal = (i / (sampleCount - 1)) * duration;
    const t = tLocal + timeOffset;

    const message = Am * Math.cos(2 * Math.PI * fm * t);
    const carrier = Ac * Math.cos(2 * Math.PI * fc * t);

    // DSB-SC / AM signal containing both USB and LSB
    const amSignal = message * carrier;

    // Ideal bandpass-filtered SSB signal
    const ssbSignal = sidebandAmp * Math.cos(2 * Math.PI * fSsb * t);

    // Coherent detector: multiply received SSB by local carrier cos(2π fc t)
    const localCarrier = Math.cos(2 * Math.PI * fc * t);
    const productSignal = ssbSignal * localCarrier;

    // Low-pass filter removes high-frequency term at 2fc ± fm and scales by 4 / Ac
    const highFreqTerm = (sidebandAmp / 2) * Math.cos(2 * Math.PI * (fc + fSsb) * t);
    const recoveredMessage = ((productSignal - highFreqTerm) * 4) / (Ac || 1);

    points[i] = {
      t: tLocal,
      message,
      carrier,
      amSignal,
      ssbSignal,
      localCarrier,
      productSignal,
      recoveredMessage,
    };
  }

  // Frequency Spectrum (0 to fMax Hz)
  const fMax = 36;
  const filterBandwidth = Math.max(3.2, fm * 1.4);
  const filterLow = Math.max(0, fSsb - filterBandwidth / 2);
  const filterHigh = Math.min(fMax, fSsb + filterBandwidth / 2);

  return {
    params,
    duration,
    fMax,
    fUsb,
    fLsb,
    fSsb,
    sidebandAmp,
    filterLow,
    filterHigh,
    points,
    amSpectrum: [
      { freq: fLsb, amp: sidebandAmp, label: 'LSB', active: sideband === 'LSB' },
      { freq: fUsb, amp: sidebandAmp, label: 'USB', active: sideband === 'USB' },
    ],
    ssbSpectrum: [
      {
        freq: fSsb,
        amp: sidebandAmp,
        label: sideband,
        active: true,
      },
    ],
  };
}
