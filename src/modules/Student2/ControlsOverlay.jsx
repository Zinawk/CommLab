import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Eye,
} from 'lucide-react';
import { degToRad, computeEuler } from './eulerMath.js';

function SafeNumberInput({ value, min, max, step = 1, onChange, className = '', suffix = '' }) {
  const [draftStr, setDraftStr] = useState(null);

  const commitValue = (rawStr) => {
    let parsed = parseFloat(rawStr);
    if (isNaN(parsed)) {
      parsed = value;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    const precision = step < 0.1 ? 2 : step < 1 ? 1 : 0;
    const rounded = parseFloat(clamped.toFixed(precision));
    setDraftStr(null);
    onChange(rounded);
  };

  const displayValue = draftStr !== null ? draftStr : String(value);

  return (
    <div className="relative inline-flex items-center">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        onFocus={() => setDraftStr(String(value))}
        onChange={(e) => {
          setDraftStr(e.target.value);
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed) && parsed >= min && parsed <= max) {
            onChange(parsed);
          }
        }}
        onBlur={(e) => commitValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitValue(e.currentTarget.value);
          }
        }}
        className={`w-20 sm:w-24 px-2 py-1 bg-white border border-[#D4C8BC] rounded-lg text-sm font-mono text-[#3B2923] text-right focus:outline-none focus:border-[#9A4324] ${className}`}
      />
      {suffix && (
        <span className="ml-1.5 text-xs font-mono text-[#6B5145] select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

export default function ControlsOverlay({
  angleDeg,
  onAngleChange,
  speed,
  onSpeedChange,
  startAngle,
  onStartAngleChange,
  endAngle,
  onEndAngleChange,
  isAutoMode,
  onToggleAutoMode,
  isPlaying,
  onTogglePlay,
  onReset,
  cameraView,
  onCameraViewChange,
}) {
  const thetaRad = degToRad(angleDeg);
  const mathValues = computeEuler(thetaRad);

  const cosStr = mathValues.real >= 0 ? `+${mathValues.real.toFixed(4)}` : mathValues.real.toFixed(4);
  const sinStr = mathValues.imag >= 0 ? `+${mathValues.imag.toFixed(4)}` : mathValues.imag.toFixed(4);
  const sign = mathValues.imag >= 0 ? '+' : '-';
  const absSin = Math.abs(mathValues.imag).toFixed(4);

  return (
    <div className="w-full space-y-5">
      {/* Live Mathematical Readout Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#F5F0EA] border border-[#E4DBD2] flex flex-col justify-between">
          <div className="text-xs font-mono text-[#6B5145] uppercase tracking-wider">
            Angle (θ)
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-[#9A4324] tabular-nums">
              {angleDeg.toFixed(1)}°
            </span>
            <span className="text-xs font-mono text-[#6B5145] tabular-nums">
              {thetaRad.toFixed(2)} rad
            </span>
          </div>
          <div className="mt-1 text-xs font-mono text-[#6B5145] tabular-nums">
            {(angleDeg / 180).toFixed(2)}π rad
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#F5F0EA] border border-[#E4DBD2] flex flex-col justify-between">
          <div className="text-xs font-mono text-[#0369A1] uppercase tracking-wider font-semibold">
            x = cos(θ)
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-[#3B2923] tabular-nums">
            {cosStr}
          </div>
          <div className="mt-1 text-xs font-mono text-[#6B5145]">
            Real Axis (Horizontal)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#F5F0EA] border border-[#E4DBD2] flex flex-col justify-between">
          <div className="text-xs font-mono text-[#C2410C] uppercase tracking-wider font-semibold">
            y = sin(θ)
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-[#3B2923] tabular-nums">
            {sinStr}
          </div>
          <div className="mt-1 text-xs font-mono text-[#6B5145]">
            Imaginary Axis (Vertical)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#F5F0EA] border border-[#E4DBD2] flex flex-col justify-between">
          <div className="text-xs font-mono text-[#9A4324] uppercase tracking-wider font-semibold">
            Euler Value
          </div>
          <div className="mt-1.5 text-base font-bold font-mono text-[#3B2923] truncate tabular-nums">
            {cosStr} {sign} j{absSin}
          </div>
          <div className="mt-1 text-xs font-mono text-[#6B5145]">
            e^(jθ) = cos(θ) + j·sin(θ)
          </div>
        </div>
      </div>

      {/* Primary Playback & Camera Controls */}
      <div className="p-4 rounded-xl bg-[#F5F0EA] border border-[#E4DBD2] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#9A4324] hover:bg-[#7D341A] text-white transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white hover:bg-[#EDE4DA] text-[#3B2923] border border-[#E4DBD2] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#6B5145]" />
            <span>Reset</span>
          </button>

          <div className="inline-flex p-1 rounded-lg bg-white border border-[#E4DBD2]">
            <button
              type="button"
              onClick={() => onToggleAutoMode(true)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                isAutoMode ? 'bg-[#9A4324] text-white font-semibold' : 'text-[#6B5145] hover:text-[#3B2923]'
              }`}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => onToggleAutoMode(false)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                !isAutoMode ? 'bg-[#9A4324] text-white font-semibold' : 'text-[#6B5145] hover:text-[#3B2923]'
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-[#6B5145] mr-1 hidden sm:inline">
            <Eye className="w-3.5 h-3.5 inline mr-1" />
            View:
          </span>
          {[
            { id: 'isometric', label: '3D Isometric' },
            { id: 'circle', label: 'Circle (X-Y)' },
            { id: 'cosine', label: 'Top (X-Z Cos)' },
            { id: 'sine', label: 'Side (Y-Z Sin)' },
            { id: 'bottom', label: 'Bottom' },
            { id: 'back', label: 'Back' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onCameraViewChange(id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
                cameraView === id
                  ? 'bg-[#F3E7DF] border-[#C88A72] text-[#9A4324] font-semibold'
                  : 'bg-white border-[#E4DBD2] text-[#6B5145] hover:text-[#3B2923]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Parameter Sliders */}
      <div className="p-5 rounded-xl bg-[#F5F0EA] border border-[#E4DBD2] space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-[#E4DBD2]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#9A4324]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923] font-mono">
              Parameters
            </h3>
          </div>
          <span className="text-xs font-mono text-[#6B5145]">
            Sliders + Numerical Inputs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="angle-slider" className="text-xs font-mono text-[#3B2923] font-semibold">
                Angle θ
              </label>
              <SafeNumberInput value={angleDeg} min={0} max={360} step={0.5} onChange={onAngleChange} suffix="°" />
            </div>
            <input
              id="angle-slider"
              type="range"
              min={0}
              max={360}
              step={0.5}
              value={angleDeg}
              onChange={(e) => onAngleChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="speed-slider" className="text-xs font-mono text-[#3B2923] font-semibold">
                Speed
              </label>
              <SafeNumberInput value={speed} min={0.1} max={5.0} step={0.1} onChange={onSpeedChange} suffix="×" />
            </div>
            <input
              id="speed-slider"
              type="range"
              min={0.1}
              max={3.0}
              step={0.1}
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="start-angle-slider" className="text-xs font-mono text-[#3B2923] font-semibold">
                Start Angle
              </label>
              <SafeNumberInput value={startAngle} min={0} max={360} step={1} onChange={onStartAngleChange} suffix="°" />
            </div>
            <input
              id="start-angle-slider"
              type="range"
              min={0}
              max={360}
              step={1}
              value={startAngle}
              onChange={(e) => onStartAngleChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="end-angle-slider" className="text-xs font-mono text-[#3B2923] font-semibold">
                End Angle
              </label>
              <SafeNumberInput value={endAngle} min={0} max={360} step={1} onChange={onEndAngleChange} suffix="°" />
            </div>
            <input
              id="end-angle-slider"
              type="range"
              min={0}
              max={360}
              step={1}
              value={endAngle}
              onChange={(e) => onEndAngleChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-[#6B5145] mr-1">Quick Snap:</span>
          {[0, 45, 90, 180, 270, 360].map((deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => onAngleChange(deg)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-colors cursor-pointer ${
                Math.abs(angleDeg - deg) < 0.5
                  ? 'bg-[#F3E7DF] border-[#C88A72] text-[#9A4324] font-semibold'
                  : 'bg-white border-[#E4DBD2] text-[#6B5145] hover:text-[#3B2923]'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
