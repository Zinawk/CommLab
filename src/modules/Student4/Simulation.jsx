import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Activity,
  Scale,
  Clock,
  Sliders,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import katex from 'katex';
import {
  T_MIN,
  T_MAX,
  DT,
  generateContinuousInput,
  generateContinuousImpulseResponse,
  computeParametricConvolution,
  computeContinuousConvolution,
  computeIntegrandSnapshot,
  computeStepByStepExplanation,
  getOutputSignalInterpretation,
} from './convolutionMath.js';
import { TimeSignalPlot, IntegrandOverlapPlot } from './ConvolutionChart.jsx';
import SystemPropertiesTesting from './SystemPropertiesTesting.jsx';

function Formula({ math, className = '' }) {
  const html = useMemo(() => {
    if (!math) return '';
    try {
      return katex.renderToString(math, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return math;
    }
  }, [math]);

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

const INPUT_OPTIONS = [
  { id: 'rect', label: 'Rectangular Pulse' },
  { id: 'step', label: 'Unit Step' },
  { id: 'sine', label: 'Sine Wave' },
  { id: 'impulse', label: 'Impulse' },
];

const SYSTEM_OPTIONS = [
  { id: 'moving_average', label: 'Moving Average' },
  { id: 'exponential', label: 'Exponential Decay' },
  { id: 'gain', label: 'Gain' },
  { id: 'delay', label: 'Time Delay' },
];

/**
 * Section 1.4 — Continuous-Time Convolution Simulator
 */
export default function Simulation({
  inputSignal: externalInputSignal = null,
  impulseResponse: externalImpulseResponse = null,
  dt: externalDt = null,
}) {
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'linearity' | 'time_invariance'

  const [inputType, setInputType] = useState('rect');
  const [amplitude, setAmplitude] = useState(1.5);
  const [shift, setShift] = useState(0.0);
  const [pulseWidth, setPulseWidth] = useState(3.0);
  const [frequency, setFrequency] = useState(0.25);

  const [systemType, setSystemType] = useState('moving_average');
  const [gain, setGain] = useState(1.0);
  const [windowSize, setWindowSize] = useState(4.0);
  const [decayRate, setDecayRate] = useState(0.6);
  const [delay, setDelay] = useState(3.0);

  const [evalTime, setEvalTime] = useState(2.5);
  const [isPlaying, setIsPlaying] = useState(false);

  const hasExternalSignals =
    Array.isArray(externalInputSignal) &&
    externalInputSignal.length > 1 &&
    Array.isArray(externalImpulseResponse) &&
    externalImpulseResponse.length > 1;

  useEffect(() => {
    if (!isPlaying) return undefined;
    const intervalId = window.setInterval(() => {
      setEvalTime((prev) => {
        const next = Math.round((prev + 0.1) * 10) / 10;
        return next > T_MAX ? T_MIN : next;
      });
    }, 55);
    return () => window.clearInterval(intervalId);
  }, [isPlaying]);

  const handleTogglePlay = () => {
    if (!isPlaying && evalTime >= T_MAX) {
      setEvalTime(T_MIN);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setInputType('rect');
    setAmplitude(1.5);
    setShift(0.0);
    setPulseWidth(3.0);
    setFrequency(0.25);
    setSystemType('moving_average');
    setGain(1.0);
    setWindowSize(4.0);
    setDecayRate(0.6);
    setDelay(3.0);
    setEvalTime(2.5);
  }, []);

  const inputParams = useMemo(
    () => ({ amplitude, shift, pulseWidth, frequency }),
    [amplitude, shift, pulseWidth, frequency]
  );

  const systemParams = useMemo(
    () => ({ gain, windowSize, decayRate, delay }),
    [gain, windowSize, decayRate, delay]
  );

  const xResult = useMemo(() => {
    if (hasExternalSignals) {
      const normalized = externalInputSignal.map((pt) => ({
        t: typeof pt.t === 'number' ? pt.t : pt.n,
        n: typeof pt.n === 'number' ? pt.n : pt.t,
        val: pt.val,
      }));
      return { points: normalized, isImpulse: false, impulses: [] };
    }
    return generateContinuousInput(inputType, inputParams, T_MIN, T_MAX, DT);
  }, [hasExternalSignals, externalInputSignal, inputType, inputParams]);

  const hResult = useMemo(() => {
    if (hasExternalSignals) {
      const normalized = externalImpulseResponse.map((pt) => ({
        t: typeof pt.t === 'number' ? pt.t : pt.n,
        n: typeof pt.n === 'number' ? pt.n : pt.t,
        val: pt.val,
      }));
      return { points: normalized, isImpulse: false, impulses: [] };
    }
    return generateContinuousImpulseResponse(systemType, systemParams, T_MIN, T_MAX, DT);
  }, [hasExternalSignals, externalImpulseResponse, systemType, systemParams]);

  const yResult = useMemo(() => {
    if (hasExternalSignals) {
      const convPts = computeContinuousConvolution(
        externalInputSignal,
        externalImpulseResponse,
        externalDt
      );
      return { points: convPts, isImpulse: false, impulses: [] };
    }
    return computeParametricConvolution(
      inputType,
      inputParams,
      systemType,
      systemParams,
      T_MIN,
      T_MAX,
      DT
    );
  }, [
    hasExternalSignals,
    externalInputSignal,
    externalImpulseResponse,
    externalDt,
    inputType,
    inputParams,
    systemType,
    systemParams,
  ]);

  const integrandSnapshot = useMemo(() => {
    return computeIntegrandSnapshot(
      inputType,
      inputParams,
      systemType,
      systemParams,
      evalTime,
      T_MIN,
      T_MAX,
      DT
    );
  }, [inputType, inputParams, systemType, systemParams, evalTime]);

  const stepByStep = useMemo(() => {
    return computeStepByStepExplanation(
      inputType,
      inputParams,
      systemType,
      systemParams,
      evalTime
    );
  }, [inputType, inputParams, systemType, systemParams, evalTime]);

  const interpretation = useMemo(() => {
    return getOutputSignalInterpretation(
      inputType,
      inputParams,
      systemType,
      systemParams
    );
  }, [inputType, inputParams, systemType, systemParams]);

  if (hasExternalSignals) {
    return (
      <div className="w-full flex-1 flex flex-col gap-5 py-2">
        <div className="border-b border-[#E4DBD2] pb-3">
          <h2 className="text-xl font-bold text-[#3B2923]">Continuous-Time Convolution</h2>
          <p className="text-sm text-[#6B5145] mt-1">
            Continuous-time convolution y(t) = ∫ x(τ)h(t − τ) dτ computed from externally supplied input and impulse response signals.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <TimeSignalPlot title="Input Signal x(t)" points={xResult.points} color="#0369A1" xLabel="Time t (s)" yLabel="Amplitude (V)" />
          <TimeSignalPlot title="Impulse Response h(t)" points={hResult.points} color="#C2410C" xLabel="Time t (s)" yLabel="Amplitude" />
          <TimeSignalPlot title="Convolution Output y(t)" points={yResult.points} color="#047857" xLabel="Time t (s)" yLabel="Output" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 py-2">
      {/* Header + Segmented View Tabs */}
      <div className="border-b border-[#E4DBD2] pb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
            Module 1 · Section 1.4
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3B2923] tracking-tight mt-0.5">
            Continuous-Time Convolution Simulator
          </h2>
          <p className="text-sm text-[#6B5145] mt-1 max-w-2xl">
            {activeTab === 'simulator'
              ? `Fold, shift, multiply, and integrate x(τ) with kernel h(t − τ) at observation instant t = ${evalTime.toFixed(1)} s (${interpretation.systemRole}).`
              : activeTab === 'linearity'
              ? 'Verify additivity and homogeneity T{a·x₁(t) + b·x₂(t)} = a·y₁(t) + b·y₂(t) on the active LTI system.'
              : 'Verify time-invariance by comparing shifted-input response T{x(t − Δt)} with shifted output y(t − Δt).'}
          </p>
        </div>

        <div className="inline-flex bg-[#F5F0EA] p-1 rounded-lg border border-[#E4DBD2] shrink-0 self-start lg:self-auto">
          {[
            { id: 'simulator', label: 'Convolution Simulator', Icon: Activity },
            { id: 'linearity', label: 'Linearity Test', Icon: Scale },
            { id: 'time_invariance', label: 'Time Invariance', Icon: Clock },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === id
                  ? 'bg-white text-[#9A4324] border border-[#E4DBD2] shadow-xs'
                  : 'text-[#6B5145] hover:text-[#3B2923] border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Convolution Simulator */}
      {activeTab === 'simulator' && (
        <div className="w-full flex-1 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* Left: Clean 2x2 Signal Grid */}
            <div className="flex-1 min-w-0 w-full grid grid-cols-1 xl:grid-cols-2 gap-5">
              <TimeSignalPlot
                title="Input Signal x(t)"
                points={xResult.points}
                impulses={xResult.impulses}
                color="#0369A1"
                xLabel="Time t (s)"
                yLabel="Amplitude (V)"
                unit="V"
                compact
              />
              <TimeSignalPlot
                title="Impulse Response h(t)"
                points={hResult.points}
                impulses={hResult.impulses}
                color="#C2410C"
                xLabel="Time t (s)"
                yLabel="Amplitude"
                compact
              />
              <IntegrandOverlapPlot
                tauData={integrandSnapshot.tauData}
                xImpulses={integrandSnapshot.xImpulses}
                hFlippedImpulses={integrandSnapshot.hFlippedImpulses}
                evalTime={evalTime}
                onSelectTime={(tVal) => {
                  setIsPlaying(false);
                  setEvalTime(tVal);
                }}
                compact
              />
              <TimeSignalPlot
                title="Convolution Output y(t)"
                points={yResult.points}
                impulses={yResult.impulses}
                color="#047857"
                xLabel="Time t (s)"
                yLabel="Output"
                highlightTime={evalTime}
                highlightValue={integrandSnapshot.instantY}
                currentIndicator={`y(${evalTime.toFixed(1)})=${stepByStep.finalValue.toFixed(2)}`}
                compact
              />
            </div>

            {/* Right: Grouped Control Deck */}
            <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4DBD2]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#9A4324]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                    Convolution Controls
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="px-2.5 py-1 rounded-lg bg-[#9A4324] hover:bg-[#7D341A] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isPlaying ? 'Pause' : 'Sweep t'}</span>
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

              {/* Group 1: Observation Time */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#3B2923]">Observation Instant (t)</span>
                  <span className="font-mono text-[#9A4324] font-bold tabular-nums">{evalTime.toFixed(1)} s</span>
                </div>
                <input
                  type="range"
                  min={T_MIN}
                  max={T_MAX}
                  step="0.1"
                  value={evalTime}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setEvalTime(parseFloat(e.target.value));
                  }}
                  className="w-full"
                />
              </div>

              {/* Group 2: Input Signal */}
              <div className="space-y-2.5 pt-3 border-t border-[#E4DBD2]">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#3B2923] block">Input Signal x(t)</span>
                  <select
                    value={inputType}
                    onChange={(e) => setInputType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4C8BC] text-sm text-[#3B2923] focus:outline-none focus:border-[#9A4324] cursor-pointer"
                  >
                    {INPUT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-[#6B5145]">Amplitude (A)</span>
                    <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{amplitude.toFixed(1)} V</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={amplitude}
                    onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-[#6B5145]">Input Shift (t₀)</span>
                    <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{shift.toFixed(1)} s</span>
                  </div>
                  <input
                    type="range"
                    min="-2.0"
                    max="5.0"
                    step="0.5"
                    value={shift}
                    onChange={(e) => setShift(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {inputType === 'rect' && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[#6B5145]">Pulse Width (W)</span>
                      <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{pulseWidth.toFixed(1)} s</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="6.0"
                      step="0.5"
                      value={pulseWidth}
                      onChange={(e) => setPulseWidth(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}

                {inputType === 'sine' && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[#6B5145]">Frequency (f)</span>
                      <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{frequency.toFixed(2)} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.60"
                      step="0.05"
                      value={frequency}
                      onChange={(e) => setFrequency(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Group 3: System Impulse Response */}
              <div className="space-y-2.5 pt-3 border-t border-[#E4DBD2]">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#3B2923] block">System Kernel h(t)</span>
                  <select
                    value={systemType}
                    onChange={(e) => setSystemType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4C8BC] text-sm text-[#3B2923] focus:outline-none focus:border-[#9A4324] cursor-pointer"
                  >
                    {SYSTEM_OPTIONS.map((sys) => (
                      <option key={sys.id} value={sys.id}>
                        {sys.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-[#6B5145]">System Gain (K)</span>
                    <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{gain.toFixed(2)}×</span>
                  </div>
                  <input
                    type="range"
                    min="-2.0"
                    max="2.5"
                    step="0.25"
                    value={gain}
                    onChange={(e) => setGain(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {systemType === 'moving_average' && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[#6B5145]">Window (W_h)</span>
                      <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{windowSize.toFixed(1)} s</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="8.0"
                      step="0.5"
                      value={windowSize}
                      onChange={(e) => setWindowSize(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}

                {systemType === 'exponential' && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[#6B5145]">Decay Rate (α)</span>
                      <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{decayRate.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="2.00"
                      step="0.05"
                      value={decayRate}
                      onChange={(e) => setDecayRate(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}

                {systemType === 'delay' && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[#6B5145]">Time Delay (D)</span>
                      <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{delay.toFixed(1)} s</span>
                    </div>
                    <input
                      type="range"
                      min="-2.0"
                      max="6.0"
                      step="0.5"
                      value={delay}
                      onChange={(e) => setDelay(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* Bottom Formulas & Explanation */}
          <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                Formulas &amp; Step Evaluation
              </h3>
              <div className="text-sm text-[#3B2923] space-y-2 overflow-x-auto">
                <div className="py-0.5">
                  <Formula math={stepByStep.steps.integrate.calculationLatex} />
                </div>
                <div className="py-0.5">
                  <Formula math={interpretation.closedFormFormulaLatex} />
                </div>
              </div>
              <div className="font-mono text-xs text-[#6B5145] pt-1 border-t border-[#E4DBD2] tabular-nums">
                Regime: {stepByStep.statusText} · Bounds: {stepByStep.overlapSpanText} · Calc: {stepByStep.finalValue.toFixed(3)} · Theory: {stepByStep.theoreticalValue.toFixed(3)} (Δ = {stepByStep.diffFromTheory.toFixed(4)})
              </div>
            </div>

            <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                Step-by-Step Interpretation
              </h3>
              <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
                <p>
                  1. Fold h(τ) → h(−τ), 2. Shift by t → h(t − τ), 3. Multiply g(τ) = x(τ)h(t − τ), and 4. Integrate overlap area. <strong className="text-[#3B2923]">Shift &amp; Overlap:</strong> {stepByStep.steps.shift.desc} {stepByStep.steps.multiply.desc}
                </p>
                <p>
                  <strong className="text-[#3B2923]">{stepByStep.statusText}:</strong> {interpretation.waveformExplanation}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 2 & Tab 3 */}
      {(activeTab === 'linearity' || activeTab === 'time_invariance') && (
        <SystemPropertiesTesting
          mode={activeTab}
          inputType={inputType}
          inputParams={inputParams}
          systemType={systemType}
          systemParams={systemParams}
          xResult={xResult}
          yResult={yResult}
        />
      )}
    </div>
  );
}
