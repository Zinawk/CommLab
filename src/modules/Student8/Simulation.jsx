import React, { useState, useMemo, useEffect, useRef } from 'react';
import katex from 'katex';
import {
  Sliders,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  AM_LIMITS,
  generateAmDemodSignals,
} from './amDemodMath.js';
import AmSignalChart from './AmSignalChart.jsx';
import AmCircuitDiagram from './AmCircuitDiagram.jsx';

/**
 * Section 2.1 — Conventional Amplitude Modulation & Envelope Demodulation
 */
export default function AmDemodSimulation() {
  const [fm, setFm] = useState(AM_LIMITS.fm.default);
  const [fc, setFc] = useState(AM_LIMITS.fc.default);
  const [mu, setMu] = useState(AM_LIMITS.mu.default);

  const [isPlaying, setIsPlaying] = useState(true);
  const [timeOffset, setTimeOffset] = useState(0);
  const lastTimestampRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      return undefined;
    }

    let rafId;
    const animate = (timestamp) => {
      if (lastTimestampRef.current !== null) {
        const dt = (timestamp - lastTimestampRef.current) / 1000;
        setTimeOffset((prev) => prev + dt * 0.14);
      }
      lastTimestampRef.current = timestamp;
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const simData = useMemo(() => {
    return generateAmDemodSignals({
      fm,
      fc,
      mu,
      timeOffset,
      duration: 0.4,
      numSamples: 600,
    });
  }, [fm, fc, mu, timeOffset]);

  const {
    timeArray,
    messageArray,
    carrierArray,
    amSignalArray,
    upperEnvelopeArray,
    lowerEnvelopeArray,
    detectedEnvelopeArray,
    recoveredMessageArray,
    condition,
  } = simData;

  const timeMsArray = useMemo(() => {
    const out = new Float64Array(timeArray.length);
    for (let i = 0; i < timeArray.length; i++) out[i] = timeArray[i] * 1000;
    return out;
  }, [timeArray]);

  const sharedInputSeries = useMemo(
    () => [
      {
        name: 'm(t)',
        data: messageArray,
        color: '#0369A1',
        strokeWidth: 1.4,
      },
      {
        name: 'c(t)',
        data: carrierArray,
        color: '#C2410C',
        strokeWidth: 1.0,
        opacity: 0.78,
      },
    ],
    [messageArray, carrierArray]
  );

  const amModulationSeries = useMemo(
    () => [
      {
        name: 'Upper Envelope',
        data: upperEnvelopeArray,
        color: '#C2410C',
        strokeWidth: 1.2,
        strokeDasharray: '3 2.5',
      },
      {
        name: 'Lower Envelope',
        data: lowerEnvelopeArray,
        color: '#C2410C',
        strokeWidth: 1.2,
        strokeDasharray: '3 2.5',
      },
      {
        name: 's(t)',
        data: amSignalArray,
        color: '#0369A1',
        strokeWidth: 1.1,
        fillArea: false,
      },
    ],
    [upperEnvelopeArray, lowerEnvelopeArray, amSignalArray]
  );

  const demodOutputSeries = useMemo(
    () => [
      {
        name: 'm(t)',
        data: messageArray,
        color: '#0369A1',
        strokeWidth: 1.25,
      },
      {
        name: 'Detected Envelope',
        data: detectedEnvelopeArray,
        color: '#C2410C',
        strokeWidth: 1.15,
        opacity: 0.9,
      },
      {
        name: 'Smoothed LPF Output',
        data: recoveredMessageArray,
        color: '#047857',
        strokeWidth: 1.5,
      },
    ],
    [messageArray, detectedEnvelopeArray, recoveredMessageArray]
  );

  const conditionLabel =
    condition === 'undermodulation'
      ? 'Undermodulated (μ < 1)'
      : condition === 'critical'
      ? 'Critical (μ = 1)'
      : 'Overmodulated (μ > 1)';

  const amFormulaHtml = useMemo(
    () =>
      katex.renderToString(
        's(t) = A_c\\,[1 + \\mu\\,m(t)]\\cos(2\\pi f_c t),\\qquad m(t) = \\cos(2\\pi f_m t)',
        { throwOnError: false, displayMode: false }
      ),
    []
  );

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 py-2">
      {/* Module Header */}
      <div className="border-b border-[#E4DBD2] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
            Module 2 · Section 2.1
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3B2923] tracking-tight mt-0.5">
            Conventional AM &amp; Envelope Detection
          </h2>
          <p className="text-sm text-[#6B5145] mt-1 max-w-2xl">
            Observe how message m(t) modulates carrier c(t) into an envelope-carrying AM signal s(t), and test diode-RC recovery across modulation indices μ.
          </p>
        </div>
      </div>

      {/* Main Two-Zone Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left: 2x2 Grid for Modulation & Envelope Demodulation */}
        <div className="flex-1 min-w-0 w-full grid grid-cols-1 xl:grid-cols-2 gap-5">
          <AmSignalChart
            title="Input Signals"
            timeArray={timeMsArray}
            series={sharedInputSeries}
            dotColor="#0369A1"
            xUnit="ms"
            xLabel="Time t (ms)"
            yLabel="Voltage (V)"
            legend={[
              { label: 'm(t)', color: '#0369A1' },
              { label: 'c(t)', color: '#C2410C' },
            ]}
          />

          <AmSignalChart
            title="AM Modulated Signal"
            timeArray={timeMsArray}
            series={amModulationSeries}
            dotColor="#0369A1"
            xUnit="ms"
            xLabel="Time t (ms)"
            yLabel="Voltage (V)"
            legend={[
              { label: 's(t)', color: '#0369A1' },
              { label: '±Env', color: '#C2410C', dashed: true },
            ]}
          />

          <AmCircuitDiagram />

          <AmSignalChart
            title="Demodulated Output"
            timeArray={timeMsArray}
            series={demodOutputSeries}
            dotColor="#047857"
            xUnit="ms"
            xLabel="Time t (ms)"
            yLabel="Voltage (V)"
            legend={[
              { label: 'm(t)', color: '#0369A1' },
              { label: 'Envelope', color: '#C2410C' },
              { label: 'LPF Out', color: '#047857' },
            ]}
          />
        </div>

        {/* Right: Parameters Panel */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DBD2]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#9A4324]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                AM Controls
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPlaying((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg bg-[#9A4324] hover:bg-[#7D341A] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B5145] font-medium">Modulation Index (μ)</span>
                <span className="font-mono text-[#9A4324] font-semibold tabular-nums">
                  {mu.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={AM_LIMITS.mu.min}
                max={AM_LIMITS.mu.max}
                step={AM_LIMITS.mu.step}
                value={mu}
                onChange={(e) => setMu(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B5145] font-medium">Message Freq (f_m)</span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">
                  {fm.toFixed(1)} Hz
                </span>
              </div>
              <input
                type="range"
                min={AM_LIMITS.fm.min}
                max={AM_LIMITS.fm.max}
                step={AM_LIMITS.fm.step}
                value={fm}
                onChange={(e) => setFm(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B5145] font-medium">Carrier Freq (f_c)</span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">
                  {fc.toFixed(0)} Hz
                </span>
              </div>
              <input
                type="range"
                min={AM_LIMITS.fc.min}
                max={AM_LIMITS.fc.max}
                step={AM_LIMITS.fc.step}
                value={fc}
                onChange={(e) => setFc(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div
            className={`pt-3 border-t border-[#E4DBD2]`}
          >
            <div
              className={`rounded-lg px-3 py-2.5 border text-xs font-semibold flex items-center gap-2 ${
                condition === 'overmodulation'
                  ? 'bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]'
                  : condition === 'critical'
                  ? 'bg-[#F3E7DF] border-[#C88A72] text-[#9A4324]'
                  : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              }`}
            >
              {condition === 'overmodulation' ? (
                <AlertTriangle className="w-4 h-4 text-[#BE123C] shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
              )}
              <span>{conditionLabel}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom: Formulas & Explanation */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            AM Envelope Formulation
          </h3>
          <div
            className="text-sm text-[#3B2923] py-1 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: amFormulaHtml }}
          />
          <div className="font-mono text-xs text-[#6B5145] pt-2 border-t border-[#E4DBD2] tabular-nums">
            {`Envelope Bounds: A_max = 1 + μ = ${(1 + mu).toFixed(2)} · A_min = 1 − μ = ${(1 - mu).toFixed(2)}`}
          </div>
        </div>

        <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Explanation
          </h3>
          <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
            <p>
              In conventional AM, the baseband message m(t) scales the amplitude of a high-frequency carrier c(t), forming an outer envelope A_c·[1 + μ·m(t)].
            </p>
            <p>
              The diode-RC envelope detector tracks positive peaks and smooths carrier ripple to recover m(t) cleanly when μ ≤ 1; when μ &gt; 1, envelope inversion causes severe distortion.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
