import React, { useState, useMemo } from 'react';
import katex from 'katex';
import {
  Sliders,
  Radio,
  Activity,
  Layers,
} from 'lucide-react';
import {
  generateSignalForPsd,
  computePsdWienerKhinchin,
  calculatePsdMetrics,
} from './psdMath.js';
import SignalChart from './SignalChart.jsx';
import PsdChart from './PsdChart.jsx';

/**
 * Student 6: Zinegnaw — Power Spectral Density (PSD) Simulator
 */
export default function PsdSimulation() {
  const [signalType, setSignalType] = useState('sine_noise');

  const [frequency, setFrequency] = useState(50.0);
  const [amplitude, setAmplitude] = useState(1.6);
  const [noiseLevel, setNoiseLevel] = useState(0.75);

  const sampleRate = 800;
  const duration = 1.5;

  const activeFrequency = signalType === 'low_freq_noise' ? Math.min(frequency, 200) : frequency;

  const signalData = useMemo(() => {
    return generateSignalForPsd({
      signalType,
      frequency: activeFrequency,
      amplitude,
      noiseLevel,
      sampleRate,
      duration,
      phase: 0,
    });
  }, [signalType, activeFrequency, amplitude, noiseLevel, sampleRate, duration]);

  const { displayTimeMs, displaySignal } = useMemo(() => {
    const displayCount = Math.min(signalData.time.length, Math.round(0.4 * sampleRate) + 1);
    return {
      displayTimeMs: signalData.time.slice(0, displayCount).map((t) => t * 1000),
      displaySignal: signalData.signal.slice(0, displayCount),
    };
  }, [signalData, sampleRate]);

  const psdResults = useMemo(() => {
    return computePsdWienerKhinchin({
      signal: signalData.signal,
      sampleRate,
      maxLag: 160,
      numFreqBins: 161,
    });
  }, [signalData.signal, sampleRate]);

  const metrics = useMemo(() => {
    return calculatePsdMetrics({
      signalType,
      frequency: activeFrequency,
      amplitude,
      noiseLevel,
      frequencies: psdResults.frequencies,
      psd: psdResults.psd,
      totalPower: psdResults.totalPower,
    });
  }, [signalType, activeFrequency, amplitude, noiseLevel, psdResults]);

  const wkFormulaHtml = useMemo(
    () =>
      katex.renderToString(
        'S_X(f) = \\int_{-\\infty}^{\\infty} R_X(\\tau)\\,e^{-j2\\pi f\\tau}\\,d\\tau,\\qquad R_X(0) = \\int_{-\\infty}^{\\infty} S_X(f)\\,df',
        { throwOnError: false, displayMode: false }
      ),
    []
  );

  return (
    <div className="w-full flex-1 flex flex-col gap-6">
      <p className="text-sm text-[#6B5145] max-w-2xl">
        Analyze how signal power distributes across frequency S_X(f) via the Wiener–Khinchin Fourier transform of autocorrelation R_X(τ).
      </p>

      {/* Main Two-Zone Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left: Side-by-Side Chart Cards */}
        <div className="flex-1 min-w-0 w-full grid grid-cols-1 xl:grid-cols-2 gap-5">
          <SignalChart
            title="Random Signal (Time Domain)"
            xData={displayTimeMs}
            yData={displaySignal}
            color="#0369A1"
            xUnit="ms"
            xLabel="Time t (ms)"
            yLabel="x(t) (V)"
          />

          <PsdChart
            title="Power Spectral Density (Frequency Domain)"
            frequencies={psdResults.frequencies}
            psdData={psdResults.psd}
            isDbScale={false}
            peakFreq={null}
            color="#C2410C"
            showTheoretical={false}
            xLabel="Frequency f (Hz)"
            yLabel="S_X(f) (V²/Hz)"
          />
        </div>

        {/* Right: Parameters Panel */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E4DBD2]">
            <Sliders className="w-4 h-4 text-[#9A4324]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
              Spectral Controls
            </h3>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#3B2923] block">Signal Process</span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => setSignalType('sine_noise')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 border ${
                  signalType === 'sine_noise'
                    ? 'bg-[#9A4324] text-white border-[#9A4324]'
                    : 'bg-white text-[#3B2923] hover:bg-[#EDE4DA] border-[#D4C8BC]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>Sinusoid + Noise</span>
              </button>

              <button
                type="button"
                onClick={() => setSignalType('white_noise')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 border ${
                  signalType === 'white_noise'
                    ? 'bg-[#9A4324] text-white border-[#9A4324]'
                    : 'bg-white text-[#3B2923] hover:bg-[#EDE4DA] border-[#D4C8BC]'
                }`}
              >
                <Radio className="w-3.5 h-3.5 shrink-0" />
                <span>White Noise</span>
              </button>

              <button
                type="button"
                onClick={() => setSignalType('low_freq_noise')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 border ${
                  signalType === 'low_freq_noise'
                    ? 'bg-[#9A4324] text-white border-[#9A4324]'
                    : 'bg-white text-[#3B2923] hover:bg-[#EDE4DA] border-[#D4C8BC]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Low-Freq Noise</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-[#E4DBD2]">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B5145] font-medium">
                  {signalType === 'low_freq_noise' ? 'Cutoff Freq (f_c)' : 'Tone Freq (f₀)'}
                </span>
                <span className="font-mono text-[#9A4324] font-semibold tabular-nums">
                  {signalType === 'white_noise' ? '—' : `${activeFrequency.toFixed(0)} Hz`}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max={signalType === 'low_freq_noise' ? '200' : '350'}
                step="5"
                disabled={signalType === 'white_noise'}
                value={activeFrequency}
                onChange={(e) => setFrequency(parseFloat(e.target.value))}
                className={`w-full ${signalType === 'white_noise' ? 'opacity-40 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B5145] font-medium">Amplitude (A)</span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">
                  {signalType === 'sine_noise' ? `${amplitude.toFixed(2)} V` : '—'}
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                disabled={signalType !== 'sine_noise'}
                value={amplitude}
                onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                className={`w-full ${signalType !== 'sine_noise' ? 'opacity-40 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B5145] font-medium">Noise (σ)</span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">
                  {noiseLevel.toFixed(2)} V
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="2.0"
                step="0.05"
                value={noiseLevel}
                onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E4DBD2] bg-white/75 rounded-lg p-3 flex justify-between items-center text-xs font-mono">
            <span className="text-[#6B5145]">Total Power R_X(0)</span>
            <span className="text-[#9A4324] font-semibold tabular-nums">
              {metrics.totalPower.toFixed(2)} V²
            </span>
          </div>
        </aside>
      </div>

      {/* Bottom: Formulas & Explanation */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Wiener–Khinchin Theorem
          </h3>
          <div
            className="text-sm text-[#3B2923] py-1 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: wkFormulaHtml }}
          />
          <div className="font-mono text-xs text-[#6B5145] pt-2 border-t border-[#E4DBD2] tabular-nums">
            {`Integrated Power R_X(0) ≈ ${metrics.totalPower.toFixed(2)} V² · Nyquist = ${sampleRate / 2} Hz`}
          </div>
        </div>

        <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Explanation
          </h3>
          <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
            <p>
              Power Spectral Density S_X(f) is the Fourier transform of autocorrelation R_X(τ) and shows how signal variance spreads over frequency. A sinusoid concentrates energy into a sharp spike at f₀, standing out clearly above noise.
            </p>
            <p>
              White noise distributes power evenly proportional to σ², whereas low-frequency noise concentrates energy below cutoff f_c and rolls off at higher frequencies; integrating S_X(f) recovers total power R_X(0).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
