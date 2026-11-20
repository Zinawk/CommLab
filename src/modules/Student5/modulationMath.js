/**
 * Mathematical models and DSP routines for DSB-SC Modulation and Coherent Demodulation.
 * Supports sinusoidal/triangle/square tones as well as 1-minute real voice signals with live FFT.
 */

export const VOICE_BANDWIDTH_HZ = 3600;

/**
 * Box-Muller Gaussian random generator
 */
export function gaussianRandom(mean = 0, stdDev = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z0 * stdDev;
}

/**
 * 2nd-order Butterworth Low-Pass Filter (IIR)
 */
class ButterworthLPF {
  constructor(cutoffFreq, sampleRate) {
    this.updateCoefficients(cutoffFreq, sampleRate);
    this.reset();
  }

  updateCoefficients(fc, fs) {
    const safeFc = Math.min(fc, fs * 0.45);
    const omega = Math.tan((Math.PI * safeFc) / fs);
    const omega2 = omega * omega;
    const sqrt2 = Math.SQRT2;

    const denom = 1 + sqrt2 * omega + omega2;
    this.b0 = omega2 / denom;
    this.b1 = (2 * omega2) / denom;
    this.b2 = omega2 / denom;
    this.a1 = (2 * (omega2 - 1)) / denom;
    this.a2 = (1 - sqrt2 * omega + omega2) / denom;
  }

  reset() {
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }

  process(x) {
    const y =
      this.b0 * x +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }

  filterArray(arr) {
    this.reset();
    for (let i = 0; i < Math.min(128, arr.length); i++) {
      this.process(arr[0]);
    }
    const out = new Float64Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      out[i] = this.process(arr[i]);
    }
    return out;
  }
}

/**
 * In-place Radix-2 Cooley-Tukey FFT on real/imag Float64Arrays of power-of-2 length N.
 */
function fftInPlace(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      const half = len >> 1;
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
 * Linearly sample voice Float32Array at arbitrary time sec with smooth zero-clamping.
 */
function sampleVoiceAtTime(samples, sampleRate, duration, sec) {
  if (!samples || samples.length === 0) return 0;
  const wrappedSec = duration > 0 ? ((sec % duration) + duration) % duration : 0;
  const pos = wrappedSec * sampleRate;
  const idx0 = Math.floor(pos);
  const idx1 = Math.min(samples.length - 1, idx0 + 1);
  const frac = pos - idx0;
  const v0 = samples[Math.min(samples.length - 1, Math.max(0, idx0))];
  const v1 = samples[Math.max(0, idx1)];
  return v0 + (v1 - v0) * frac;
}

/**
 * Compute single-sided voice FFT magnitude bins around voiceTime.
 */
function computeVoiceBasebandFFT(voiceData, voiceTime, Am) {
  const fftSize = 1024;
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);

  const sr = voiceData.sampleRate || 24000;
  const samples = voiceData.samples;
  const duration = voiceData.duration || samples.length / sr;

  // Center a ~42 ms Hann window around voiceTime (or at the start if voiceTime == 0)
  const windowCenter = Math.max(0.02, voiceTime);
  const stepSec = 1 / sr;
  const startSec = windowCenter - (fftSize * 0.5) * stepSec;

  for (let i = 0; i < fftSize; i++) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    const s = sampleVoiceAtTime(samples, sr, duration, startSec + i * stepSec);
    re[i] = s * Am * hann;
  }

  fftInPlace(re, im);

  const halfBins = fftSize / 2;
  const binHz = sr / fftSize;
  const mag = new Float64Array(halfBins);
  // Coherent gain of Hann window is 0.5; double for single-sided spectrum
  const scale = 4.0 / fftSize;
  for (let k = 0; k < halfBins; k++) {
    mag[k] = Math.hypot(re[k], im[k]) * scale * 2.2;
  }

  return { mag, binHz, halfBins };
}

function sampleSpectrumInterpolated(mag, binHz, freqHz) {
  if (freqHz < 0) return 0;
  const bin = freqHz / binHz;
  const i0 = Math.floor(bin);
  if (i0 >= mag.length - 1) return 0;
  const frac = bin - i0;
  return mag[i0] + (mag[i0 + 1] - mag[i0]) * frac;
}

