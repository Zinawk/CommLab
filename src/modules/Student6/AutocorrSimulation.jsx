import React, { useState, useMemo } from 'react';
import katex from 'katex';
import { Sliders } from 'lucide-react';
import {
  generateNoisySignal,
  computeAutocorrelation,
} from './autocorrMath.js';
import SignalChart from './SignalChart.jsx';

/**
 * Student 6: Zinegnaw — Signal Autocorrelation Analysis
 */
export default function AutocorrSimulation() {
  const [arCoeff, setArCoeff] = useState(0.9);
  const [noiseLevel, setNoiseLevel] = useState(1.0);
  const [maxLagMs, setMaxLagMs] = useState(150);

  const sampleRate = 1000;
  const duration = 0.4;

  const signalData = useMemo(() => {
    return generateNoisySignal({
      amplitude: 0,
      arCoeff,
      noiseLevel,
      sampleRate,
      duration,
    });
  }, [arCoeff, noiseLevel, sampleRate, duration]);

  const maxLagSamples = Math.round((maxLagMs / 1000) * sampleRate);
  const autocorrData = useMemo(() => {
    return computeAutocorrelation(signalData, maxLagSamples, sampleRate, true);
  }, [signalData, maxLagSamples, sampleRate]);

  const timeMs = useMemo(() => signalData.time.map((t) => t * 1000), [signalData.time]);
  const lagsMs = useMemo(() => autocorrData.lags.map((l) => l * 1000), [autocorrData.lags]);

  const autocorrFormulaHtml = useMemo(
    () =>
      katex.renderToString(
        'R_X(\\tau) = \\lim_{T \\to \\infty} \\frac{1}{2T} \\int_{-T}^{T} x(t)\\,x(t - \\tau)\\,dt',
        { throwOnError: false, displayMode: false }
      ),
    []
  );

  return (
    <div className="w-full flex-1 flex flex-col gap-6">
      <p className="text-sm text-[#6B5145] max-w-2xl">
        Explore how autocorrelation R_X(τ) measures the similarity of a random AR(1) process X(t) with its shifted replica X(t − τ), peaking at τ = 0.
      </p>

      {/* Main Two-Zone Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left: Side-by-Side White Chart Cards */}
        <div className="flex-1 min-w-0 w-full grid grid-cols-1 xl:grid-cols-2 gap-5">
          <SignalChart
            title={`Realization of X(t) (AR(1), φ = ${arCoeff.toFixed(2)})`}
            xData={timeMs}
            yData={signalData.signal}
            color="#0369A1"
            xUnit="ms"
            xLabel="Time t (ms)"
            yLabel="X(t) (V)"
          />

          <SignalChart
            title="Autocorrelation of X(t)"
            xData={lagsMs}
            yData={autocorrData.autocorr}
            color="#C2410C"
            strokeWidth={1.75}
            xUnit="ms"
            xLabel="Lag τ (ms)"
            yLabel="R_X(τ) (norm.)"
          />
        </div>

        {/* Right: Grouped Control Deck */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E4DBD2]">
            <Sliders className="w-4 h-4 text-[#9A4324]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
              Process Controls
            </h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B5145] font-medium">Correlation (φ)</span>
                <span className="font-mono text-[#9A4324] font-semibold tabular-nums">
                  {arCoeff.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.96"
                step="0.02"
                value={arCoeff}
                onChange={(e) => setArCoeff(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B5145] font-medium">Noise Std Dev (σ)</span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">
                  {noiseLevel.toFixed(2)} V
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={noiseLevel}
                onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B5145] font-medium">Max Lag Window (±τ)</span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">
                  ±{maxLagMs} ms
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                step="50"
                value={maxLagMs}
                onChange={(e) => setMaxLagMs(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E4DBD2] bg-white/75 rounded-lg p-3 space-y-1 text-xs font-mono text-[#6B5145]">
            <div className="flex justify-between">
              <span>AR(1) Model</span>
              <span className="text-[#3B2923] font-semibold">x[t] = φx[t−1] + ε[t]</span>
            </div>
            <div className="flex justify-between tabular-nums">
              <span>Avg Power R_X(0)</span>
              <span className="text-[#9A4324] font-semibold">
                {autocorrData.avgPower.toFixed(2)} V²
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom: Formulas & Explanation */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Autocorrelation Definition
          </h3>
          <div
            className="text-sm text-[#3B2923] py-1 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: autocorrFormulaHtml }}
          />
          <div className="font-mono text-xs text-[#6B5145] pt-2 border-t border-[#E4DBD2] tabular-nums">
            {`x[t] = φ·x[t − 1] + ε[t] · R_X(0) = ${autocorrData.avgPower.toFixed(2)} V² (Normalized Peak = 1.0)`}
          </div>
        </div>

        <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Explanation
          </h3>
          <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
            <p>
              Autocorrelation measures the time-averaged overlap of X(t) and X(t − τ). It is an even function that reaches its maximum at τ = 0 equal to average power (normalized to 1.0), decaying toward zero as lag |τ| grows.
            </p>
            <p>
              Increasing persistence φ strengthens memory between adjacent samples and widens the correlation lobe around τ = 0, while σ scales the total process variance.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
