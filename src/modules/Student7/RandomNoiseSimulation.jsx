import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import { Play, Pause, RotateCcw, Sliders } from 'lucide-react';
import {
  DEFAULT_RANDOM_PARAMS,
  RANDOM_LIMITS,
  MAX_BUFFER_SAMPLES,
  validateRandomParams,
  createSampleDraws,
  evaluateSimulationFromDraws,
} from './randomNoiseMath.js';
import {
  TimeSeriesChart,
  PmfChart,
  PdfChart,
  CdfChart,
} from './RandomNoiseCharts.jsx';

const INITIAL_BATCH_SIZE = 56;
const STREAM_STEP_SIZE = 4;
const STREAM_INTERVAL_MS = 200;

function formatVal(val, unit) {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  const rounded = Math.abs(val) < 0.0005 ? 0 : val;
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${Math.abs(rounded).toFixed(2)}${unit}`;
}

function FormulaMath({ math }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, { displayMode: false, throwOnError: false });
    } catch {
      return `<code>${math}</code>`;
    }
  }, [math]);

  return (
    <span
      className="text-[#3B2923] [&_.katex]:text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function RandomNoiseSimulation() {
  const [isRunning, setIsRunning] = useState(true);
  const [params, setParams] = useState(DEFAULT_RANDOM_PARAMS);
  const [draws, setDraws] = useState(() => createSampleDraws(INITIAL_BATCH_SIZE, 0));
  const nextIndexRef = useRef(INITIAL_BATCH_SIZE);

  useEffect(() => {
    if (!isRunning) return undefined;

    const timer = window.setInterval(() => {
      const startIdx = nextIndexRef.current;
      nextIndexRef.current += STREAM_STEP_SIZE;
      const incoming = createSampleDraws(STREAM_STEP_SIZE, startIdx);

      setDraws((prev) => {
        const combined = [...prev, ...incoming];
        if (combined.length > MAX_BUFFER_SAMPLES) {
          return combined.slice(combined.length - MAX_BUFFER_SAMPLES);
        }
        return combined;
      });
    }, STREAM_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  const handleTogglePlay = useCallback(() => {
    if (!isRunning) {
      setDraws((curr) => {
        if (curr.length > 0) return curr;
        const batch = createSampleDraws(INITIAL_BATCH_SIZE, nextIndexRef.current);
        nextIndexRef.current += INITIAL_BATCH_SIZE;
        return batch;
      });
    }
    setIsRunning((prev) => !prev);
  }, [isRunning]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setParams(DEFAULT_RANDOM_PARAMS);
    setDraws([]);
    nextIndexRef.current = 0;
  }, []);

  const updateParam = useCallback((key, value) => {
    setParams((prev) => validateRandomParams({ ...prev, [key]: value }));
  }, []);

  const sim = useMemo(
    () => evaluateSimulationFromDraws(draws, params),
    [draws, params]
  );

  const sharedYBound = useMemo(() => {
    let peak = Math.max(1.5, params.amplitude, 2.5 * params.noiseStd);
    for (let i = 0; i < sim.waveformPoints.length; i++) {
      const p = sim.waveformPoints[i];
      peak = Math.max(peak, Math.abs(p.signal), Math.abs(p.noise), Math.abs(p.combined));
    }
    const raw = peak * 1.15;
    const step = raw <= 2 ? 0.5 : raw <= 5 ? 1 : 2;
    return Math.ceil(raw / step) * step;
  }, [sim.waveformPoints, params]);

  const hasSamples = sim.sampleCount > 0;

  return (
    <div className="w-full flex-1 flex flex-col gap-6">
      <p className="text-sm text-[#6B5145] max-w-2xl">
        Model an additive Gaussian noise channel X[n] = S[n] + W[n] and observe its live discrete PMF, continuous Gaussian-mixture PDF, and cumulative distribution CDF.
      </p>

      {/* Main Two-Zone Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left: 2x3 Charts Grid */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <TimeSeriesChart
              title="Original S[n]"
              waveformPoints={sim.waveformPoints}
              valueKey="signal"
              strokeColor="#B45309"
              primaryLabel="S[n]"
              yBound={sharedYBound}
            />
            <TimeSeriesChart
              title="Random Noise W[n]"
              waveformPoints={sim.waveformPoints}
              valueKey="noise"
              strokeColor="#BE123C"
              primaryLabel="W[n]"
              yBound={sharedYBound}
            />
            <TimeSeriesChart
              title="Received X[n]"
              waveformPoints={sim.waveformPoints}
              valueKey="combined"
              strokeColor="#0369A1"
              primaryLabel="X[n]"
              referenceKey="signal"
              referenceColor="#B45309"
              referenceLabel="S[n]"
              yBound={sharedYBound}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <PmfChart pmfData={sim.pmfData} hasSamples={hasSamples} />
            <PdfChart
              xMin={sim.xMin}
              xMax={sim.xMax}
              binWidth={sim.binWidth}
              pdfBins={sim.pdfBins}
              pdfCurve={sim.pdfCurve}
              hasSamples={hasSamples}
            />
            <CdfChart
              xMin={sim.xMin}
              xMax={sim.xMax}
              cdfPoints={sim.cdfPoints}
              hasSamples={hasSamples}
            />
          </div>
        </div>

        {/* Right Parameters Panel */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DBD2]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#9A4324]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                Channel Controls
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="px-2.5 py-1 rounded-lg bg-[#9A4324] hover:bg-[#7D341A] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isRunning ? 'Pause' : 'Play'}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-white hover:bg-[#EDE4DA] border border-[#E4DBD2] text-[#6B5145] hover:text-[#3B2923] transition-colors cursor-pointer"
                title="Reset"
                aria-label="Reset parameters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#6B5145]">Signal Amplitude (A)</span>
                <span className="font-mono tabular-nums font-semibold text-[#9A4324]">
                  {params.amplitude.toFixed(1)} V
                </span>
              </div>
              <input
                type="range"
                min={RANDOM_LIMITS.amplitude.min}
                max={RANDOM_LIMITS.amplitude.max}
                step={RANDOM_LIMITS.amplitude.step}
                value={params.amplitude}
                onChange={(e) => updateParam('amplitude', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#6B5145]">Noise Std Dev (σ_w)</span>
                <span className="font-mono tabular-nums font-semibold text-[#3B2923]">
                  {params.noiseStd.toFixed(1)} V
                </span>
              </div>
              <input
                type="range"
                min={RANDOM_LIMITS.noiseStd.min}
                max={RANDOM_LIMITS.noiseStd.max}
                step={RANDOM_LIMITS.noiseStd.step}
                value={params.noiseStd}
                onChange={(e) => updateParam('noiseStd', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E4DBD2] bg-white/75 rounded-lg p-3 space-y-1.5 text-xs font-mono text-[#6B5145] tabular-nums">
            <div className="flex justify-between">
              <span>Sample Mean μ_X</span>
              <span className="text-[#3B2923] font-semibold">
                {formatVal(sim.moments.combined.mean, ' V')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sample Variance σ_X²</span>
              <span className="text-[#9A4324] font-semibold">
                {formatVal(sim.moments.combined.variance, ' V²')}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#E4DBD2]">
              <span>Buffer Count N</span>
              <span className="text-[#3B2923] font-semibold">{sim.sampleCount} samples</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Formulas & Explanation */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Statistical Channel Equations
          </h3>
          <div className="space-y-2 overflow-x-auto">
            <div>
              <FormulaMath math="X[n] = S[n] + W[n], \quad \mu_X = \frac{1}{N}\sum X[n], \quad \sigma_X^2 = \frac{1}{N}\sum (X[n] - \mu_X)^2" />
            </div>
            <div>
              <FormulaMath math="P_S(s_k) = \frac{N_k}{N}, \quad f_X(x) = \sum_k P_S(s_k)\,\mathcal{N}(x;\, s_k, \sigma_w^2), \quad F_X(x) = \int_{-\infty}^{x} f_X(u)\,du" />
            </div>
          </div>
        </div>

        <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Explanation
          </h3>
          <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
            <p>
              Discrete signal levels S[n] characterized by their Probability Mass Function (PMF) are corrupted by zero-mean Gaussian noise W[n], producing a continuous Gaussian-mixture Probability Density Function (PDF).
            </p>
            <p>
              Increasing noise σ_w widens each Gaussian lobe and raises total variance σ_X², while the Cumulative Distribution Function (CDF) integrates the PDF monotonically from 0 to 1.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
