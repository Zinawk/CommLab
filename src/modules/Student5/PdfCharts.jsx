import React from 'react';
import { PDF_MIN, PDF_MAX, BIN_WIDTH } from './stationarityMath.js';

const SUBSCRIPTS = ['₁', '₂', '₃', '₄'];

export function CombinedPdfChart({ bins, bellCurve, timeColors }) {
  const width = 420;
  const height = 165;
  const padding = { top: 10, right: 16, bottom: 30, left: 42 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const yMax = 0.52;

  const getX = (x) => padding.left + ((x - PDF_MIN) / (PDF_MAX - PDF_MIN)) * plotW;
  const getY = (d) => padding.top + (1 - Math.min(yMax, Math.max(0, d)) / yMax) * plotH;

  const buildPath = (key) =>
    bins
      .map(
        (b, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${getX(b.x).toFixed(1)} ${getY(b[key]).toFixed(1)}`
      )
      .join(' ');

  const bellPath = bellCurve
    .map(
      (pt, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${getX(pt.x).toFixed(1)} ${getY(pt.y).toFixed(1)}`
    )
    .join(' ');

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-[#3B2923]">
          Combined PDF f<sub>X</sub>(x)
        </h4>
        <div className="flex items-center gap-3 text-[11px] text-[#6B5145]">
          {timeColors.map((color, idx) => (
            <span key={`legend-time-${idx}`} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5" style={{ backgroundColor: color }} />
              <span className="font-mono font-medium">t{SUBSCRIPTS[idx]}</span>
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
        {[0, 0.2, 0.4].map((yt) => {
          const yPos = getY(yt);
          return (
            <g key={`cyt-${yt}`}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={width - padding.right}
                y2={yPos}
                stroke="rgba(59,41,35,0.10)"
                strokeDasharray="2 3"
                strokeWidth={0.9}
              />
              <text
                x={padding.left - 6}
                y={yPos + 3.5}
                textAnchor="end"
                className="text-[10px] font-mono fill-[#6B5145]"
              >
                {yt.toFixed(1)}
              </text>
            </g>
          );
        })}

        {[-3, -2, -1, 0, 1, 2, 3].map((xt) => {
          const xp = getX(xt);
          return (
            <g key={`cxt-${xt}`}>
              <line
                x1={xp}
                y1={padding.top}
                x2={xp}
                y2={height - padding.bottom}
                stroke="rgba(59,41,35,0.10)"
                strokeDasharray="2 3"
                strokeWidth={0.9}
              />
              <text
                x={xp}
                y={height - padding.bottom + 14}
                textAnchor="middle"
                className="text-[11px] font-mono font-semibold fill-[#3B2923]"
              >
                {xt}
              </text>
            </g>
          );
        })}

        {/* Dark Brown L-Frame Axes */}
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

        {timeColors.map((color, idx) => (
          <path
            key={`pdf-curve-${idx}`}
            d={buildPath(`pdf${idx + 1}`)}
            fill="none"
            stroke={color}
            strokeWidth={1.65}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        <path
          d={bellPath}
          fill="none"
          stroke="#3B2923"
          strokeWidth={1.3}
          strokeDasharray="3 2.5"
          strokeLinecap="round"
        />

        <text
          x={padding.left + plotW / 2}
          y={height - 3}
          textAnchor="middle"
          className="text-[10px] font-sans font-semibold fill-[#6B5145]"
        >
          Amplitude x
        </text>
        <text
          x={10}
          y={padding.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${padding.top + plotH / 2})`}
          className="text-[10px] font-sans font-semibold fill-[#6B5145]"
        >
          Density
        </text>
      </svg>
    </div>
  );
}

export function AutocorrelationChart({ autocorr, currentTau, timeColors }) {
  const width = 420;
  const height = 165;
  const padding = { top: 10, right: 16, bottom: 30, left: 42 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const tauMin = -300;
  const tauMax = 300;
  const rMin = -1.2;
  const rMax = 1.35;

  const getX = (tau) => padding.left + ((tau - tauMin) / (tauMax - tauMin)) * plotW;
  const getY = (r) => padding.top + (1 - (r - rMin) / (rMax - rMin)) * plotH;

  const { lags = [], rLags1 = [], rLags3 = [] } = autocorr || {};

  const path1 = lags
    .map(
      (tau, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${getX(tau).toFixed(1)} ${getY(rLags1[idx] || 0).toFixed(1)}`
    )
    .join(' ');

  const path3 = lags
    .map(
      (tau, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${getX(tau).toFixed(1)} ${getY(rLags3[idx] || 0).toFixed(1)}`
    )
    .join(' ');

  const currentTauClamped = Math.max(tauMin, Math.min(tauMax, currentTau || 0));
  const currentTauX = getX(currentTauClamped);

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#3B2923]">
          Autocorrelation R<sub>X</sub>(t, t+τ)
        </h4>
        <div className="flex items-center gap-3 text-[11px] text-[#6B5145]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5" style={{ backgroundColor: timeColors[0] }} />
            <span className="font-mono font-medium">R(t₁)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5" style={{ backgroundColor: timeColors[2] }} />
            <span className="font-mono font-medium">R(t₃)</span>
          </span>
          <span className="font-mono text-[#9A4324] font-semibold tabular-nums">
            τ = {currentTau} ms
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
        {[-1.0, 0, 1.0].map((yt) => {
          const yPos = getY(yt);
          return (
            <g key={`ayt-${yt}`}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={width - padding.right}
                y2={yPos}
                stroke="rgba(59,41,35,0.10)"
                strokeDasharray="2 3"
                strokeWidth={0.9}
              />
              <text
                x={padding.left - 6}
                y={yPos + 3.5}
                textAnchor="end"
                className="text-[10px] font-mono fill-[#6B5145]"
              >
                {yt.toFixed(1)}
              </text>
            </g>
          );
        })}

        {[-300, -150, 0, 150, 300].map((xt) => {
          const xp = getX(xt);
          return (
            <g key={`axt-${xt}`}>
              <line
                x1={xp}
                y1={padding.top}
                x2={xp}
                y2={height - padding.bottom}
                stroke="rgba(59,41,35,0.10)"
                strokeDasharray="2 3"
                strokeWidth={0.9}
              />
              <text
                x={xp}
                y={height - padding.bottom + 14}
                textAnchor="middle"
                className="text-[11px] font-mono font-semibold fill-[#3B2923]"
              >
                {xt}
              </text>
            </g>
          );
        })}

        {/* Zero horizontal reference */}
        <line
          x1={padding.left}
          y1={getY(0)}
          x2={width - padding.right}
          y2={getY(0)}
          stroke="rgba(59,41,35,0.28)"
          strokeWidth={0.9}
        />

        {/* L-Frame Axes */}
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

        <path
          d={path1}
          fill="none"
          stroke={timeColors[0]}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path3}
          fill="none"
          stroke={timeColors[2]}
          strokeWidth={1.5}
          strokeDasharray="3 2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <line
          x1={currentTauX}
          y1={padding.top}
          x2={currentTauX}
          y2={height - padding.bottom}
          stroke="#9A4324"
          strokeWidth={1.3}
          strokeDasharray="3 2.5"
        />

        <text
          x={padding.left + plotW / 2}
          y={height - 3}
          textAnchor="middle"
          className="text-[10px] font-sans font-semibold fill-[#6B5145]"
        >
          Lag τ (ms)
        </text>
        <text
          x={10}
          y={padding.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${padding.top + plotH / 2})`}
          className="text-[10px] font-sans font-semibold fill-[#6B5145]"
        >
          R_X(τ)
        </text>
      </svg>
    </div>
  );
}

export function SingleTimePdfChart({
  index,
  bins,
  bellCurve,
  color,
  mean = 0,
  variance = 1,
  sampleTime = 150,
}) {
  const width = 190;
  const height = 96;
  const padding = { top: 8, right: 8, bottom: 20, left: 24 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const yMax = 0.52;

  const getX = (x) => padding.left + ((x - PDF_MIN) / (PDF_MAX - PDF_MIN)) * plotW;
  const getY = (d) => padding.top + (1 - Math.min(yMax, Math.max(0, d)) / yMax) * plotH;
  const baseY = getY(0);
  const barW = Math.max(2, (BIN_WIDTH / (PDF_MAX - PDF_MIN)) * plotW - 1);

  const pdfKey = `pdf${index + 1}`;
  const bellPath = bellCurve
    .map(
      (pt, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${getX(pt.x).toFixed(1)} ${getY(pt.y).toFixed(1)}`
    )
    .join(' ');

  return (
    <div className="bg-[#F5F0EA]/60 border border-[#E4DBD2] rounded-lg p-2.5 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-semibold text-[#3B2923] flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 shrink-0" style={{ backgroundColor: color }} />
          <span>t{SUBSCRIPTS[index]} = {sampleTime}</span>
        </span>
        <span className="text-[10px] font-mono text-[#6B5145] tabular-nums">
          μ={mean.toFixed(1)} σ²={variance.toFixed(1)}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={baseY}
          stroke="rgba(59,41,35,0.45)"
          strokeWidth={0.9}
        />
        <line
          x1={padding.left}
          y1={baseY}
          x2={width - padding.right}
          y2={baseY}
          stroke="rgba(59,41,35,0.45)"
          strokeWidth={0.9}
        />

        {bins.map((b, bIdx) => {
          const yTop = getY(b[pdfKey] || 0);
          return (
            <rect
              key={`sb-${bIdx}`}
              x={getX(b.x - BIN_WIDTH / 2) + 0.5}
              y={yTop}
              width={barW}
              height={Math.max(0, baseY - yTop)}
              fill={color}
              fillOpacity={0.78}
              rx={0.8}
            />
          );
        })}

        <path
          d={bellPath}
          fill="none"
          stroke="#3B2923"
          strokeOpacity={0.75}
          strokeWidth={1.1}
          strokeDasharray="2 2"
        />

        {[-3, 0, 3].map((xt) => (
          <text
            key={`sxt-${xt}`}
            x={getX(xt)}
            y={height - 4}
            textAnchor="middle"
            className="text-[10px] font-mono font-semibold fill-[#3B2923]"
          >
            {xt}
          </text>
        ))}
      </svg>
    </div>
  );
}
