import React, { useState, useMemo, useEffect, useCallback } from 'react';
import katex from 'katex';
import { Play, Pause, RotateCcw, Sliders } from 'lucide-react';
import {
  DEFAULT_SSB_PARAMS,
  SSB_LIMITS,
  validateSsbParams,
  computeSsbSimulation,
} from './ssbMath.js';
import { SsbWaveformChart, SsbSpectrumChart } from './SsbCharts.jsx';

export default function SsbSimulation({ stage = 'gen' }) {
  const [isRunning, setIsRunning] = useState(true);
  const [params, setParams] = useState(DEFAULT_SSB_PARAMS);
  const [timeOffset, setTimeOffset] = useState(0);

  useEffect(() => {
    if (!isRunning) return undefined;

    const timer = window.setInterval(() => {
      setTimeOffset((prev) => prev + 0.015);
    }, 50);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  const handleTogglePlay = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setParams(DEFAULT_SSB_PARAMS);
    setTimeOffset(0);
  }, []);

  const updateParam = useCallback((key, value) => {
    setParams((prev) => validateSsbParams({ ...prev, [key]: value }));
  }, []);

  const sim = useMemo(
    () => computeSsbSimulation(params, timeOffset),
    [params, timeOffset]
  );

  const syncedYBound = useMemo(() => {
    const peak = Math.max(1.0, params.Am, params.Ac, params.Am * params.Ac, sim.sidebandAmp);
    const raw = peak * 1.15;
    const step = raw <= 2 ? 0.5 : 1;
    return Math.ceil(raw / step) * step;
  }, [params.Am, params.Ac, sim.sidebandAmp]);

  const isGen = stage === 'gen';

  const genFormulaHtml = useMemo(
    () =>
      katex.renderToString(
        `s_{\\text{DSB}}(t) = \\tfrac{1}{2}A_m A_c\\big[\\cos(2\\pi(f_c-f_m)t)+\\cos(2\\pi(f_c+f_m)t)\\big]`,
        { throwOnError: false, displayMode: false }
      ),
    []
  );

  const demodFormulaHtml = useMemo(
    () =>
      katex.renderToString(
        `p(t) = s_{\\text{SSB}}(t)\\,A_c\\cos(2\\pi f_c t) \\;\\xrightarrow{\\text{LPF}}\\; y(t) \\propto A_m\\cos(2\\pi f_m t)`,
        { throwOnError: false, displayMode: false }
      ),
    []
  );

  return (
    <div className="w-full flex-1 flex flex-col gap-6">
      <p className="text-sm text-[#6B5145] max-w-2xl">
        {isGen
          ? 'Single-Sideband (SSB) generation via frequency discrimination passes either the upper (USB) or lower (LSB) sideband while rejecting the carrier and mirror image.'
          : 'Coherent SSB demodulation mixes the received sideband signal with a synchronized local carrier and applies a low-pass filter to recover the baseband message m(t).'}
      </p>

      {/* Main Two-Zone Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left Charts Area */}
        <div className="flex-1 min-w-0 w-full">
          {isGen ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <SsbWaveformChart
                  title="Message m(t)"
                  points={sim.points}
                  valueKey="message"
                  strokeColor="#B45309"
                  primaryLabel={`${params.fm.toFixed(1)} Hz`}
                  yBound={syncedYBound}
                />
                <SsbWaveformChart
                  title="Carrier c(t)"
                  points={sim.points}
                  valueKey="carrier"
                  strokeColor="#7E22CE"
                  primaryLabel={`${params.fc} Hz`}
                  yBound={syncedYBound}
                />
                <SsbWaveformChart
                  title="AM Signal (USB+LSB)"
                  points={sim.points}
                  valueKey="amSignal"
                  strokeColor="#BE123C"
                  primaryLabel="DSB-SC"
                  yBound={syncedYBound}
                />
              </div>

              <SsbSpectrumChart
                title="AM Spectrum & Bandpass Sideband Filter"
                peaks={sim.amSpectrum}
                fc={params.fc}
                fMax={sim.fMax}
                filterWindow={{
                  low: sim.filterLow,
                  high: sim.filterHigh,
                  label: `${params.sideband} Bandpass`,
                }}
                accentColor="#0369A1"
                wide
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <SsbWaveformChart
                title={`Received SSB (${params.sideband})`}
                points={sim.points}
                valueKey="ssbSignal"
                strokeColor="#0369A1"
                primaryLabel={params.sideband}
              />
              <SsbWaveformChart
                title="Local Carrier"
                points={sim.points}
                valueKey="localCarrier"
                strokeColor="#7E22CE"
                primaryLabel={`${params.fc} Hz`}
              />
              <SsbWaveformChart
                title="Product (SSB × Carrier)"
                points={sim.points}
                valueKey="productSignal"
                strokeColor="#C2410C"
                primaryLabel="Mixer"
              />
              <SsbWaveformChart
                title="Recovered Output (LPF)"
                points={sim.points}
                valueKey="recoveredMessage"
                strokeColor="#047857"
                primaryLabel="Recovered"
                compareKey="message"
                compareColor="#B45309"
                compareLabel="Original"
              />
            </div>
          )}
        </div>

        {/* Right Parameters Panel */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DBD2]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#9A4324]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                SSB Controls
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

          <div className="space-y-1.5">
            <label htmlFor="ssb-sideband-select" className="text-xs font-semibold text-[#3B2923] block">
              Filter Sideband
            </label>
            <select
              id="ssb-sideband-select"
              value={params.sideband}
              onChange={(e) => updateParam('sideband', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4C8BC] text-sm text-[#3B2923] focus:outline-none focus:border-[#9A4324] cursor-pointer"
            >
              <option value="USB">USB ({sim.fUsb.toFixed(1)} Hz)</option>
              <option value="LSB">LSB ({sim.fLsb.toFixed(1)} Hz)</option>
            </select>
          </div>

          <div className="space-y-3 pt-3 border-t border-[#E4DBD2]">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#6B5145]">Message Freq (f_m)</span>
                <span className="font-mono tabular-nums font-semibold text-[#9A4324]">
                  {params.fm.toFixed(1)} Hz
                </span>
              </div>
              <input
                type="range"
                min={SSB_LIMITS.fm.min}
                max={SSB_LIMITS.fm.max}
                step={SSB_LIMITS.fm.step}
                value={params.fm}
                onChange={(e) => updateParam('fm', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#6B5145]">Message Amp (A_m)</span>
                <span className="font-mono tabular-nums font-semibold text-[#3B2923]">
                  {params.Am.toFixed(1)} V
                </span>
              </div>
              <input
                type="range"
                min={SSB_LIMITS.Am.min}
                max={SSB_LIMITS.Am.max}
                step={SSB_LIMITS.Am.step}
                value={params.Am}
                onChange={(e) => updateParam('Am', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#6B5145]">Carrier Freq (f_c)</span>
                <span className="font-mono tabular-nums font-semibold text-[#3B2923]">
                  {params.fc} Hz
                </span>
              </div>
              <input
                type="range"
                min={SSB_LIMITS.fc.min}
                max={SSB_LIMITS.fc.max}
                step={SSB_LIMITS.fc.step}
                value={params.fc}
                onChange={(e) => updateParam('fc', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E4DBD2] bg-white/75 rounded-lg p-3 space-y-1 text-xs font-mono text-[#6B5145] tabular-nums">
            <div className="flex justify-between">
              <span>LSB Tone</span>
              <span className="text-[#3B2923] font-semibold">{sim.fLsb.toFixed(1)} Hz</span>
            </div>
            <div className="flex justify-between">
              <span>USB Tone</span>
              <span className="text-[#3B2923] font-semibold">{sim.fUsb.toFixed(1)} Hz</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#E4DBD2]">
              <span>SSB Bandwidth</span>
              <span className="text-[#9A4324] font-semibold">{params.fm.toFixed(1)} Hz</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Formulas & Explanation */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            {isGen ? 'Sideband Spectrum Formulation' : 'Coherent Recovery Formulation'}
          </h3>
          <div
            className="text-sm text-[#3B2923] py-1 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: isGen ? genFormulaHtml : demodFormulaHtml }}
          />
          <div className="font-mono text-xs text-[#6B5145] pt-2 border-t border-[#E4DBD2] tabular-nums">
            {isGen
              ? `Active Band: ${params.sideband} (${(params.sideband === 'USB' ? sim.fUsb : sim.fLsb).toFixed(1)} Hz) · BW = ${params.fm.toFixed(1)} Hz`
              : `2f_c ± f_m image rejected by LPF · Recovered tone = ${params.fm.toFixed(1)} Hz`}
          </div>
        </div>

        <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Explanation
          </h3>
          {isGen ? (
            <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
              <p>
                Because USB and LSB carry identical message information, suppressing both the carrier and one sideband via a sharp bandpass filter cuts required transmission bandwidth in half (BW = f_m).
              </p>
              <p>
                Switch Filter Sideband between USB (f_c + f_m) and LSB (f_c − f_m) to observe which spectral tone passes through the shaded bandpass window.
              </p>
            </div>
          ) : (
            <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
              <p>
                Multiplying the received SSB signal by a local carrier cos(2π f_c t) shifts the selected sideband back down to baseband f_m and up to a high-frequency component near 2f_c.
              </p>
              <p>
                A low-pass filter removes the 2f_c image, recovering a clean phase-aligned replica of the original baseband message m(t).
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
