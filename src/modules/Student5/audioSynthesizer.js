/**
 * Web Audio API playback & real-time DSB-SC DSP engine for Task 5.
 * Supports both synthetic tone waveforms and a full 1-minute (60s) real voice signal
 * (pre-loaded lab voice, live microphone recording, or uploaded audio file).
 */

const REFERENCE_HEADROOM = 4.0;
const MAX_NORMALIZED_PEAK = 0.92;
const VOICE_PRESETS = {
  lab: {
    url: '/assets/dsb_voice_60s.mp3',
    label: 'Lab Voice (1:00)',
  },
  talk: {
    url: '/assets/dsb_voice_talk_60s.mp3',
    label: 'Real Talk (1:00)',
  },
};
const MAX_VOICE_SECONDS = 60;

/**
 * Downsample an exact integer number of steady-state cycles from a simulation
 * sample array into a Float32Array at targetSampleRate, using box-averaged
 * anti-aliased resampling and a subtle seam crossfade for click-free looping.
 */
function buildLoopableChannel(samples, timeSpan, fm, targetSampleRate, normDenominator) {
  const numPoints = samples.length;
  const safeSpan = Math.max(1e-6, timeSpan);
  const safeFm = Math.max(20, fm);

  const numCycles = Math.max(1, Math.floor(safeSpan * safeFm));
  const cycleDuration = Math.min(safeSpan, numCycles / safeFm);
  const outLen = Math.max(64, Math.round(cycleDuration * targetSampleRate));

  const srcSpan = (cycleDuration / safeSpan) * numPoints;
  const startPos = Math.max(0, numPoints - srcSpan);
  const srcStep = srcSpan / outLen;
  const halfWindow = Math.max(0.5, srcStep * 0.5);

  const out = new Float32Array(outLen);
  const invNorm = normDenominator > 1e-9 ? MAX_NORMALIZED_PEAK / normDenominator : 0;

  for (let j = 0; j < outLen; j++) {
    const center = startPos + (j / outLen) * srcSpan;
    const iStart = Math.max(0, Math.floor(center - halfWindow));
    const iEnd = Math.min(numPoints - 1, Math.ceil(center + halfWindow));

    let sum = 0;
    let count = 0;
    for (let k = iStart; k <= iEnd; k++) {
      const val = samples[k];
      if (Number.isFinite(val)) {
        sum += val;
        count += 1;
      }
    }
    const avg = count > 0 ? sum / count : 0;
    const scaled = avg * invNorm;
    out[j] = Math.max(-MAX_NORMALIZED_PEAK, Math.min(MAX_NORMALIZED_PEAK, scaled));
  }

  const fadeLen = Math.min(12, Math.floor(outLen / 16));
  if (fadeLen >= 2) {
    for (let i = 0; i < fadeLen; i++) {
      const alpha = 0.5 * (1 - Math.cos((Math.PI * i) / fadeLen));
      const head = out[i];
      const tail = out[outLen - fadeLen + i];
      const blended = tail * (1 - alpha) + head * alpha;
      out[i] = blended;
      out[outLen - fadeLen + i] = blended;
    }
  }

  return out;
}

function getPeakAmplitude(samples) {
  if (!samples || samples.length === 0) return 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const val = samples[i];
    if (Number.isFinite(val)) {
      const abs = Math.abs(val);
      if (abs > peak) peak = abs;
    }
  }
  return peak;
}

