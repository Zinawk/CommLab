import React, { useState } from 'react';
import MathView from './MathView.jsx';
import { BookOpen, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export default function LearningPanel({
  signalType,
  systemType,
  isContinuous,
  onApplyPreset,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('guide');

  const varSym = isContinuous ? 't' : 'n';

  const signalInfo = {
    impulse: {
      title: isContinuous ? 'Dirac Delta Impulse δ(t)' : 'Unit Impulse δ[n] (Kronecker Delta)',
      desc: isContinuous
        ? 'A pulse concentrated at a single instant with unit integral area. In physical testing, it serves as the instantaneous probe that extracts the impulse response h(t).'
        : 'The elementary probe signal: δ[0] = 1 and 0 elsewhere. Applying δ[n] to any LTI system yields its impulse response h[n], which completely characterizes the system.',
      equation: isContinuous
        ? '\\delta(t) = 0 \\; (t \\neq 0), \\; \\int \\delta(t) dt = 1'
        : '\\delta[n] = \\begin{cases} 1, & n = 0 \\\\ 0, & n \\neq 0 \\end{cases}',
    },
    step: {
      title: isContinuous ? 'Heaviside Unit Step u(t)' : 'Unit Step Sequence u[n]',
      desc: 'An abrupt transition from 0 to 1 at n = 0. Widely used to evaluate transient response, settling time, and steady-state DC gain of communication systems.',
      equation: `u[${varSym}] = \\begin{cases} 1, & ${varSym} \\ge 0 \\\\ 0, & ${varSym} < 0 \\end{cases}`,
    },
    sine: {
      title: 'Sinusoidal Waveform',
      desc: 'Harmonic oscillation. Sinusoids are eigenfunctions of LTI systems: the output is always a sinusoid at the exact same frequency, altered only in amplitude and phase.',
      equation: `x[${varSym}] = A \\sin(2\\pi f ${varSym} + \\phi)`,
    },
    cosine: {
      title: 'Cosine Waveform',
      desc: 'Harmonic oscillation starting at maximum amplitude (phase lead of π/2 relative to sine). Fundamental building block for Fourier spectral analysis.',
      equation: `x[${varSym}] = A \\cos(2\\pi f ${varSym} + \\phi)`,
    },
    rect: {
      title: 'Rectangular Pulse',
      desc: 'A finite pulse of duration W samples. Represents a digital bit, pulse-amplitude modulation (PAM) symbol, or finite data packet.',
      equation: `x[${varSym}] = u[${varSym}] - u[${varSym} - W]`,
    },
    exp: {
      title: 'Decaying Exponential Signal',
      desc: 'Models natural physical discharge (e.g. RC circuit, channel multipath tail). For α > 0, the signal smoothly decays toward zero.',
      equation: `x[${varSym}] = A e^{-\\alpha ${varSym}} u[${varSym}]`,
    },
  }[signalType] || {};

  const systemInfo = {
    gain: {
      title: 'Gain System (Amplifier / Attenuator)',
      role: 'Instantaneous scaling: y[n] = K · x[n]. Memoryless, linear, time-invariant, and BIBO stable for any finite K.',
      insight: 'The impulse response is a single scaled impulse h[n] = K·δ[n]. It does not introduce any time delay or frequency dispersion.',
    },
    delay: {
      title: 'Delay / Advance System',
      role: 'Time translation: y[n] = x[n − D]. Pure delay (D > 0) is causal and models transmission latency; advance (D < 0) is non-causal.',
      insight: 'Shifting the impulse response h[n] = δ[n − D] preserves all signal shapes without distortion or attenuation.',
    },
    moving_average: {
      title: 'Moving Average FIR Filter',
      role: 'Averages the M most recent samples. Acts as a low-pass smoothing filter that attenuates high frequencies and sharp noise spikes.',
      insight: 'The impulse response is a rectangular window of height 1/M. Convolution with a rectangular pulse produces a smooth trapezoid.',
    },
  }[systemType] || {};

  const presets = [
    {
      name: 'Demonstrating Non-Causality (Advance D = -3)',
      desc: 'Sets delay to -3. Observe Causality change from Yes to No because the output requires future samples.',
      apply: () =>
        onApplyPreset({
          signalMode: 'discrete',
          inputType: 'step',
          amplitude: 1.0,
          shift: 5,
          systemType: 'delay',
          delay: -3,
        }),
    },
    {
      name: 'Pulse Smoothing via Moving Average',
      desc: 'Feeds a sharp rectangular pulse into a 4-sample moving average to demonstrate FIR low-pass filtering.',
      apply: () =>
        onApplyPreset({
          signalMode: 'discrete',
          inputType: 'rect',
          amplitude: 1.0,
          shift: 0,
          pulseWidth: 6,
          systemType: 'moving_average',
          windowSize: 4,
        }),
    },
    {
      name: 'System Fingerprint via Unit Impulse δ[n]',
      desc: 'Input δ[n] directly reproduces the impulse response h[n] at the output y[n].',
      apply: () =>
        onApplyPreset({
          signalMode: 'discrete',
          inputType: 'impulse',
          amplitude: 1.0,
          shift: 0,
          systemType: 'moving_average',
          windowSize: 4,
        }),
    },
    {
      name: 'Decaying Exponential with Gain Amplification',
      desc: 'Applies 1.5x amplification to an exponential decay signal.',
      apply: () =>
        onApplyPreset({
          signalMode: 'discrete',
          inputType: 'exp',
          amplitude: 1.0,
          shift: 0,
          alpha: 0.25,
          systemType: 'gain',
          gain: 1.5,
        }),
    },
  ];

  return (
    <div className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2.5 text-left cursor-pointer group flex-1"
        >
          <BookOpen className="w-4 h-4 text-[#9A4324] shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-[#3B2923] group-hover:text-[#9A4324] transition-colors">
              Learning Companion &amp; Guided Presets
            </h3>
            <p className="text-xs text-[#6B5145]">
              Clear concepts, interactive scenarios, and mathematical proofs
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {isOpen && (
            <div className="flex bg-white p-0.5 rounded-lg border border-[#E4DBD2]">
              {[
                { id: 'guide', label: 'Overview' },
                { id: 'presets', label: 'Presets' },
                { id: 'derivations', label: 'Proofs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#9A4324] text-white'
                      : 'text-[#6B5145] hover:text-[#3B2923]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1.5 text-[#6B5145] hover:text-[#3B2923] rounded-lg hover:bg-white border border-transparent hover:border-[#E4DBD2] transition-colors cursor-pointer"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="pt-3 border-t border-[#E4DBD2] text-xs text-[#3B2923] space-y-4">
          {activeTab === 'guide' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#9A4324]">
                  Input Signal
                </span>
                <h4 className="text-sm font-bold text-[#3B2923]">{signalInfo.title}</h4>
                <div className="py-0.5">
                  <MathView math={signalInfo.equation} />
                </div>
                <p className="text-xs text-[#6B5145] leading-relaxed">{signalInfo.desc}</p>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#9A4324]">
                  System Dynamics
                </span>
                <h4 className="text-sm font-bold text-[#3B2923]">{systemInfo.title}</h4>
                <p className="text-xs text-[#6B5145] leading-relaxed">{systemInfo.role}</p>
                <p className="text-xs text-[#6B5145] leading-relaxed pt-1">
                  <strong className="text-[#3B2923]">Impulse Response Role: </strong>
                  {systemInfo.insight}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-[#3B2923] font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#9A4324]" />
                <span>Select a Scenario to Test Instantly:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={preset.apply}
                    className="p-3 text-left rounded-lg bg-white hover:bg-[#EDE4DA] border border-[#E4DBD2] transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-bold text-[#9A4324] mb-1">
                      {preset.name}
                    </div>
                    <p className="text-xs text-[#6B5145] leading-relaxed">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'derivations' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <h5 className="font-bold text-[#3B2923] text-xs">1. Superposition &amp; LTI</h5>
                <p className="text-xs text-[#6B5145] leading-relaxed">
                  Every signal is a sum of impulses: <MathView math="x[n] = \sum x[k]\delta[n-k]" />.
                </p>
                <div className="py-1">
                  <MathView math="y[n] = \sum_{k} x[k] h[n - k]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h5 className="font-bold text-[#3B2923] text-xs">2. Physical Causality</h5>
                <p className="text-xs text-[#6B5145] leading-relaxed">
                  Real-time physical systems cannot anticipate the future:
                </p>
                <div className="py-1">
                  <MathView math="h[n] = 0 \quad \forall n < 0" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h5 className="font-bold text-[#3B2923] text-xs">3. BIBO Stability</h5>
                <p className="text-xs text-[#6B5145] leading-relaxed">
                  Bounded input yields bounded output iff impulse response is absolutely summable:
                </p>
                <div className="py-1">
                  <MathView math="\sum_{n=-\infty}^{\infty} |h[n]| < \infty" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
