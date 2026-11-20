import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import katex from 'katex';
import { Box, Compass, Radio, Sliders, Play, Pause, RotateCcw } from 'lucide-react';
import Euler3DScene from './Euler3DScene.jsx';
import EulerComplexPlane from './EulerComplexPlane.jsx';
import PhasorLaboratory, { PhasorWavesChart } from './PhasorLaboratory.jsx';
import { normalizeDeg, degToRad, computeEuler, formatComplex, TWO_PI } from './eulerMath.js';

/**
 * Section 1.2 — Euler's Formula & Complex Phasors
 */
export default function Simulation() {
  const [activeTab, setActiveTab] = useState('3d'); // '3d' | 'plane' | 'phasor'

  const [angleDeg, setAngleDeg] = useState(45);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [startAngle, setStartAngle] = useState(0);
  const [endAngle, setEndAngle] = useState(360);
  const [cameraView, setCameraView] = useState('isometric');

  // Waveform / Phasor parameters
  const [amplitude, setAmplitude] = useState(1.0);
  const [frequency, setFrequency] = useState(1.0);
  const [phaseDeg, setPhaseDeg] = useState(0);
  const [direction, setDirection] = useState(1);

  const prevTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  const angleRef = useRef(45);

  useEffect(() => {
    angleRef.current = angleDeg;
  }, [angleDeg]);

  useEffect(() => {
    if (!isPlaying || !isAutoMode) {
      prevTimeRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return undefined;
    }

    const animate = (timestamp) => {
      if (prevTimeRef.current === null) prevTimeRef.current = timestamp;
      const deltaSec = (timestamp - prevTimeRef.current) / 1000;
      prevTimeRef.current = timestamp;

      const deltaDeg = direction * 36 * speed * (activeTab === 'phasor' ? frequency * 3 : 1) * deltaSec;
      const rawSpan = endAngle - startAngle;
      const span = rawSpan > 0 ? rawSpan : (rawSpan + 360) % 360 || 360;

      let currentOffset = (angleRef.current - startAngle) % 360;
      if (currentOffset < 0) currentOffset += 360;
      let nextOffset = (currentOffset + deltaDeg) % span;
      if (nextOffset < 0) nextOffset += span;

      const nextAngle = normalizeDeg(startAngle + nextOffset);
      angleRef.current = nextAngle;
      setAngleDeg(nextAngle);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isAutoMode, speed, startAngle, endAngle, direction, activeTab, frequency]);

  const handleTogglePlay = useCallback(() => {
    if (!isPlaying && !isAutoMode) setIsAutoMode(true);
    setIsPlaying((p) => !p);
  }, [isPlaying, isAutoMode]);

  const handleReset = useCallback(() => {
    const target = normalizeDeg(startAngle);
    angleRef.current = target;
    setAngleDeg(target);
    prevTimeRef.current = null;
  }, [startAngle]);

  const handleAngleChange = useCallback((newDeg) => {
    const clamped = Math.max(0, Math.min(360, newDeg));
    angleRef.current = clamped;
    setAngleDeg(clamped);
  }, []);

  const thetaRad = degToRad(angleDeg);
  const euler = computeEuler(thetaRad);
  const cosScaled = amplitude * euler.real;
  const sinScaled = amplitude * euler.imag;

  const formulaHtml = useMemo(() => {
    const tex =
      activeTab === 'phasor'
        ? 'X(t) = A e^{j(\\omega t + \\phi)} = A\\cos(\\omega t + \\phi) + j A\\sin(\\omega t + \\phi)'
        : 'e^{j\\theta} = \\cos(\\theta) + j\\sin(\\theta)';
    return katex.renderToString(tex, { throwOnError: false, displayMode: false });
  }, [activeTab]);

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 py-2">
      {/* Header + Segmented View Selector */}
      <div className="border-b border-[#E4DBD2] pb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
            Module 1 · Section 1.2
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3B2923] tracking-tight mt-0.5">
            Complex Exponentials &amp; Rotating Phasors
          </h2>
          <p className="text-sm text-[#6B5145] mt-1 max-w-2xl">
            {activeTab === '3d' &&
              'Visualize how a unit vector e^(jθ) in the X–Y plane projects into cos(θ) along X–Z and sin(θ) along Y–Z.'}
            {activeTab === 'plane' &&
              'Project a rotating unit complex exponential e^(jθ) onto the Real (cos θ) and Imaginary (sin θ) axes.'}
            {activeTab === 'phasor' &&
              'Inspect rotating phasor X(t) = A·e^(j(ωt + ϕ)) alongside simultaneous time-domain Re and Im projections.'}
          </p>
        </div>

        {/* Sub-Lab Tab Bar */}
        <div className="inline-flex bg-[#F5F0EA] p-1 rounded-lg border border-[#E4DBD2] shrink-0 self-start lg:self-auto">
          {[
            { id: '3d', label: 'Euler 3D', Icon: Box },
            { id: 'plane', label: 'Complex Plane', Icon: Compass },
            { id: 'phasor', label: 'Phasor Lab', Icon: Radio },
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

      {/* Main Two-Zone Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left Interactive Stage */}
        <div className="flex-1 min-w-0 w-full">
          {activeTab === '3d' && (
            <Euler3DScene
              angleDeg={angleDeg}
              cameraView={cameraView}
              onCameraViewChange={setCameraView}
            />
          )}

          {activeTab === 'plane' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <EulerComplexPlane
                angleDeg={angleDeg}
                onAngleChange={handleAngleChange}
                amplitude={1}
                title="Unit Circle e^(jθ)"
              />
              <PhasorWavesChart
                amplitude={1}
                frequency={1}
                phaseDeg={0}
                currentAngleDeg={angleDeg}
              />
            </div>
          )}

          {activeTab === 'phasor' && (
            <PhasorLaboratory
              amplitude={amplitude}
              frequency={frequency}
              phaseDeg={phaseDeg}
              currentAngleDeg={angleDeg}
            />
          )}
        </div>

        {/* Right Control Deck */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DBD2]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#9A4324]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                Phasor Controls
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="px-2.5 py-1 rounded-lg bg-[#9A4324] hover:bg-[#7D341A] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-white hover:bg-[#EDE4DA] border border-[#E4DBD2] text-[#6B5145] hover:text-[#3B2923] transition-colors cursor-pointer"
                title="Reset angle"
                aria-label="Reset angle"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Angle θ */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-[#6B5145]">Angle (θ)</span>
                <span className="font-mono text-[#9A4324] font-semibold tabular-nums">{angleDeg.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="0.5"
                value={angleDeg}
                onChange={(e) => {
                  setIsAutoMode(false);
                  setIsPlaying(false);
                  handleAngleChange(parseFloat(e.target.value));
                }}
                className="w-full"
              />
            </div>

            {/* Speed */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-[#6B5145]">Animation Speed</span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{speed.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.2"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {activeTab === '3d' && (
              <div className="space-y-3 pt-3 border-t border-[#E4DBD2]">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#3B2923] block">Camera Preset</span>
                  <select
                    value={cameraView}
                    onChange={(e) => setCameraView(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4C8BC] text-sm text-[#3B2923] focus:outline-none focus:border-[#9A4324] cursor-pointer"
                  >
                    <option value="isometric">3D Isometric</option>
                    <option value="circle">Circle (X–Y Plane)</option>
                    <option value="cosine">Top Cos (X–Z Plane)</option>
                    <option value="sine">Side Sin (Y–Z Plane)</option>
                    <option value="bottom">Bottom View</option>
                    <option value="back">Back View</option>
                  </select>
                </label>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-[#6B5145]">Sweep Start θ</span>
                    <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{startAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={startAngle}
                    onChange={(e) => setStartAngle(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-[#6B5145]">Sweep End θ</span>
                    <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{endAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={endAngle}
                    onChange={(e) => setEndAngle(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {activeTab === 'phasor' && (
              <div className="space-y-3 pt-3 border-t border-[#E4DBD2]">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-[#6B5145]">Amplitude (A)</span>
                    <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{amplitude.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={amplitude}
                    onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-[#6B5145]">Frequency (f)</span>
                    <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{frequency.toFixed(1)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.5"
                    value={frequency}
                    onChange={(e) => setFrequency(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-[#6B5145]">Initial Phase (ϕ)</span>
                    <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{phaseDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="15"
                    value={phaseDeg}
                    onChange={(e) => setPhaseDeg(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {(activeTab === 'plane' || activeTab === 'phasor') && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setDirection((d) => (d === 1 ? -1 : 1))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white hover:bg-[#EDE4DA] border border-[#E4DBD2] text-xs font-semibold text-[#3B2923] transition-colors cursor-pointer"
                >
                  Rotation: {direction > 0 ? 'Counter-Clockwise (+ω)' : 'Clockwise (−ω)'}
                </button>
              </div>
            )}

            {/* Quick Cardinal Snap Buttons */}
            <div className="pt-3 border-t border-[#E4DBD2] space-y-1.5">
              <span className="text-xs font-semibold text-[#3B2923] block">Quick Angle Snap</span>
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 90, 180, 270, 360].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setIsAutoMode(false);
                      setIsPlaying(false);
                      handleAngleChange(d);
                    }}
                    className={`py-1 rounded-md text-xs font-mono cursor-pointer border transition-colors ${
                      Math.abs(angleDeg - d) < 1
                        ? 'bg-[#F3E7DF] border-[#C88A72] text-[#9A4324] font-semibold'
                        : 'bg-white border-[#E4DBD2] text-[#6B5145] hover:text-[#3B2923]'
                    }`}
                  >
                    {d}°
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Information & Formulas */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Mathematical Identity &amp; Readout
          </h3>
          <div
            className="text-sm text-[#3B2923] py-1 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: formulaHtml }}
          />
          <div className="font-mono text-xs text-[#6B5145] pt-1 border-t border-[#E4DBD2] tabular-nums">
            θ = {angleDeg.toFixed(1)}° ({thetaRad.toFixed(3)} rad) · x = {cosScaled.toFixed(3)} · y = {sinScaled.toFixed(3)} · {formatComplex(cosScaled, sinScaled, 3)}
            {activeTab === 'phasor' ? ` · ω = ${(TWO_PI * frequency).toFixed(2)} rad/s` : ''}
          </div>
        </div>

        <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Conceptual Interpretation
          </h3>
          <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
            <p>
              Euler's formula unifies circular motion in the complex plane with sinusoidal oscillations in time: cos(θ) traces the horizontal real projection while sin(θ) traces the vertical imaginary projection, 90° out of phase.
            </p>
            <p>
              Rotating a phasor of amplitude A at angular velocity ω = 2πf generates clean harmonic signals whose magnitude |A·e^(jθ)| remains invariant across every angle θ.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
