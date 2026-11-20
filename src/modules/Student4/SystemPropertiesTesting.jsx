import React, { useState, useMemo } from 'react';
import { Sliders, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  T_MIN,
  T_MAX,
  DT,
  generateContinuousInput,
  computeParametricConvolution,
  combineSignalResults,
  computeCombinedParametricConvolution,
  computeShiftedOutputReference,
  computeResultDifference,
} from './convolutionMath.js';
import { TimeSignalPlot } from './ConvolutionChart.jsx';

const SIGNAL_OPTIONS = [
  { id: 'rect', label: 'Rectangular Pulse' },
  { id: 'step', label: 'Unit Step' },
  { id: 'sine', label: 'Sine Wave' },
  { id: 'impulse', label: 'Impulse' },
];

const SYSTEM_LABELS = {
  moving_average: 'Moving Average',
  exponential: 'Exponential Decay',
  gain: 'Gain',
  delay: 'Time Delay',
};

const TOLERANCE = 1e-2;

export default function SystemPropertiesTesting({
  mode = 'linearity', // 'linearity' | 'time_invariance'
  inputType,
  inputParams,
  systemType,
  systemParams,
  xResult,
  yResult,
}) {
  const [sig1Type, setSig1Type] = useState('rect');
  const [sig1Scale, setSig1Scale] = useState(1.0);
  const [sig2Type, setSig2Type] = useState('sine');
  const [sig2Scale, setSig2Scale] = useState(1.0);
  const [timeShift, setTimeShift] = useState(2.5);

  const systemLabel = SYSTEM_LABELS[systemType] || 'Active System';

  const linearity = useMemo(() => {
    const p1 = { amplitude: sig1Scale, shift: 0.0, pulseWidth: 2.5, frequency: 0.25 };
    const p2 = { amplitude: sig2Scale, shift: 1.5, pulseWidth: 2.5, frequency: 0.25 };

    const y1 = computeParametricConvolution(sig1Type, p1, systemType, systemParams, T_MIN, T_MAX, DT);
    const y2 = computeParametricConvolution(sig2Type, p2, systemType, systemParams, T_MIN, T_MAX, DT);
    const ySum = combineSignalResults(y1, y2);

    const yCombined = computeCombinedParametricConvolution(
      sig1Type,
      p1,
      sig2Type,
      p2,
      systemType,
      systemParams,
      T_MIN,
      T_MAX,
      DT
    );

    const maxDiff = computeResultDifference(yCombined, ySum);
    const satisfied = maxDiff < TOLERANCE;

    return { y1, y2, ySum, yCombined, maxDiff, satisfied };
  }, [sig1Type, sig1Scale, sig2Type, sig2Scale, systemType, systemParams]);

  const timeInvariance = useMemo(() => {
    const shiftedParams = {
      ...inputParams,
      shift: (inputParams.shift ?? 0) + timeShift,
    };

    const xShifted = generateContinuousInput(inputType, shiftedParams, T_MIN, T_MAX, DT);
    const yOfShiftedInput = computeParametricConvolution(
      inputType,
      shiftedParams,
      systemType,
      systemParams,
      T_MIN,
      T_MAX,
      DT
    );
    const yShiftedRef = computeShiftedOutputReference(
      inputType,
      inputParams,
      systemType,
      systemParams,
      timeShift,
      T_MIN,
      T_MAX,
      DT
    );

    const maxDiff = computeResultDifference(yOfShiftedInput, yShiftedRef);
    const satisfied = maxDiff < TOLERANCE;

    return { xShifted, yOfShiftedInput, yShiftedRef, maxDiff, satisfied };
  }, [inputType, inputParams, systemType, systemParams, timeShift]);

  const isLinearity = mode === 'linearity';
  const activeResult = isLinearity ? linearity : timeInvariance;

  return (
    <div className="w-full flex-1 flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left Graphs */}
        <div className="flex-1 min-w-0 w-full grid grid-cols-1 xl:grid-cols-2 gap-5">
          {isLinearity ? (
            <>
              <TimeSignalPlot
                title="Separate Outputs"
                primaryLabel="y₁"
                points={linearity.y1.points}
                impulses={linearity.y1.impulses}
                color="#0369A1"
                extraSeries={[
                  {
                    label: 'y₂',
                    points: linearity.y2.points,
                    impulses: linearity.y2.impulses,
                    color: '#C2410C',
                  },
                ]}
                xLabel="Time t (s)"
                yLabel="Amplitude"
              />
              <TimeSignalPlot
                title="Superposition Output Comparison"
                primaryLabel="T{a·x₁+b·x₂}"
                points={linearity.yCombined.points}
                impulses={linearity.yCombined.impulses}
                color="#047857"
                extraSeries={[
                  {
                    label: 'y₁+y₂',
                    points: linearity.ySum.points,
                    impulses: linearity.ySum.impulses,
                    color: '#7E22CE',
                    dashed: true,
                  },
                ]}
                xLabel="Time t (s)"
                yLabel="Amplitude"
              />
            </>
          ) : (
            <>
              <TimeSignalPlot
                title="Original vs. Shifted Input"
                primaryLabel="x(t)"
                points={xResult.points}
                impulses={xResult.impulses}
                color="#0369A1"
                extraSeries={[
                  {
                    label: `x(t${timeShift >= 0 ? `−${timeShift.toFixed(1)}` : `+${Math.abs(timeShift).toFixed(1)}`})`,
                    points: timeInvariance.xShifted.points,
                    impulses: timeInvariance.xShifted.impulses,
                    color: '#C2410C',
                    dashed: true,
                  },
                ]}
                xLabel="Time t (s)"
                yLabel="Amplitude (V)"
                unit="V"
              />
              <TimeSignalPlot
                title="Shifted Input Output vs. y(t − Δt)"
                primaryLabel="T{x(t−Δt)}"
                points={timeInvariance.yOfShiftedInput.points}
                impulses={timeInvariance.yOfShiftedInput.impulses}
                color="#047857"
                extraSeries={[
                  {
                    label: 'y(t−Δt)',
                    points: timeInvariance.yShiftedRef.points,
                    impulses: timeInvariance.yShiftedRef.impulses,
                    color: '#7E22CE',
                    dashed: true,
                  },
                  {
                    label: 'y(t)',
                    points: yResult.points,
                    impulses: yResult.impulses,
                    color: '#6B5145',
                  },
                ]}
                xLabel="Time t (s)"
                yLabel="Amplitude"
              />
            </>
          )}
        </div>

        {/* Right Parameters Panel */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E4DBD2]">
            <Sliders className="w-4 h-4 text-[#9A4324]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
              Verification Controls
            </h3>
          </div>

          {isLinearity ? (
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#3B2923] block">Input 1: x₁(t)</span>
                <select
                  value={sig1Type}
                  onChange={(e) => setSig1Type(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4C8BC] text-sm text-[#3B2923] focus:outline-none focus:border-[#9A4324] cursor-pointer"
                >
                  {SIGNAL_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-[#6B5145]">Scale Factor (a)</span>
                  <span className="font-mono text-[#9A4324] font-semibold tabular-nums">{sig1Scale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.5"
                  value={sig1Scale}
                  onChange={(e) => setSig1Scale(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <label className="block space-y-1 pt-2 border-t border-[#E4DBD2]">
                <span className="text-xs font-semibold text-[#3B2923] block">Input 2: x₂(t)</span>
                <select
                  value={sig2Type}
                  onChange={(e) => setSig2Type(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4C8BC] text-sm text-[#3B2923] focus:outline-none focus:border-[#9A4324] cursor-pointer"
                >
                  {SIGNAL_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-[#6B5145]">Scale Factor (b)</span>
                  <span className="font-mono text-[#9A4324] font-semibold tabular-nums">{sig2Scale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.5"
                  value={sig2Scale}
                  onChange={(e) => setSig2Scale(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-[#6B5145]">Time Shift (Δt)</span>
                  <span className="font-mono text-[#9A4324] font-semibold tabular-nums">
                    {timeShift >= 0 ? `+${timeShift.toFixed(1)}` : timeShift.toFixed(1)} s
                  </span>
                </div>
                <input
                  type="range"
                  min="-4.0"
                  max="6.0"
                  step="0.5"
                  value={timeShift}
                  onChange={(e) => setTimeShift(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="text-xs font-mono text-[#6B5145] pt-2 border-t border-[#E4DBD2] space-y-1">
                <div>System: <span className="text-[#3B2923] font-semibold">{systemLabel}</span></div>
                <div>Active Input: <span className="text-[#3B2923] font-semibold">{inputType}</span></div>
              </div>
            </div>
          )}

          {/* Status Verdict */}
          <div className="pt-3 border-t border-[#E4DBD2] bg-white rounded-lg p-3 border border-[#E4DBD2] space-y-1.5">
            <div className="text-xs font-mono text-[#6B5145] tabular-nums">
              Max |Δ| = <span className="text-[#3B2923] font-bold">{activeResult.maxDiff.toFixed(3)}</span>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                activeResult.satisfied ? 'text-[#047857]' : 'text-[#BE123C]'
              }`}
            >
              {activeResult.satisfied ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>
                {isLinearity
                  ? activeResult.satisfied
                    ? 'Linearity Satisfied'
                    : 'Not Linear'
                  : activeResult.satisfied
                  ? 'Time-Invariant'
                  : 'Time-Varying'}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Formulas & Explanation */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Property Identity
          </h3>
          {isLinearity ? (
            <div className="font-mono text-xs text-[#3B2923] space-y-1.5 leading-relaxed tabular-nums">
              <div>T&#123;a·x₁(t) + b·x₂(t)&#125; = a·T&#123;x₁(t)&#125; + b·T&#123;x₂(t)&#125; = a·y₁(t) + b·y₂(t)</div>
              <div className="text-[#6B5145]">
                a = {sig1Scale.toFixed(1)}, b = {sig2Scale.toFixed(1)} · Max |Δ| = {linearity.maxDiff.toFixed(3)}
              </div>
            </div>
          ) : (
            <div className="font-mono text-xs text-[#3B2923] space-y-1.5 leading-relaxed tabular-nums">
              <div>y(t) = T&#123;x(t)&#125; ⇒ T&#123;x(t − Δt)&#125; = y(t − Δt)</div>
              <div className="text-[#6B5145]">
                Δt = {timeShift >= 0 ? `+${timeShift.toFixed(1)}` : timeShift.toFixed(1)} s · Max |Δ| = {timeInvariance.maxDiff.toFixed(3)}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Explanation
          </h3>
          {isLinearity ? (
            <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
              <p>
                Because the continuous convolution integral scales and sums linearly, the combined-input response T&#123;a·x₁ + b·x₂&#125; overlays y₁(t) + y₂(t) identically.
              </p>
              <p>
                Adjust scales a and b (including negative inversions) to verify both additivity and homogeneity hold simultaneously for the {systemLabel} system.
              </p>
            </div>
          ) : (
            <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
              <p>
                A system is time-invariant if delaying the input x(t) by Δt simply shifts the entire output waveform y(t) by the exact same Δt without altering its shape.
              </p>
              <p>
                Because impulse response h(t) depends solely on elapsed time, T&#123;x(t − Δt)&#125; matches y(t − Δt) across the observation axis.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