function extractMonoNormalizedSamples(audioBuffer, maxSeconds = MAX_VOICE_SECONDS) {
  const sampleRate = audioBuffer.sampleRate;
  const maxFrames = Math.min(audioBuffer.length, Math.floor(sampleRate * maxSeconds));
  const numChannels = audioBuffer.numberOfChannels;
  const mono = new Float32Array(maxFrames);

  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < maxFrames; i++) {
      mono[i] += data[i] / numChannels;
    }
  }

  // Normalize peak cleanly to ~0.95 for consistent +/-1V baseband swing
  let peak = 0;
  for (let i = 0; i < maxFrames; i++) {
    const abs = Math.abs(mono[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 1e-4) {
    const scale = 0.95 / peak;
    for (let i = 0; i < maxFrames; i++) {
      mono[i] *= scale;
    }
  }

  return {
    samples: mono,
    sampleRate,
    duration: maxFrames / sampleRate,
  };
}

class ModulationAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sourceNode = null;
    this.noiseSourceNode = null;
    this.voiceGainNode = null;
    this.noiseGainNode = null;
    this.demodLpfNode = null;
    this.noiseBuffer = null;

    this.isPlaying = false;
    this.mode = null; // null | 'original' | 'recovered'
    this.activeType = null; // null | 'tone' | 'voice'
    this.volume = 0.22;
    this.lastError = null;

    // Synthetic tone signal cache
    this.signalData = {
      mValues: null,
      yValues: null,
      timeSpan: 0.01,
      fm: 280,
    };

    // Real voice buffers & playback cursor
    this.presetVoices = {};
    this.activePreset = 'talk';
    this.customVoice = null;
    this.voiceLoadPromises = {};

    this.voiceOffsetSec = 0;
    this.voiceStartCtxTime = 0;
    this.voiceStartOffset = 0;
    this.onVoiceEndedCallback = null;

    this.voiceParams = {
      Am: 1.0,
      Ac: 1.0,
      phiDeg: 0,
      noiseEnabled: false,
      snrDb: 20,
    };
  }

  init() {
    if (this.ctx) return true;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) {
        this.lastError = 'Web Audio API is not supported in this browser.';
        return false;
      }
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.lastError = null;
      return true;
    } catch (err) {
      this.lastError = err?.message || 'Unable to initialize audio context.';
      return false;
    }
  }

  ensureNoiseBuffer() {
    if (!this.ctx) return null;
    if (this.noiseBuffer) return this.noiseBuffer;
    const sr = this.ctx.sampleRate || 48000;
    const len = sr * 3;
    const buf = this.ctx.createBuffer(1, len, sr);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      let u = 0;
      let v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      ch[i] = Math.max(-1, Math.min(1, z * 0.28));
    }
    this.noiseBuffer = buf;
    return buf;
  }

  async loadVoicePreset(presetKey = 'lab') {
    const preset = VOICE_PRESETS[presetKey] || VOICE_PRESETS.lab;
    const resolvedKey = VOICE_PRESETS[presetKey] ? presetKey : 'lab';
    this.activePreset = resolvedKey;
    this.customVoice = null;
    this.voiceOffsetSec = 0;

    if (this.presetVoices[resolvedKey]) {
      return this.presetVoices[resolvedKey];
    }
    if (this.voiceLoadPromises[resolvedKey]) {
      return this.voiceLoadPromises[resolvedKey];
    }

    this.voiceLoadPromises[resolvedKey] = (async () => {
      try {
        const res = await fetch(preset.url);
        if (!res.ok) {
          throw new Error(`Unable to fetch voice sample (${res.status})`);
        }
        const arrayBuf = await res.arrayBuffer();
        const decodeCtx =
          this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const decoded = await decodeCtx.decodeAudioData(arrayBuf);
        const extracted = extractMonoNormalizedSamples(decoded, MAX_VOICE_SECONDS);

        const audioBuffer = decodeCtx.createBuffer(
          1,
          extracted.samples.length,
          extracted.sampleRate
        );
        audioBuffer.copyToChannel(extracted.samples, 0);

        const loaded = {
          audioBuffer,
          samples: extracted.samples,
          sampleRate: extracted.sampleRate,
          duration: extracted.duration,
          label: preset.label,
          presetKey: resolvedKey,
          isCustom: false,
        };
        this.presetVoices[resolvedKey] = loaded;

        if (!this.ctx) {
          this.ctx = decodeCtx;
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
        this.lastError = null;
        return loaded;
      } catch (err) {
        this.lastError = err?.message || 'Unable to load 1-minute voice audio.';
        return null;
      } finally {
        delete this.voiceLoadPromises[resolvedKey];
      }
    })();

    return this.voiceLoadPromises[resolvedKey];
  }

  async loadDefaultVoice() {
    return this.loadVoicePreset('talk');
  }

  async decodeAudioBlob(blob, label = 'Custom Voice') {
    if (!this.init() || !this.ctx) return null;
    try {
      const arrayBuf = await blob.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuf);
      const extracted = extractMonoNormalizedSamples(decoded, MAX_VOICE_SECONDS);
      const audioBuffer = this.ctx.createBuffer(
        1,
        extracted.samples.length,
        extracted.sampleRate
      );
      audioBuffer.copyToChannel(extracted.samples, 0);

      this.customVoice = {
        audioBuffer,
        samples: extracted.samples,
        sampleRate: extracted.sampleRate,
        duration: extracted.duration,
        label,
        isCustom: true,
      };
      this.voiceOffsetSec = 0;
      this.lastError = null;
      return this.customVoice;
    } catch (err) {
      this.lastError = err?.message || 'Unsupported audio format.';
      return null;
    }
  }

  clearCustomVoice() {
    this.customVoice = null;
    this.voiceOffsetSec = 0;
  }

  getActiveVoice() {
    return this.customVoice || this.presetVoices[this.activePreset] || this.presetVoices.talk || this.presetVoices.lab || null;
  }

  getVoicePosition() {
    const active = this.getActiveVoice();
    const duration = active ? active.duration : MAX_VOICE_SECONDS;
    if (this.isPlaying && this.activeType === 'voice' && this.ctx) {
      const elapsed = Math.max(0, this.ctx.currentTime - this.voiceStartCtxTime);
      return Math.min(duration, this.voiceStartOffset + elapsed);
    }
    return Math.min(duration, Math.max(0, this.voiceOffsetSec));
  }

  setVoiceOffset(seconds) {
    const active = this.getActiveVoice();
    const duration = active ? active.duration : MAX_VOICE_SECONDS;
    const clamped = Math.max(0, Math.min(duration, seconds));
    this.voiceOffsetSec = clamped;
    if (this.isPlaying && this.activeType === 'voice' && this.mode) {
      this.playVoiceMode(this.mode, this.voiceParams, clamped);
    }
  }

  setOnVoiceEnded(cb) {
    this.onVoiceEndedCallback = cb;
  }

  stopSource() {
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      try {
        this.sourceNode.stop();
      } catch {
        // ignore if already stopped
      }
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    if (this.noiseSourceNode) {
      try {
        this.noiseSourceNode.stop();
      } catch {
        // ignore
      }
      try {
        this.noiseSourceNode.disconnect();
      } catch {
        // ignore
      }
      this.noiseSourceNode = null;
    }
    if (this.voiceGainNode) {
      try {
        this.voiceGainNode.disconnect();
      } catch {
        // ignore
      }
      this.voiceGainNode = null;
    }
    if (this.noiseGainNode) {
      try {
        this.noiseGainNode.disconnect();
      } catch {
        // ignore
      }
      this.noiseGainNode = null;
    }
    if (this.demodLpfNode) {
      try {
        this.demodLpfNode.disconnect();
      } catch {
        // ignore
      }
      this.demodLpfNode = null;
    }
  }

  async playMode(mode, data) {
    if (data) {
      this.signalData = { ...this.signalData, ...data };
    }

    const { mValues, yValues, timeSpan = 0.01, fm = 280 } = this.signalData;

    if (mode === 'original' && (!mValues || mValues.length === 0)) {
      this.stop();
      return false;
    }
    if (mode === 'recovered' && (!yValues || yValues.length === 0)) {
      this.stop();
      return false;
    }

    if (!this.init() || !this.ctx || !this.masterGain) {
      return false;
    }

    try {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.stopSource();

      const targetRate = this.ctx.sampleRate || 48000;
      const peakM = getPeakAmplitude(mValues);
      const peakY = getPeakAmplitude(yValues);

      let audioBuffer;
      if (mode === 'original') {
        const denom = Math.max(REFERENCE_HEADROOM, peakM * 1.05);
        const channel = buildLoopableChannel(mValues, timeSpan, fm, targetRate, denom);
        audioBuffer = this.ctx.createBuffer(1, channel.length, targetRate);
        audioBuffer.copyToChannel(channel, 0);
      } else {
        const denom = Math.max(REFERENCE_HEADROOM, peakY * 1.05);
        const channel = buildLoopableChannel(yValues, timeSpan, fm, targetRate, denom);
        audioBuffer = this.ctx.createBuffer(1, channel.length, targetRate);
        audioBuffer.copyToChannel(channel, 0);
      }

      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;
      source.connect(this.masterGain);

      const now = this.ctx.currentTime;
      const targetGain = Math.min(1.0, Math.max(0, this.volume * 2.0));
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(targetGain, now, 0.015);

      source.start(now);
      this.sourceNode = source;
      this.isPlaying = true;
      this.mode = mode;
      this.activeType = 'tone';
      this.lastError = null;
      return true;
    } catch (err) {
      this.lastError = err?.message || 'Audio playback failed.';
      this.stopSource();
      this.isPlaying = false;
      this.mode = null;
      this.activeType = null;
      return false;
    }
  }

  async playVoiceMode(mode, params, explicitOffsetSec = null) {
    if (params) {
      this.voiceParams = { ...this.voiceParams, ...params };
    }

    if (!this.init() || !this.ctx || !this.masterGain) {
      return false;
    }

    const activeVoice = this.getActiveVoice() || (await this.loadDefaultVoice());
    if (!activeVoice || !activeVoice.audioBuffer) {
      this.lastError = this.lastError || 'Voice buffer is not ready yet.';
      return false;
    }

    try {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Preserve current playback position when switching seamlessly between m(t) and y(t)
      let startAt =
        explicitOffsetSec !== null
          ? explicitOffsetSec
          : this.isPlaying && this.activeType === 'voice'
          ? this.getVoicePosition()
          : this.voiceOffsetSec;

      if (startAt >= activeVoice.duration - 0.05) {
        startAt = 0;
      }

      this.stopSource();

      const source = this.ctx.createBufferSource();
      source.buffer = activeVoice.audioBuffer;

      const voiceGain = this.ctx.createGain();
      const lpf = this.ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 3400;
      lpf.Q.value = 0.707;

      const noiseGain = this.ctx.createGain();
      const noiseBuf = this.ensureNoiseBuffer();
      let noiseSource = null;
      if (noiseBuf) {
        noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = noiseBuf;
        noiseSource.loop = true;
        noiseSource.connect(noiseGain);
      }

      source.connect(voiceGain);
      if (mode === 'recovered') {
        voiceGain.connect(lpf);
        noiseGain.connect(lpf);
        lpf.connect(this.masterGain);
      } else {
        voiceGain.connect(this.masterGain);
        noiseGain.gain.value = 0;
      }

      this.sourceNode = source;
      this.noiseSourceNode = noiseSource;
      this.voiceGainNode = voiceGain;
      this.noiseGainNode = noiseGain;
      this.demodLpfNode = lpf;

      this.isPlaying = true;
      this.mode = mode;
      this.activeType = 'voice';
      this.voiceOffsetSec = startAt;
      this.voiceStartOffset = startAt;
      this.voiceStartCtxTime = this.ctx.currentTime;

      this.applyVoiceGains(mode, this.voiceParams);

      const now = this.ctx.currentTime;
      const targetGain = Math.min(1.0, Math.max(0, this.volume * 2.0));
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(targetGain, now, 0.015);

      source.onended = () => {
        if (this.sourceNode === source && this.isPlaying && this.activeType === 'voice') {
          this.isPlaying = false;
          this.mode = null;
          this.activeType = null;
          this.voiceOffsetSec = 0;
          this.stopSource();
          if (this.onVoiceEndedCallback) {
            this.onVoiceEndedCallback();
          }
        }
      };

      source.start(now, startAt);
      if (noiseSource) {
        noiseSource.start(now);
      }

      this.lastError = null;
      return true;
    } catch (err) {
      this.lastError = err?.message || 'Voice playback failed.';
      this.stopSource();
      this.isPlaying = false;
      this.mode = null;
      this.activeType = null;
      return false;
    }
  }

  applyVoiceGains(mode, params) {
    if (!this.ctx || !this.voiceGainNode) return;
    const { Am = 1.0, Ac = 1.0, phiDeg = 0, noiseEnabled = false, snrDb = 20 } = params;
    const now = this.ctx.currentTime;
    const phiRad = (phiDeg * Math.PI) / 180;

    if (mode === 'original') {
      const g = Math.min(1.4, Am * 0.58);
      this.voiceGainNode.gain.setTargetAtTime(g, now, 0.015);
      if (this.noiseGainNode) {
        this.noiseGainNode.gain.setTargetAtTime(0, now, 0.015);
      }
    } else {
      // Coherent DSB-SC demodulated output: y(t) = Ac * cos(phi) * m(t) + filtered channel noise
      const g = Math.max(-1.6, Math.min(1.6, Am * Ac * Math.cos(phiRad) * 0.58));
      this.voiceGainNode.gain.setTargetAtTime(g, now, 0.015);

      if (this.noiseGainNode) {
        let nGain = 0;
        if (noiseEnabled && snrDb >= 0) {
          // Baseband noise level relative to speech RMS (~0.28 * Am * Ac)
          nGain = Math.min(1.1, 0.45 * Am * Ac * Math.pow(10, -snrDb / 20));
        }
        this.noiseGainNode.gain.setTargetAtTime(nGain, now, 0.015);
      }
    }
  }

  updateVoiceParams(params) {
    this.voiceParams = { ...this.voiceParams, ...params };
    if (this.isPlaying && this.activeType === 'voice' && this.mode) {
      this.applyVoiceGains(this.mode, this.voiceParams);
    }
  }

  updateSignals(data) {
    this.signalData = { ...this.signalData, ...data };
    if (this.isPlaying && this.activeType === 'tone' && this.mode) {
      this.playMode(this.mode, this.signalData);
    }
  }

  stop() {
    if (this.isPlaying && this.activeType === 'voice') {
      this.voiceOffsetSec = this.getVoicePosition();
    }
    this.isPlaying = false;
    this.mode = null;
    this.activeType = null;
    if (this.ctx && this.masterGain) {
      try {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0, now, 0.015);
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      if (!this.isPlaying) {
        this.stopSource();
      }
    }, 35);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.isPlaying && this.masterGain && this.ctx) {
      try {
        const targetGain = Math.min(1.0, Math.max(0, this.volume * 2.0));
        this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
      } catch {
        // ignore
      }
    }
  }
}

export const audioEngine = new ModulationAudioEngine();
