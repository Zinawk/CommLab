import React, { useState } from 'react';
import { WaveformCanvas, SpectrumCanvas } from './ModulationCanvas.jsx';
import { AlertTriangle, Play, Pause, Mic, Volume2 } from 'lucide-react';

function formatClock(sec) {
  const safe = Math.max(0, Math.floor(sec || 0));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

export default function ModulationColumn({
  view = 'waveforms', // 'waveforms' | 'spectrum'
  tValues,
  mValues,
  cValues,
  sValues,
  envPosValues,
  yValues,
  showOverlay = true,
  Am,
  fm,
  Ac,
  fc,
  phiDeg,
  noiseEnabled = false,
  snrDb = 20,
  isVoice = false,
  voiceTime = 0,
  voiceDuration = 60,
  voiceLabel = 'Real Talk (1:00)',
  voiceLoading = false,
  onSeekVoice,
  fMin,
  fMax,
  fFrequencies,
  fMagnitudes,
  peakHeightDsb,
  basebandMaxF = 3800,
  basebandFrequencies,
  basebandMagRecovered,
  peakHeightBaseband = 1.0,
  metrics,
  isQuadratureNull,
  audioMode = null,
  audioError = null,
  onToggleOriginalVoice,
  onToggleRecoveredVoice,
  onToggleOriginalTone,
  onToggleRecoveredTone,
}) {
  const [spectrumMode, setSpectrumMode] = useState('passband'); // 'passband' | 'baseband'

  const mRange = 2.2;
  const cRange = 2.2;
  const sRange = 4.2;
  const yRange = 4.2;
  const specMax = Math.max(
    2.6,
    (spectrumMode === 'passband' ? peakHeightDsb : peakHeightBaseband) * 1.25
  );

  const scaledOverlay = mValues ? Array.from(mValues, (v) => v * Ac) : null;
  const demodGain = Ac * Math.cos((phiDeg * Math.PI) / 180);

  if (view === 'spectrum') {
    return (
      <div className="w-full flex flex-col gap-5">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-0.5 bg-[#C2410C] shrink-0" />
                <h3 className="text-sm font-semibold text-[#3B2923] truncate">
                  Modulation Spectrum |S(f)|
                </h3>
              </div>
              <span className="text-xs font-mono text-[#6B5145] tabular-nums shrink-0">
                Peak {peakHeightDsb.toFixed(2)} V
              </span>
            </div>
            <SpectrumCanvas
              mode="passband"
              isVoice={isVoice}
              fMin={fMin}
              fMax={fMax}
              fc={fc}
              fm={fm}
              fFrequencies={fFrequencies}
              fMagnitudes={fMagnitudes}
              peakHeight={peakHeightDsb}
              yMax={Math.max(2.6, peakHeightDsb * 1.25)}
              yAxisLabel="|S(f)| (V)"
              xAxisLabel="Frequency f (Hz)"
              color="#C2410C"
              height={210}
            />
          </div>

          <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-0.5 bg-[#047857] shrink-0" />
                <h3 className="text-sm font-semibold text-[#3B2923] truncate">
                  Recovered Baseband Spectrum |Y(f)|
                </h3>
              </div>
              <span className="text-xs font-mono text-[#6B5145] tabular-nums shrink-0">
                Peak {peakHeightBaseband.toFixed(2)} V
              </span>
            </div>
            <SpectrumCanvas
              mode="baseband"
              isVoice={isVoice}
              fMin={0}
              fMax={basebandMaxF}
              fc={fc}
              fm={fm}
              fFrequencies={basebandFrequencies}
              fMagnitudes={basebandMagRecovered}
              peakHeight={peakHeightBaseband}
              yMax={Math.max(2.6, peakHeightBaseband * 1.25)}
              yAxisLabel="|Y(f)| (V)"
              xAxisLabel="Baseband Frequency f (Hz)"
              color="#047857"
              height={210}
            />
          </div>
        </div>

        <div className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-0.5">
            <div className="text-xs text-[#6B5145] font-medium">Bandwidth</div>
            <div className="font-mono text-base font-bold text-[#3B2923] tabular-nums">
              {metrics.bw.toLocaleString()} Hz
            </div>
            <div className="text-[11px] font-mono text-[#0369A1] tabular-nums">
              LSB {(metrics.lsbFreq / 1000).toFixed(2)}k · USB {(metrics.usbFreq / 1000).toFixed(2)}k
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-xs text-[#6B5145] font-medium">Sideband Efficiency</div>
            <div className="font-mono text-base font-bold text-[#3B2923] tabular-nums">
              {metrics.powerEfficiency}%
            </div>
            <div className="text-[11px] font-mono text-[#6B5145]">Carrier Suppressed</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-xs text-[#6B5145] font-medium">Recovered Amplitude</div>
            <div
              className={`font-mono text-base font-bold tabular-nums ${
                isQuadratureNull ? 'text-[#BE123C]' : 'text-[#047857]'
              }`}
            >
              {metrics.recAmpPct.toFixed(1)}%
            </div>
            <div className="text-[11px] font-mono text-[#6B5145] tabular-nums">
              {metrics.peakRecovered.toFixed(2)} V peak
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-xs text-[#6B5145] font-medium">Demod Fidelity</div>
            <div className="font-mono text-base font-bold text-[#0369A1] tabular-nums">
              r = {metrics.correlation.toFixed(2)}
            </div>
            <div className="text-[11px] font-mono text-[#6B5145] tabular-nums">
              MSE = {metrics.mse.toFixed(3)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {isQuadratureNull && (
        <div className="flex items-center gap-2 bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] rounded-xl px-4 py-2.5 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-[#BE123C] shrink-0" />
          <span>
            Quadrature Null Active (φ = {phiDeg}°): cos(φ) ≈ 0 — recovered signal and demodulated voice vanish.
          </span>
        </div>
      )}

      {/* Row 1: Message m(t) & Carrier c(t) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-0.5 bg-[#0369A1] shrink-0" />
              <h3 className="text-sm font-semibold text-[#3B2923] truncate">Message m(t)</h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleOriginalVoice}
                disabled={voiceLoading}
                className={`px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 transition-colors ${
                  audioMode === 'voice-original'
                    ? 'bg-[#9A4324] border-[#9A4324] text-white'
                    : 'bg-[#F5F0EA] hover:bg-[#EDE4DA] border-[#E4DBD2] text-[#3B2923]'
                }`}
                title="Play 1-minute real conversational voice as message signal m(t)"
              >
                {audioMode === 'voice-original' ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Mic className="w-3 h-3 text-[#9A4324]" />
                )}
                <span className="tabular-nums">
                  {audioMode === 'voice-original'
                    ? `Pause ${formatClock(voiceTime)}`
                    : 'Voice 1m'}
                </span>
              </button>

              {!isVoice && (
                <button
                  type="button"
                  onClick={onToggleOriginalTone}
                  disabled={!mValues || mValues.length === 0}
                  className={`px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 transition-colors ${
                    audioMode === 'tone-original'
                      ? 'bg-[#0369A1] border-[#0369A1] text-white'
                      : 'bg-white hover:bg-[#F5F0EA] border-[#D4C8BC] text-[#3B2923]'
                  }`}
                  title="Play synthetic message tone"
                >
                  {audioMode === 'tone-original' ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3 text-[#0369A1]" />
                  )}
                  <span>{audioMode === 'tone-original' ? 'Stop' : 'Tone'}</span>
                </button>
              )}
            </div>
          </div>
          <WaveformCanvas
            tValues={tValues}
            yValues={mValues}
            yMin={-mRange}
            yMax={mRange}
            color="#0369A1"
            yAxisLabel="m(t) (V)"
            xAxisLabel="Time t (ms)"
            height={132}
          />
        </div>

        <div className="bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-0.5 bg-[#7E22CE] shrink-0" />
              <h3 className="text-sm font-semibold text-[#3B2923] truncate">Carrier c(t)</h3>
            </div>
            <span className="text-xs font-mono text-[#6B5145] tabular-nums whitespace-nowrap shrink-0">
              {(fc / 1000).toFixed(1)} kHz · φ = {phiDeg}°
            </span>
          </div>
          <WaveformCanvas
            tValues={tValues}
            yValues={cValues}
            yMin={-cRange}
            yMax={cRange}
            color="#7E22CE"
            yAxisLabel="c(t) (V)"
            xAxisLabel="Time t (ms)"
            height={132}
          />
        </div>
      </div>

      {/* Row 2: Modulation s(t) & Recovered Message y(t) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-0.5 bg-[#C2410C] shrink-0" />
              <h3 className="text-sm font-semibold text-[#3B2923] truncate">Modulation s(t)</h3>
            </div>
            <span className="text-xs font-mono text-[#6B5145] whitespace-nowrap shrink-0">
              ±Envelope
            </span>
          </div>
          <WaveformCanvas
            tValues={tValues}
            yValues={sValues}
            envelopeValues={envPosValues}
            yMin={-sRange}
            yMax={sRange}
            color="#C2410C"
            yAxisLabel="s(t) (V)"
            xAxisLabel="Time t (ms)"
            height={132}
          />
        </div>

        <div className="bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-0.5 bg-[#047857] shrink-0" />
              <h3 className="text-sm font-semibold text-[#3B2923] truncate">
                Recovered Message y(t)
              </h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleRecoveredVoice}
                disabled={voiceLoading}
                className={`px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 transition-colors ${
                  audioMode === 'voice-recovered'
                    ? 'bg-[#047857] border-[#047857] text-white'
                    : 'bg-[#F5F0EA] hover:bg-[#EDE4DA] border-[#E4DBD2] text-[#3B2923]'
                }`}
                title="Play DSB-SC coherently demodulated 1-minute voice y(t)"
              >
                {audioMode === 'voice-recovered' ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3 text-[#047857]" />
                )}
                <span className="tabular-nums">
                  {audioMode === 'voice-recovered'
                    ? `Pause ${formatClock(voiceTime)}`
                    : 'Demod Voice'}
                </span>
              </button>

              {!isVoice && (
                <button
                  type="button"
                  onClick={onToggleRecoveredTone}
                  disabled={!yValues || yValues.length === 0}
                  className={`px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 transition-colors ${
                    audioMode === 'tone-recovered'
                      ? 'bg-[#047857] border-[#047857] text-white'
                      : 'bg-white hover:bg-[#F5F0EA] border-[#D4C8BC] text-[#3B2923]'
                  }`}
                  title="Play synthetic demodulated tone"
                >
                  {audioMode === 'tone-recovered' ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3 text-[#047857]" />
                  )}
                  <span>{audioMode === 'tone-recovered' ? 'Stop' : 'Tone'}</span>
                </button>
              )}
            </div>
          </div>
          <WaveformCanvas
            tValues={tValues}
            yValues={yValues}
            overlayValues={scaledOverlay}
            showOverlay={showOverlay}
            yMin={-yRange}
            yMax={yRange}
            color="#047857"
            yAxisLabel="y(t) (V)"
            xAxisLabel="Time t (ms)"
            height={132}
          />
        </div>
      </div>

      {/* Row 3: Left = 1-Min Voice Scrubber & Metrics | Right = Inline Frequency Spectrum Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        <div className="bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col justify-between gap-4 min-w-0">
          <div className="space-y-2 pb-3 border-b border-[#E4DBD2]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#3B2923] truncate">
                {voiceLoading ? 'Loading 1-minute talk…' : voiceLabel}
              </span>
              <span className="font-mono text-[#6B5145] tabular-nums shrink-0">
                {formatClock(voiceTime)} / {formatClock(voiceDuration)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(1, voiceDuration)}
              step={0.1}
              value={Math.min(voiceDuration, voiceTime)}
              onChange={(e) => onSeekVoice && onSeekVoice(parseFloat(e.target.value))}
              className="w-full"
              aria-label="1-Minute Voice Timeline"
            />
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span
                className={
                  audioMode === 'voice-original'
                    ? 'text-[#0369A1] font-semibold'
                    : audioMode === 'voice-recovered'
                    ? 'text-[#047857] font-semibold'
                    : 'text-[#6B5145]'
                }
              >
                {audioMode === 'voice-original'
                  ? 'Playing Original m(t) · Full Talk'
                  : audioMode === 'voice-recovered'
                  ? `Playing Demod y(t) · Gain ${demodGain.toFixed(2)}×`
                  : 'Compare Voice 1m vs Demod Voice'}
              </span>
              <span className="font-mono text-[#6B5145] tabular-nums shrink-0">
                LPF 3.4kHz · {noiseEnabled ? `${snrDb}dB` : 'Clean'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-lg px-3 py-2 space-y-0.5">
              <div className="text-[11px] text-[#6B5145] font-medium">Bandwidth</div>
              <div className="font-mono text-sm font-bold text-[#3B2923] tabular-nums">
                {metrics.bw.toLocaleString()} Hz
              </div>
              <div className="text-[10.5px] font-mono text-[#0369A1] tabular-nums">
                LSB {(metrics.lsbFreq / 1000).toFixed(2)}k · USB {(metrics.usbFreq / 1000).toFixed(2)}k
              </div>
            </div>

            <div className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-lg px-3 py-2 space-y-0.5">
              <div className="text-[11px] text-[#6B5145] font-medium">Sideband Efficiency</div>
              <div className="font-mono text-sm font-bold text-[#3B2923] tabular-nums">
                {metrics.powerEfficiency}%
              </div>
              <div className="text-[10.5px] font-mono text-[#6B5145]">Carrier Suppressed</div>
            </div>

            <div className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-lg px-3 py-2 space-y-0.5">
              <div className="text-[11px] text-[#6B5145] font-medium">Recovered Amplitude</div>
              <div
                className={`font-mono text-sm font-bold tabular-nums ${
                  isQuadratureNull ? 'text-[#BE123C]' : 'text-[#047857]'
                }`}
              >
                {metrics.recAmpPct.toFixed(1)}%
              </div>
              <div className="text-[10.5px] font-mono text-[#6B5145] tabular-nums">
                {metrics.peakRecovered.toFixed(2)} V peak
              </div>
            </div>

            <div className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-lg px-3 py-2 space-y-0.5">
              <div className="text-[11px] text-[#6B5145] font-medium">Demod Fidelity</div>
              <div className="font-mono text-sm font-bold text-[#0369A1] tabular-nums">
                r = {metrics.correlation.toFixed(2)}
              </div>
              <div className="text-[10.5px] font-mono text-[#6B5145] tabular-nums">
                MSE = {metrics.mse.toFixed(3)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-0.5 shrink-0"
                style={{
                  backgroundColor: spectrumMode === 'passband' ? '#C2410C' : '#047857',
                }}
              />
              <h3 className="text-sm font-semibold text-[#3B2923] truncate">
                {spectrumMode === 'passband'
                  ? 'Frequency Spectrum |S(f)|'
                  : 'Recovered Spectrum |Y(f)|'}
              </h3>
            </div>
            <div className="flex items-center gap-1 bg-[#F5F0EA] border border-[#E4DBD2] p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setSpectrumMode('passband')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                  spectrumMode === 'passband'
                    ? 'bg-[#9A4324] text-white'
                    : 'text-[#6B5145] hover:text-[#3B2923]'
                }`}
              >
                |S(f)|
              </button>
              <button
                type="button"
                onClick={() => setSpectrumMode('baseband')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                  spectrumMode === 'baseband'
                    ? 'bg-[#9A4324] text-white'
                    : 'text-[#6B5145] hover:text-[#3B2923]'
                }`}
              >
                |Y(f)|
              </button>
            </div>
          </div>

          {spectrumMode === 'passband' ? (
            <SpectrumCanvas
              mode="passband"
              isVoice={isVoice}
              fMin={fMin}
              fMax={fMax}
              fc={fc}
              fm={fm}
              fFrequencies={fFrequencies}
              fMagnitudes={fMagnitudes}
              peakHeight={peakHeightDsb}
              yMax={specMax}
              yAxisLabel="|S(f)| (V)"
              xAxisLabel="Frequency f (Hz)"
              color="#C2410C"
              height={155}
            />
          ) : (
            <SpectrumCanvas
              mode="baseband"
              isVoice={isVoice}
              fMin={0}
              fMax={basebandMaxF}
              fc={fc}
              fm={fm}
              fFrequencies={basebandFrequencies}
              fMagnitudes={basebandMagRecovered}
              peakHeight={peakHeightBaseband}
              yMax={specMax}
              yAxisLabel="|Y(f)| (V)"
              xAxisLabel="Baseband Frequency f (Hz)"
              color="#047857"
              height={155}
            />
          )}
        </div>
      </div>

      {audioError && (
        <div className="bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] rounded-xl px-4 py-2 text-xs font-medium">
          {audioError}
        </div>
      )}
    </div>
  );
}
