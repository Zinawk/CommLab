import React, { useMemo } from 'react';
import { TWO_PI, generateWaveformPoints } from './eulerMath.js';

function SingleTrigChart({
  title,
  color,
  points,
  currentThetaRad,
  currentValue,
  amplitude,
  yLabel,
  indicatorLabel,
}) {
  const width = 440;
  const height = 240;
  const padding = { top: 14, right: 20, bottom: 38, left: 50 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const spanRad = TWO_PI;

  const yMax = Math.max(1.2, amplitude * 1.25);
  const yMin = -yMax;

  const getX = (theta) => padding.left + (theta / spanRad) * plotWidth;
  const getY = (val) => padding.top + (1 - (val - yMin) / (yMax - yMin || 1)) * plotHeight;
  const zeroY = getY(0);

  const pathD = useMemo(() => {
    return points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.theta).toFixed(1)} ${getY(pt.value).toFixed(1)}`)
      .join(' ');
  }, [points, yMin, yMax]);

  const xTicks = [
    { rad: 0, label: '0' },
    { rad: Math.PI / 2, label: 'π/2' },
    { rad: Math.PI, label: 'π' },
    { rad: (3 * Math.PI) / 2, label: '3π/2' },
    { rad: TWO_PI, label: '2π' },
  ];

  const yStep = amplitude >= 1.5 ? 1.0 : 0.5;
  const yTicks = [-amplitude, 0, amplitude].map((v) => Number((Math.round(v / (yStep / 2)) * (yStep / 2)).toFixed(2)));
  const uniqueYTicks = Array.from(new Set(yTicks)).sort((a, b) => a - b);

  const normTheta = ((currentThetaRad % TWO_PI) + TWO_PI) % TWO_PI;
  const indX = getX(normTheta);
  const indY = getY(currentValue);

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-[#3B2923] truncate">{title}</h3>
        <span className="text-xs font-mono text-[#6B5145] tabular-nums">{indicatorLabel}</span>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {uniqueYTicks.map((tickVal) => {
            const yPos = getY(tickVal);
            return (
              <g key={`yt-${tickVal}`}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="rgba(59, 41, 35, 0.10)"
                  strokeDasharray="3 3"
                  strokeWidth={0.9}
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 3.5}
                  textAnchor="end"
                  fill="#6B5145"
                  className="text-[11px] font-mono tabular-nums"
                >
                  {tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {xTicks.map((tick) => {
            const xPos = getX(tick.rad);
            return (
              <g key={`xt-${tick.label}`}>
                <line
                  x1={xPos}
                  y1={padding.top}
                  x2={xPos}
                  y2={height - padding.bottom}
                  stroke="rgba(59, 41, 35, 0.10)"
                  strokeDasharray="3 3"
                  strokeWidth={0.9}
                />
                <text
                  x={xPos}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  fill="#3B2923"
                  className="text-[11px] font-mono font-semibold"
                >
                  {tick.label}
                </text>
              </g>
            );
          })}

          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="rgba(59, 41, 35, 0.45)"
            strokeWidth={1.1}
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="rgba(59, 41, 35, 0.45)"
            strokeWidth={1.1}
          />
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="rgba(59, 41, 35, 0.28)"
            strokeWidth={1}
          />

          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <line
            x1={indX}
            y1={padding.top}
            x2={indX}
            y2={height - padding.bottom}
            stroke="rgba(59, 41, 35, 0.35)"
            strokeDasharray="2 2"
            strokeWidth={1}
          />
          <circle cx={indX} cy={indY} r={4.2} fill="#FFFFFF" stroke={color} strokeWidth={2} />

          <text
            x={(padding.left + width - padding.right) / 2}
            y={height - 4}
            textAnchor="middle"
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            Angle θ (rad)
          </text>
          <text
            x={13}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 13 ${padding.top + plotHeight / 2})`}
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            {yLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}

/**
 * Side-by-side Cosine & Sine waveform plots.
 */
export default function WaveformGraphs({
  angleDeg,
  frequency = 1,
  phaseDeg = 0,
  amplitude = 1,
}) {
  const angleRad = (angleDeg * Math.PI) / 180;
  const phaseRad = (phaseDeg * Math.PI) / 180;
  const spanRad = TWO_PI;

  const { cosPoints, sinPoints } = useMemo(
    () =>
      generateWaveformPoints({
        frequency,
        phaseRad,
        amplitude,
        spanRad,
        samples: 200,
      }),
    [frequency, phaseRad, amplitude, spanRad]
  );

  const currentCos = amplitude * Math.cos(frequency * angleRad + phaseRad);
  const currentSin = amplitude * Math.sin(frequency * angleRad + phaseRad);

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-5">
      <SingleTrigChart
        title="Cosine: Real x(θ) = A cos(fθ + ϕ)"
        color="#0369A1"
        points={cosPoints}
        currentThetaRad={angleRad}
        currentValue={currentCos}
        amplitude={amplitude}
        yLabel="Re"
        indicatorLabel={`${currentCos >= 0 ? '+' : ''}${currentCos.toFixed(2)}`}
      />

      <SingleTrigChart
        title="Sine: Imag y(θ) = A sin(fθ + ϕ)"
        color="#C2410C"
        points={sinPoints}
        currentThetaRad={angleRad}
        currentValue={currentSin}
        amplitude={amplitude}
        yLabel="Im"
        indicatorLabel={`${currentSin >= 0 ? '+' : ''}${currentSin.toFixed(2)}`}
      />
    </div>
  );
}