function evaluateMessageWaveform(waveform, Am, fm, t) {
  const phaseAngle = 2 * Math.PI * fm * t;
  if (waveform === 'square') {
    return Math.cos(phaseAngle) >= 0 ? Am : -Am;
  }
  if (waveform === 'triangle') {
    const normPhase = (((fm * t + 0.5) % 1) + 1) % 1;
    return Am * (1 - 4 * Math.abs(normPhase - 0.5));
  }
  return Am * Math.cos(phaseAngle);
}

/**
 * Synthesizes simulation signals for DSB-SC Modulation & Coherent Demodulation
 */
export function generateModulationSignals({
  Am = 1.0,
  fm = 280,
  Ac = 1.0,
  fc = 10000,
  phiDeg = 0,
  waveform = 'sine',
  noiseEnabled = false,
  snrDb = 20,
  animTime = 0,
  voiceData = null,
  voiceTime = 0,
}) {
  const isVoice = waveform === 'voice';
  const phiRad = (phiDeg * Math.PI) / 180;

  // 20 ms window for voice so speech pitch & modulation envelope are clear; 10 ms for tones
  const timeSpan = isVoice ? 0.02 : 0.01;
  const numPoints = 4096;
  const dt = timeSpan / numPoints;
  const sampleRate = 1 / dt;

  const tValues = new Float64Array(numPoints);
  const mValues = new Float64Array(numPoints);
  const cValues = new Float64Array(numPoints);
  const sDsbValues = new Float64Array(numPoints);
  const envPosValues = new Float64Array(numPoints);
  const vDsbValues = new Float64Array(numPoints);

  const dsbPeak = Am * Ac;
  let sigmaNoiseDsb = 0;
  if (noiseEnabled && snrDb >= 0) {
    const pSigDsb = (dsbPeak * dsbPeak) / 4;
    const pNoiseDsb = pSigDsb * Math.pow(10, -snrDb / 10);
    sigmaNoiseDsb = Math.sqrt(pNoiseDsb);
  }

  const noiseVec = new Float64Array(numPoints);
  if (noiseEnabled) {
    for (let i = 0; i < numPoints; i++) {
      noiseVec[i] = gaussianRandom(0, 1);
    }
  }

  // Visual carrier frequency keeps high-frequency RF clearly separated from speech & tone LPF cutoff
  const visualFc = 3600 + ((fc - 5000) / 45000) * 6400;

  const hasVoiceSamples = isVoice && voiceData && voiceData.samples && voiceData.samples.length > 0;
  const voiceSamples = hasVoiceSamples ? voiceData.samples : null;
  const voiceSr = hasVoiceSamples ? voiceData.sampleRate : 24000;
  const voiceDur = hasVoiceSamples ? voiceData.duration : 60;

  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;
    const tAnim = isVoice ? t + voiceTime : t + animTime * 0.001;
    tValues[i] = t;

    // 1. Baseband Message m(t): Real 1-min voice OR Sinusoidal / Triangle / Square
    const m = isVoice
      ? hasVoiceSamples
        ? Am * sampleVoiceAtTime(voiceSamples, voiceSr, voiceDur, tAnim)
        : 0
      : evaluateMessageWaveform(waveform, Am, fm, tAnim);
    mValues[i] = m;

    // 2. Carrier Signal: c(t) = Ac * cos(2π * fc * t + φ)
    const c = Ac * Math.cos(2 * Math.PI * visualFc * tAnim + phiRad);
    cValues[i] = c;

    // 3. Modulation s(t) = m(t) * c(t) (+ optional AWGN)
    let sDsb = m * c;
    envPosValues[i] = Math.abs(m * Ac);
    if (noiseEnabled) {
      sDsb += noiseVec[i] * sigmaNoiseDsb;
    }
    sDsbValues[i] = sDsb;

    // 4. Coherent Demodulator mixer product: v(t) = 2 * s(t) * cos(2π * fc * t)
    const loCos = 2.0 * Math.cos(2 * Math.PI * visualFc * tAnim);
    vDsbValues[i] = sDsb * loCos;
  }

  // 6th-order Butterworth Low-Pass Filtering (3 cascaded 2nd-order stages)
  // Cutoff at 3500 Hz preserves speech/harmonics while strongly rejecting 2*visualFc (>= 7200 Hz)
  const filterCutoff = isVoice ? 3500 : 2800;
  const lpf1 = new ButterworthLPF(filterCutoff, sampleRate);
  const lpf2 = new ButterworthLPF(filterCutoff, sampleRate);
  const lpf3 = new ButterworthLPF(filterCutoff, sampleRate);
  const yDsbValues = lpf3.filterArray(lpf2.filterArray(lpf1.filterArray(vDsbValues)));

  // Live Metrics
  const effectiveFm = isVoice ? VOICE_BANDWIDTH_HZ : fm;
  const bwDsb = 2 * effectiveFm;
  const effDsb = 100;
  const dsbAmpFactor = Math.abs(Math.cos(phiRad));
  const recAmpPctDsb = Math.max(0, Math.min(100, dsbAmpFactor * 100));

  let sumSqErrDsb = 0;
  let meanM = 0;
  let meanYDsb = 0;

  for (let i = 0; i < numPoints; i++) {
    meanM += mValues[i];
    meanYDsb += yDsbValues[i];
  }
  meanM /= numPoints;
  meanYDsb /= numPoints;

  let covDsb = 0;
  let varM = 0;
  let varYDsb = 0;

  for (let i = 0; i < numPoints; i++) {
    const refM = mValues[i] * Ac;
    const diffM = mValues[i] - meanM;
    const diffDsb = yDsbValues[i] - meanYDsb;

    sumSqErrDsb += (yDsbValues[i] - refM) * (yDsbValues[i] - refM);
    covDsb += diffM * diffDsb;
    varM += diffM * diffM;
    varYDsb += diffDsb * diffDsb;
  }

  const mseDsb = sumSqErrDsb / numPoints;
  const denomDsb = Math.sqrt(varM * varYDsb);
  const rDsb = denomDsb > 1e-6 ? covDsb / denomDsb : 0;

  // Passband Spectrum |S(f)| centered at fc AND Recovered Baseband Spectrum |Y(f)|
  const spectrumPoints = 320;
  const spanF = isVoice ? 3800 : 2800;
  const fMin = fc - spanF;
  const fMax = fc + spanF;
  const fStep = (fMax - fMin) / (spectrumPoints - 1);

  const fFrequencies = new Float64Array(spectrumPoints);
  const fMagDsb = new Float64Array(spectrumPoints);

  const basebandMaxF = spanF;
  const basebandFrequencies = new Float64Array(spectrumPoints);
  const basebandMagRecovered = new Float64Array(spectrumPoints);
  const basebandStep = basebandMaxF / (spectrumPoints - 1);

  const basePeak = 0.5 * Am * Ac;
  const noiseFloor = noiseEnabled && snrDb >= 0 ? basePeak / Math.pow(10, snrDb / 20) : 0;

  let peakHeightDsb = basePeak;
  let peakHeightBaseband = Am * Ac * dsbAmpFactor;

  if (isVoice) {
    if (hasVoiceSamples) {
      const voiceFft = computeVoiceBasebandFFT(voiceData, voiceTime, Am);
      let maxPassband = 0.05;
      let maxBaseband = 0.05;

      for (let i = 0; i < spectrumPoints; i++) {
        const fPass = fMin + i * fStep;
        fFrequencies[i] = fPass;
        const deltaF = Math.abs(fPass - fc);
        const mMag = sampleSpectrumInterpolated(voiceFft.mag, voiceFft.binHz, deltaF);
        const passNoise = noiseEnabled ? Math.abs(gaussianRandom(0, noiseFloor * 0.35)) : 0;
        const sMag = 0.5 * Ac * mMag + passNoise;
        fMagDsb[i] = sMag;
        if (sMag > maxPassband) maxPassband = sMag;

        const fBase = i * basebandStep;
        basebandFrequencies[i] = fBase;
        const mBaseMag = sampleSpectrumInterpolated(voiceFft.mag, voiceFft.binHz, fBase);
        const baseNoise = noiseEnabled ? Math.abs(gaussianRandom(0, noiseFloor * 0.45)) : 0;
        const yMag = Ac * dsbAmpFactor * mBaseMag + baseNoise;
        basebandMagRecovered[i] = yMag;
        if (yMag > maxBaseband) maxBaseband = yMag;
      }
      peakHeightDsb = maxPassband;
      peakHeightBaseband = maxBaseband;
    } else {
      for (let i = 0; i < spectrumPoints; i++) {
        fFrequencies[i] = fMin + i * fStep;
        fMagDsb[i] = 0;
        basebandFrequencies[i] = i * basebandStep;
        basebandMagRecovered[i] = 0;
      }
      peakHeightDsb = 0;
      peakHeightBaseband = 0;
    }
  } else {
    const sigmaPeak = 45;
    const fundamentalHeight =
      waveform === 'square'
        ? (4 / Math.PI) * basePeak
        : waveform === 'triangle'
        ? (8 / (Math.PI * Math.PI)) * basePeak
        : basePeak;
    peakHeightDsb = fundamentalHeight;

    const fundamentalBaseHeight =
      waveform === 'square'
        ? (4 / Math.PI) * Am * Ac * dsbAmpFactor
        : waveform === 'triangle'
        ? (8 / (Math.PI * Math.PI)) * Am * Ac * dsbAmpFactor
        : Am * Ac * dsbAmpFactor;
    peakHeightBaseband = fundamentalBaseHeight;

    const harmonics = waveform === 'sine' ? [1] : [1, 3, 5, 7, 9];

    for (let i = 0; i < spectrumPoints; i++) {
      const fPass = fMin + i * fStep;
      fFrequencies[i] = fPass;

      let magPass = 0;
      for (let hIdx = 0; hIdx < harmonics.length; hIdx++) {
        const n = harmonics[hIdx];
        let hAmp = basePeak;
        if (waveform === 'square') {
          hAmp = (4 / (Math.PI * n)) * basePeak;
        } else if (waveform === 'triangle') {
          hAmp = (8 / (Math.PI * Math.PI * n * n)) * basePeak;
        }
        const dLsb = (fPass - (fc - n * fm)) / sigmaPeak;
        const dUsb = (fPass - (fc + n * fm)) / sigmaPeak;
        magPass += hAmp * (Math.exp(-0.5 * dLsb * dLsb) + Math.exp(-0.5 * dUsb * dUsb));
      }
      const dsbNoise = noiseEnabled ? Math.abs(gaussianRandom(0, noiseFloor * 0.35)) : 0;
      fMagDsb[i] = magPass + dsbNoise;

      // Baseband recovered spectrum |Y(f)|
      const fBase = i * basebandStep;
      basebandFrequencies[i] = fBase;
      let magBase = 0;
      for (let hIdx = 0; hIdx < harmonics.length; hIdx++) {
        const n = harmonics[hIdx];
        let hAmpBase = Am * Ac * dsbAmpFactor;
        if (waveform === 'square') {
          hAmpBase = (4 / (Math.PI * n)) * Am * Ac * dsbAmpFactor;
        } else if (waveform === 'triangle') {
          hAmpBase = (8 / (Math.PI * Math.PI * n * n)) * Am * Ac * dsbAmpFactor;
        }
        const dF = (fBase - n * fm) / sigmaPeak;
        magBase += hAmpBase * Math.exp(-0.5 * dF * dF);
      }
      const baseNoise = noiseEnabled ? Math.abs(gaussianRandom(0, noiseFloor * 0.45)) : 0;
      basebandMagRecovered[i] = magBase + baseNoise;
    }
  }

  const isQuadratureNull = Math.abs(phiDeg - 90) <= 8;

  return {
    timeSpan,
    dt,
    tValues,
    mValues,
    cValues,
    sDsbValues,
    envPosValues,
    yDsbValues,
    fMin,
    fMax,
    fc,
    fm: effectiveFm,
    isVoice,
    fFrequencies,
    fMagDsb,
    peakHeightDsb,
    basebandMaxF,
    basebandFrequencies,
    basebandMagRecovered,
    peakHeightBaseband,
    metrics: {
      bw: bwDsb,
      powerEfficiency: effDsb,
      recAmpPct: recAmpPctDsb,
      mse: mseDsb,
      correlation: rDsb,
      lsbFreq: fc - effectiveFm,
      usbFreq: fc + effectiveFm,
      peakDsb: dsbPeak,
      peakRecovered: dsbPeak * dsbAmpFactor,
    },
    isQuadratureNull,
  };
}
