import React, { useRef, useState, useCallback } from 'react';
import { TIME_MIN, TIME_MAX } from './stationarityMath.js';

const SUBSCRIPTS = ['₁', '₂', '₃', '₄'];

export default function RealizationsChart({
  traces,
  sampleTimes,
  timeColors,
  onChangeSampleTime,
}) {
  const svgRef = useRef(null);
  const [draggingIdx, setDraggingIdx] = useState(null);

  const width = 440;
  const height = 275;
  const padding = { top: 24, right: 16, bottom: 32, left: 40 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const trackGap = 10;
  const trackH = (plotH - trackGap * 3) / 4;
  const yBound = 2.9;

  const getX = useCallback(
    (t) => padding.left + ((t - TIME_MIN) / (TIME_MAX - TIME_MIN)) * plotW,
    [plotW, padding.left]
  );

  const getTrackY = useCallback(
    (trackIndex, val) => {
      const top = padding.top + trackIndex * (trackH + trackGap);
      const clamped = Math.max(-yBound, Math.min(yBound, val));
      return top + (0.5 - clamped / (2 * yBound)) * trackH;
    },
    [padding.top, trackH, trackGap]
  );

  const clientXToTime = useCallback(
    (clientX) => {
      if (!svgRef.current) return 0;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = width / rect.width;
      const svgX = (clientX - rect.left) * scaleX;
      const ratio = Math.max(0.02, Math.min(0.98, (svgX - padding.left) / plotW));
      return Math.round(TIME_MIN + ratio * (TIME_MAX - TIME_MIN));
    },
    [plotW, padding.left]
  );

  const handlePointerMove = (e) => {
    if (draggingIdx === null) return;
    onChangeSampleTime(draggingIdx, clientXToTime(e.clientX));
  };

  const handlePointerUp = (e) => {
    if (draggingIdx !== null) {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setDraggingIdx(null);
    }
  };

  const xPositions = sampleTimes.map((tk) => getX(tk));
  const labelOffsets = xPositions.map((xPos, idx) => {
    for (let j = 0; j < idx; j++) {
      if (Math.abs(xPos - xPositions[j]) < 18) return 11;
    }
    return 0;
  });

  const waveColors = ['#0369A1', '#C2410C', '#047857', '#7E22CE'];
  const tTicks = [0, 250, 500, 750, 1000];

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#3B2923]">
          Stochastic Realizations x₁(t)–x₄(t)
        </h3>
        <span className="text-xs text-[#6B5145] font-medium">Drag markers t₁–t₄</span>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Vertical Grid & Dark Brown X Ticks */}
          {tTicks.map((tk) => {
            const xPos = getX(tk);
            return (
              <g key={`tg-${tk}`}>
                <line
                  x1={xPos}
                  y1={padding.top}
                  x2={xPos}
                  y2={height - padding.bottom}
                  stroke="rgba(59,41,35,0.10)"
                  strokeDasharray="2 3"
                  strokeWidth={0.9}
                />
                <text
                  x={xPos}
                  y={height - padding.bottom + 15}
                  textAnchor="middle"
                  className="text-[11px] font-mono font-semibold fill-[#3B2923]"
                >
                  {tk}
                </text>
              </g>
            );
          })}

          {/* Dark Brown L-frame axes */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="rgba(59,41,35,0.45)"
            strokeWidth={1}
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="rgba(59,41,35,0.45)"
            strokeWidth={1}
          />

          {/* 4 Stacked Tracks */}
          {traces.map((trace, idx) => {
            const midY = getTrackY(idx, 0);
            const pathD = trace.points
              .map(
                (pt, i) =>
                  `${i === 0 ? 'M' : 'L'} ${getX(pt.t).toFixed(1)} ${getTrackY(idx, pt.val).toFixed(1)}`
              )
              .join(' ');

            return (
              <g key={trace.id}>
                <line
                  x1={padding.left}
                  y1={midY}
                  x2={width - padding.right}
                  y2={midY}
                  stroke="rgba(59,41,35,0.18)"
                  strokeWidth={0.8}
                />
                <text
                  x={padding.left - 6}
                  y={midY + 3.5}
                  textAnchor="end"
                  fill={waveColors[idx]}
                  className="text-[10px] font-mono font-semibold"
                >
                  x{SUBSCRIPTS[idx]}
                </text>
                <path
                  d={pathD}
                  fill="none"
                  stroke={waveColors[idx]}
                  strokeWidth={1.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {trace.sampledMarkers.map((mk, mIdx) => (
                  <circle
                    key={`mk-${idx}-${mIdx}`}
                    cx={getX(mk.t)}
                    cy={getTrackY(idx, mk.val)}
                    r={3}
                    fill={timeColors[mIdx]}
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                  />
                ))}
              </g>
            );
          })}

          {/* 4 Draggable Dashed Vertical Sampling Lines */}
          {sampleTimes.map((_, mIdx) => {
            const xPos = xPositions[mIdx];
            const isActive = draggingIdx === mIdx;

            return (
              <g
                key={`line-${mIdx}`}
                className="cursor-ew-resize"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  svgRef.current?.setPointerCapture?.(e.pointerId);
                  setDraggingIdx(mIdx);
                }}
              >
                <line
                  x1={xPos}
                  y1={padding.top - 4}
                  x2={xPos}
                  y2={height - padding.bottom}
                  stroke={timeColors[mIdx]}
                  strokeWidth={isActive ? 2.2 : 1.4}
                  strokeDasharray="3 2.5"
                  strokeOpacity={0.95}
                />
                <text
                  x={xPos}
                  y={padding.top - 7 - labelOffsets[mIdx]}
                  textAnchor="middle"
                  fill={timeColors[mIdx]}
                  className="text-[10px] font-mono font-bold"
                >
                  t{SUBSCRIPTS[mIdx]}
                </text>
                <rect
                  x={xPos - 10}
                  y={0}
                  width={20}
                  height={height - padding.bottom}
                  fill="transparent"
                />
              </g>
            );
          })}

          <text
            x={padding.left + plotW / 2}
            y={height - 3}
            textAnchor="middle"
            className="text-[10px] font-sans font-semibold fill-[#6B5145]"
          >
            Time t (ms)
          </text>
        </svg>
      </div>
    </div>
  );
}
