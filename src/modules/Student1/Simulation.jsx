import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import katex from 'katex';
import {
  Sliders,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import {
  TASK1_WAVEFORMS,
  TASK1_FUNCTION_EXAMPLES,
  DEFAULT_FOURIER_PARAMS,
  FOURIER_LIMITS,
  validateFourierParams,
  computeFourierSpectrum,
  computeTimeDomainWaveforms,
} from './fourierMath.js';
import { TimeDomainChart, FrequencySpectrumChart } from './FourierCharts.jsx';
import { compileCustomFunction } from '../../utils/waveformParser.js';

/**
 * Section 1.1 — Fourier Analysis & Synthesis
 */
export default function Simulation() {
  const [params, setParams] = useState(DEFAULT_FOURIER_PARAMS);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHarmonics, setShowHarmonics] = useState(false);
  const [spectrumMode, setSpectrumMode] = useState('linear'); // 'linear' | 'relative' | 'db' | 'power'

  const customCompileResult = useMemo(
    () => compileCustomFunction(params.customExpr),
    [params.customExpr]
  );
  const lastValidCompiledRef = useRef(
    compileCustomFunction(DEFAULT_FOURIER_PARAMS.customExpr)
  );
  if (customCompileResult.ok) {
    lastValidCompiledRef.current = customCompileResult;
  }
  const activeCompiledCustom = customCompileResult.ok
    ? customCompileResult
    : lastValidCompiledRef.current;

  useEffect(() => {
    if (!isAnimating) return undefined;
    const timer = window.setInterval(() => {
      setParams((prev) => {
        const nextN =
          prev.harmonicsCount >= FOURIER_LIMITS.harmonicsCount.max
            ? 1
            : prev.harmonicsCount + 1;
        return { ...prev, harmonicsCount: nextN };
      });
    }, 450);
    return () => window.clearInterval(timer);
  }, [isAnimating]);

  const updateParam = useCallback((key, value) => {
    if (key === 'harmonicsCount') setIsAnimating(false);
    setParams((prev) => validateFourierParams({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setIsAnimating(false);
    setSpectrumMode('linear');
    setShowHarmonics(false);
    setParams(DEFAULT_FOURIER_PARAMS);
  }, []);

  const spectrumData = useMemo(
    () => computeFourierSpectrum(params, activeCompiledCustom),
    [params, activeCompiledCustom]
  );
  const waveformData = useMemo(
    () => computeTimeDomainWaveforms(params, 7, activeCompiledCustom),
    [params, activeCompiledCustom]
  );

  const seriesFormulaHtml = useMemo(() => {
    let tex = '';
    if (params.waveform === 'square') {
      tex = 'x_N(t) = \\sum_{m=1}^{N} \\frac{4A}{\\pi(2m-1)}\\sin\\big(2\\pi(2m-1)f_0 t\\big)';
    } else if (params.waveform === 'triangle') {
      tex = 'x_N(t) = \\sum_{m=1}^{N} \\frac{8A}{\\pi^2(2m-1)^2}(-1)^{m-1}\\sin\\big(2\\pi(2m-1)f_0 t\\big)';
    } else {
      tex = `x_N(t) = a_0 + \\sum_{n=1}^{${spectrumData.maxActiveOrder}}\\big(a_n\\cos(2\\pi n f_0 t) + b_n\\sin(2\\pi n f_0 t)\\big)`;
    }
    return katex.renderToString(tex, { throwOnError: false, displayMode: false });
  }, [params, spectrumData.maxActiveOrder]);

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 py-2">
      {/* Module Header */}
      <div className="border-b border-[#E4DBD2] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
            Module 1 · Section 1.1
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3B2923] tracking-tight mt-0.5">
            Fourier Series Synthesis &amp; Discrete Spectrum
          </h2>
          <p className="text-sm text-[#6B5145] mt-1 max-w-2xl">
            Explore how weighted sine and cosine harmonics sum to synthesize periodic waveforms x_N(t) and shape the discrete magnitude spectrum.
          </p>
        </div>
      </div>

      {/* Main Two-Zone Workspace: Left Charts + Right Grouped Controls */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left: Large Side-by-Side Graphs */}
        <div className="flex-1 min-w-0 w-full grid grid-cols-1 xl:grid-cols-2 gap-5">
          <TimeDomainChart
            waveformData={waveformData}
            amplitude={params.amplitude}
            harmonicsCount={params.harmonicsCount}
            waveform={params.waveform}
            modulationMode={params.modulationMode}
            showHarmonics={showHarmonics}
          />
          <FrequencySpectrumChart
            spectrumData={spectrumData}
            mode={spectrumMode}
          />
        </div>

        {/* Right: Grouped Control Deck */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DBD2]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#9A4324]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                Signal Controls
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAnimating((p) => !p)}
                className="px-2.5 py-1 rounded-lg bg-[#9A4324] hover:bg-[#7D341A] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sweep harmonics N"
              >
                {isAnimating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isAnimating ? 'Pause' : 'Sweep N'}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-white hover:bg-[#EDE4DA] border border-[#E4DBD2] text-[#6B5145] hover:text-[#3B2923] transition-colors cursor-pointer"
                title="Reset parameters"
                aria-label="Reset parameters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Group 1: Waveform Source */}
          <div className="space-y-2.5">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#3B2923] block">Waveform Type</span>
              <select
                value={params.waveform}
                onChange={(e) => updateParam('waveform', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4C8BC] text-sm text-[#3B2923] focus:outline-none focus:border-[#9A4324] cursor-pointer"
              >
                {TASK1_WAVEFORMS.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    {wf.label}
                  </option>
                ))}
              </select>
            </label>

            {params.waveform === 'custom' && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#3B2923]">Expression x(t) =</span>
                  <span className={customCompileResult.ok ? 'font-mono text-[#047857] font-semibold' : 'font-mono text-[#BE123C] font-semibold'}>
                    {customCompileResult.ok ? 'Valid' : 'Syntax Error'}
                  </span>
                </div>
                <input
                  type="text"
                  value={params.customExpr}
                  onChange={(e) => updateParam('customExpr', e.target.value)}
                  spellCheck={false}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#D4C8BC] text-xs font-mono text-[#3B2923] focus:outline-none focus:border-[#9A4324]"
                />
                <select
                  value=""
                  onChange={(e) => e.target.value && updateParam('customExpr', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#D4C8BC] text-xs text-[#6B5145] focus:outline-none focus:border-[#9A4324] cursor-pointer"
                >
                  <option value="">Load example expression...</option>
                  {TASK1_FUNCTION_EXAMPLES.map((ex) => (
                    <option key={ex.label} value={ex.expr}>
                      {ex.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Group 2: Harmonic & Signal Sliders */}
          <div className="space-y-3 pt-3 border-t border-[#E4DBD2]">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-[#6B5145]">Harmonics (N)</span>
                <span className="font-mono text-[#9A4324] font-semibold tabular-nums">{params.harmonicsCount}</span>
              </div>
              <input
                type="range"
                min={FOURIER_LIMITS.harmonicsCount.min}
                max={FOURIER_LIMITS.harmonicsCount.max}
                step={FOURIER_LIMITS.harmonicsCount.step}
                value={params.harmonicsCount}
                onChange={(e) => updateParam('harmonicsCount', parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-[#6B5145]">Amplitude (A)</span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{params.amplitude.toFixed(1)} V</span>
              </div>
              <input
                type="range"
                min={FOURIER_LIMITS.amplitude.min}
                max={FOURIER_LIMITS.amplitude.max}
                step={FOURIER_LIMITS.amplitude.step}
                value={params.amplitude}
                onChange={(e) => updateParam('amplitude', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-[#6B5145]">Fundamental Freq (f₀)</span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{params.fundamentalFreq.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min={FOURIER_LIMITS.fundamentalFreq.min}
                max={FOURIER_LIMITS.fundamentalFreq.max}
                step={FOURIER_LIMITS.fundamentalFreq.step}
                value={params.fundamentalFreq}
                onChange={(e) => updateParam('fundamentalFreq', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Group 3: Display Options */}
          <div className="space-y-2.5 pt-3 border-t border-[#E4DBD2]">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#3B2923] block">Spectrum Scale</span>
              <select
                value={spectrumMode}
                onChange={(e) => setSpectrumMode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4C8BC] text-sm text-[#3B2923] focus:outline-none focus:border-[#9A4324] cursor-pointer"
              >
                <option value="linear">Linear Magnitude (V)</option>
                <option value="relative">Normalized Ratio (c_n / c₁)</option>
                <option value="db">Logarithmic (dB)</option>
                <option value="power">Power Spectrum (W)</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-[#3B2923] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={showHarmonics}
                onChange={(e) => setShowHarmonics(e.target.checked)}
                className="accent-[#9A4324] w-4 h-4 rounded cursor-pointer"
              />
              <span>Overlay Individual Harmonics</span>
            </label>
          </div>
        </aside>
      </div>

      {/* Bottom Information & Mathematical Formulas */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Mathematical Representation
          </h3>
          <div
            className="text-sm text-[#3B2923] py-1 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: seriesFormulaHtml }}
          />
          <div className="font-mono text-xs text-[#6B5145] pt-1 border-t border-[#E4DBD2] tabular-nums">
            {`DC a₀ = ${spectrumData.a0.toFixed(2)} V · Captured Power = ${spectrumData.powerRatioPercent.toFixed(1)}% · Peak = ${waveformData.peakApprox.toFixed(2)} V`}
          </div>
        </div>

        <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Theory &amp; Physical Meaning
          </h3>
          <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
            <p>
              Any periodic signal x(t) decomposes into harmonically related sinusoids at integer multiples n·f₀. Increasing N sharpens edges and drives partial sum x_N(t) closer to the target.
            </p>
            <p>
              For discontinuous waves like square pulses, finite N produces a persistent ~17.9% overshoot (Gibbs phenomenon) near jumps while captured Parseval energy approaches 100%.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
