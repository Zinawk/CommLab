import React, { useState, useMemo, useCallback } from 'react';
import katex from 'katex';
import {
  generateInputSignal,
  generateImpulseResponse,
  computeOutputSignal,
  analyzeSystemProperties,
} from './signalMath.js';
import SignalPlot from './SignalPlot.jsx';
import ConvolutionInspector from './ConvolutionInspector.jsx';
import PropertiesCard from './PropertiesCard.jsx';
import {
  RotateCcw,
  Sliders,
} from 'lucide-react';

const SYSTEM_OPTIONS = [
  { id: 'gain', label: 'Gain System (y = K·x)' },
  { id: 'delay', label: 'Delay System (y = x[t−D])' },
  { id: 'moving_average', label: 'Moving Average' },
];

const INPUT_OPTIONS = [
  { id: 'impulse', label: 'Impulse δ' },
  { id: 'step', label: 'Step u' },
  { id: 'sine', label: 'Sine' },
  { id: 'cosine', label: 'Cosine' },
  { id: 'rect', label: 'Rect Pulse' },
  { id: 'exp', label: 'Exponential' },
];

/**
 * Section 1.3 — System Analysis & Properties
 */
export default function Simulation() {
  const [signalMode, setSignalMode] = useState('discrete');
  const isContinuous = signalMode === 'continuous';

  const [inputType, setInputType] = useState('rect');
  const [amplitude, setAmplitude] = useState(1.0);
  const [shift, setShift] = useState(0);
  const [frequency, setFrequency] = useState(0.08);
  const [phase, setPhase] = useState(0);
  const [pulseWidth, setPulseWidth] = useState(5);
  const [alpha, setAlpha] = useState(0.25);

  const [systemType, setSystemType] = useState('moving_average');
  const [gain, setGain] = useState(1.5);
  const [delay, setDelay] = useState(3);
  const [windowSize, setWindowSize] = useState(4);

  const [selectedSample, setSelectedSample] = useState(4);
  const xRange = [-5, 35];

  const inputSignal = useMemo(
    () =>
      generateInputSignal(
        inputType,
        { amplitude, shift, frequency, phase, pulseWidth, alpha },
        isContinuous
      ),
    [inputType, amplitude, shift, frequency, phase, pulseWidth, alpha, isContinuous]
  );

  const impulseResponse = useMemo(
    () => generateImpulseResponse(systemType, { gain, delay, windowSize }, isContinuous),
    [systemType, gain, delay, windowSize, isContinuous]
  );

  const systemParams = useMemo(() => ({ gain, delay, windowSize }), [gain, delay, windowSize]);

  const outputSignal = useMemo(
    () => computeOutputSignal(inputSignal, impulseResponse, systemType, systemParams, isContinuous),
    [inputSignal, impulseResponse, systemType, systemParams, isContinuous]
  );

  const analysis = useMemo(
    () => analyzeSystemProperties(systemType, systemParams, isContinuous),
    [systemType, systemParams, isContinuous]
  );

  const handleResetDefaults = useCallback(() => {
    setSignalMode('discrete');
    setInputType('rect');
    setAmplitude(1.0);
    setShift(0);
    setFrequency(0.08);
    setPhase(0);
    setPulseWidth(5);
    setAlpha(0.25);
    setSystemType('moving_average');
    setGain(1.5);
    setDelay(3);
    setWindowSize(4);
    setSelectedSample(4);
  }, []);

  const varSymbol = isContinuous ? 't' : 'n';

  const formulaHtml = useMemo(() => {
    const tex = isContinuous
      ? 'y(t) = (x * h)(t) = \\int_{-\\infty}^{\\infty} x(\\tau)\\,h(t - \\tau)\\,d\\tau'
      : 'y[n] = (x * h)[n] = \\sum_{k=-\\infty}^{\\infty} x[k]\\,h[n - k]';
    return katex.renderToString(tex, { throwOnError: false, displayMode: false });
  }, [isContinuous]);

  const selectedOutputPt = outputSignal.find(
    (d) => Math.abs(d.n - selectedSample) < (isContinuous ? 0.1 : 0.5)
  );

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 py-2">
      {/* Header */}
      <div className="border-b border-[#E4DBD2] pb-4">
        <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
          Module 1 · Section 1.3
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-[#3B2923] tracking-tight mt-0.5">
          System Analysis, Convolution &amp; Properties
        </h2>
        <p className="text-sm text-[#6B5145] mt-1 max-w-2xl">
          {`Compute LTI system output y${isContinuous ? '(t)' : '[n]'} by convolving input x${isContinuous ? '(t)' : '[n]'} with impulse response h${isContinuous ? '(t)' : '[n]'} and inspect algebraic properties.`}
        </p>
      </div>

      {/* Main Two-Zone Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left: 3 Aligned Plots */}
        <div className="flex-1 min-w-0 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          <SignalPlot
            title={`1. Input x${isContinuous ? '(t)' : '[n]'}`}
            data={inputSignal}
            color="#0369A1"
            yLabel={`x${isContinuous ? '(t)' : '[n]'}`}
            mode={signalMode}
            selectedSample={selectedSample}
            onSelectSample={setSelectedSample}
            xRange={xRange}
          />
          <SignalPlot
            title={`2. Impulse h${isContinuous ? '(t)' : '[n]'}`}
            data={impulseResponse}
            color="#C2410C"
            yLabel={`h${isContinuous ? '(t)' : '[n]'}`}
            mode={signalMode}
            selectedSample={selectedSample}
            onSelectSample={setSelectedSample}
            xRange={xRange}
          />
          <SignalPlot
            title={`3. Output y${isContinuous ? '(t)' : '[n]'}`}
            data={outputSignal}
            color="#047857"
            yLabel={`y${isContinuous ? '(t)' : '[n]'}`}
            mode={signalMode}
            selectedSample={selectedSample}
            onSelectSample={setSelectedSample}
            xRange={xRange}
          />
        </div>

        {/* Right: Control Deck */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DBD2]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#9A4324]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                System Controls
              </h3>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EDE4DA] border border-[#E4DBD2] text-[#6B5145] hover:text-[#3B2923] cursor-pointer inline-flex items-center gap-1 text-xs font-semibold transition-colors"
              title="Reset settings"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Domain Toggle */}
          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-[#E4DBD2]">
            <button
              type="button"
              onClick={() => setSignalMode('discrete')}
              className={`py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                !isContinuous ? 'bg-[#9A4324] text-white' : 'text-[#6B5145] hover:text-[#3B2923]'
              }`}
            >
              Discrete [n]
            </button>
            <button
              type="button"
              onClick={() => setSignalMode('continuous')}
              className={`py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                isContinuous ? 'bg-[#9A4324] text-white' : 'text-[#6B5145] hover:text-[#3B2923]'
              }`}
            >
              Continuous (t)
            </button>
          </div>

          {/* System Group */}
          <div className="space-y-3 pt-2 border-t border-[#E4DBD2]">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#3B2923] block">System Architecture</span>
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

            {systemType === 'gain' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-[#6B5145]">Gain (K)</span>
                  <span className="font-mono text-[#9A4324] font-semibold tabular-nums">{gain.toFixed(2)}×</span>
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
            )}

            {systemType === 'delay' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-[#6B5145]">Delay (D)</span>
                  <span className="font-mono text-[#9A4324] font-semibold tabular-nums">{delay > 0 ? `+${delay}` : delay}</span>
                </div>
                <input
                  type="range"
                  min="-4"
                  max="8"
                  step="1"
                  value={delay}
                  onChange={(e) => setDelay(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>
            )}

            {systemType === 'moving_average' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-[#6B5145]">Window Size (M)</span>
                  <span className="font-mono text-[#9A4324] font-semibold tabular-nums">{windowSize}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={windowSize}
                  onChange={(e) => setWindowSize(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Input Signal Group */}
          <div className="space-y-3 pt-3 border-t border-[#E4DBD2]">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#3B2923] block">
                Input Signal x{isContinuous ? '(t)' : '[n]'}
              </span>
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
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{amplitude.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={amplitude}
                onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-[#6B5145]">Shift ({varSymbol}₀)</span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{shift > 0 ? `+${shift}` : shift}</span>
              </div>
              <input
                type="range"
                min="-4"
                max="10"
                step="1"
                value={shift}
                onChange={(e) => setShift(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>

            {(inputType === 'sine' || inputType === 'cosine') && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-[#6B5145]">Frequency (f)</span>
                  <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{frequency.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.25"
                  step="0.01"
                  value={frequency}
                  onChange={(e) => setFrequency(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {inputType === 'rect' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-[#6B5145]">Pulse Width (W)</span>
                  <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{pulseWidth}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="1"
                  value={pulseWidth}
                  onChange={(e) => setPulseWidth(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>
            )}

            {inputType === 'exp' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-[#6B5145]">Decay (α)</span>
                  <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{alpha.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-0.2"
                  max="0.8"
                  step="0.05"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Information & Formulas Summary */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Convolution Relation
          </h3>
          <div
            className="text-sm text-[#3B2923] py-1 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: formulaHtml }}
          />
          <div className="font-mono text-xs text-[#6B5145] pt-1 border-t border-[#E4DBD2] tabular-nums">
            Inspect {varSymbol} = {selectedSample}: y({selectedSample}) = {selectedOutputPt ? selectedOutputPt.val.toFixed(3) : '0.000'} · System: {analysis.systemName}
          </div>
        </div>

        <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Explanation
          </h3>
          <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
            <p>
              Every linear time-invariant (LTI) system is completely characterized by its impulse response h. Clicking any sample on a plot highlights how input weights combine across h to build output y.
            </p>
            <p>
              Inspect system properties and sample-by-sample convolution superposition products below for the active configuration.
            </p>
          </div>
        </div>
      </section>

      {/* System Properties & Step-by-Step Inspector */}
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B5145]">
            System Properties Verification
          </h3>
          <PropertiesCard analysis={analysis} />
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B5145]">
            Convolution Superposition Steps
          </h3>
          <ConvolutionInspector
            isContinuous={isContinuous}
            selectedSample={selectedSample}
            onSelectSample={setSelectedSample}
            xSignal={inputSignal}
            hSignal={impulseResponse}
          />
        </div>
      </div>
    </div>
  );
}
