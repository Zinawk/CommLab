import React, { useMemo } from 'react';

/**
 * Clean white-card Time-Domain Waveform Chart for SSB-AM Signals
 */
export function SsbWaveformChart({
  title,
  points,
  valueKey,
  strokeColor,
  primaryLabel,
  compareKey = null,
  compareColor = '#B45309',
  compareLabel = 'Original',
  yBound: forcedYBound = null,
}) {
  const width = 420;
  const chartHeight = 185;
  const padding = { top: 12, right: 16, bottom: 30, left: 46 };
  const plotW = width - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;

  const yBound = useMemo(() => {
    if (forcedYBound) return forcedYBound;
    let peak = 1.0;
    for (let i = 0; i < points.length; i++) {
      peak = Math.max(peak, Math.abs(points[i][valueKey]));
      if (compareKey) peak = Math.max(peak, Math.abs(points[i][compareKey]));
    }
    const raw = peak * 1.15;
    const step = raw <= 2 ? 0.5 : 1;
    return Math.ceil(raw / step) * step;
  }, [points, valueKey, compareKey, forcedYBound]);

  const yTicks = [-yBound, 0, yBound];
  const maxIdx = Math.max(1, points.length - 1);
  const getX = (idx) => padding.left + (idx / maxIdx) * plotW;
  const getY = (val) => padding.top + (1 - (val + yBound) / (2 * yBound || 1)) * plotH;

  const { mainPath, cmpPath } = useMemo(() => {
    const main = points
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt[valueKey]).toFixed(1)}`
      )
      .join(' ');
    const cmp = compareKey
      ? points
          .map(
            (pt, i) =>
              `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt[compareKey]).toFixed(1)}`
          )
          .join(' ')
      : '';
    return { mainPath: main, cmpPath: cmp };
  }, [points, valueKey, compareKey, yBound, plotW, plotH, padding.left, padding.top]);

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-0.5 shrink-0" style={{ backgroundColor: strokeColor }} />
          <h3 className="text-sm font-semibold text-[#3B2923] truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-[#6B5145]">
          {compareKey && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5" style={{ backgroundColor: compareColor }} />
              <span>{compareLabel}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-2.5 h-0.5" style={{ backgroundColor: strokeColor }} />
            <span>{primaryLabel}</span>
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${chartHeight}`} className="w-full h-auto select-none">
        {yTicks.map((yt) => {
          const yPos = getY(yt);
          return (
            <g key={`yt-${yt}`}>
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

        {[
          { label: '0.0', x: padding.left, anchor: 'start' },
          { label: '0.5', x: padding.left + plotW / 2, anchor: 'middle' },
          { label: '1.0', x: width - padding.right, anchor: 'end' },
        ].map((tick) => (
          <g key={tick.label}>
            <line
              x1={tick.x}
              y1={padding.top}
              x2={tick.x}
              y2={chartHeight - padding.bottom}
              stroke="rgba(59,41,35,0.10)"
              strokeDasharray="2 3"
              strokeWidth={0.9}
            />
            <text
              x={tick.x}
              y={chartHeight - padding.bottom + 15}
              textAnchor={tick.anchor}
              className="text-[11px] font-mono font-semibold fill-[#3B2923]"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* Dark Brown L-Frame Axes & Zero Reference */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={chartHeight - padding.bottom}
          stroke="rgba(59,41,35,0.45)"
          strokeWidth={1}
        />
        <line
          x1={padding.left}
          y1={chartHeight - padding.bottom}
          x2={width - padding.right}
          y2={chartHeight - padding.bottom}
          stroke="rgba(59,41,35,0.45)"
          strokeWidth={1}
        />
        <line
          x1={padding.left}
          y1={getY(0)}
          x2={width - padding.right}
          y2={getY(0)}
          stroke="rgba(59,41,35,0.28)"
          strokeWidth={0.9}
        />

        {cmpPath && (
          <path
            d={cmpPath}
            fill="none"
            stroke={compareColor}
            strokeOpacity={0.85}
            strokeWidth={1.35}
            strokeDasharray="4 3"
            strokeLinejoin="round"
          />
        )}

        <path
          d={mainPath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.65}
          strokeLinejoin="round"
        />

        <text
          x={padding.left + plotW / 2}
          y={chartHeight - 3}
          textAnchor="middle"
          className="text-[10px] font-sans font-semibold fill-[#6B5145]"
        >
          Time t (s)
        </text>
        <text
          x={10}
          y={padding.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${padding.top + plotH / 2})`}
          className="text-[10px] font-sans font-semibold fill-[#6B5145]"
        >
          Amp (V)
        </text>
      </svg>
    </div>
  );
}

/**
 * Clean white-card AM Frequency Spectrum (USB & LSB + Bandpass Filter)
 */
export function SsbSpectrumChart({
  title,
  peaks,
  fc,
  fMax,
  filterWindow = null,
  accentColor = '#0369A1',
  wide = false,
}) {
  const width = wide ? 760 : 420;
  const height = 195;
  const padding = { top: 20, right: 20, bottom: 32, left: 48 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const yMax = useMemo(() => {
    let peak = 1.0;
    for (let i = 0; i < peaks.length; i++) peak = Math.max(peak, peaks[i].amp);
    const padded = peak * 1.3;
    return Math.ceil(padded * 2) / 2;
  }, [peaks]);

  const yTicks = [0, yMax / 2, yMax];
  const getX = (f) => padding.left + (Math.min(fMax, Math.max(0, f)) / fMax) * plotW;
  const getY = (a) => padding.top + (1 - Math.min(yMax, Math.max(0, a)) / yMax) * plotH;
  const baseY = getY(0);
  const fTicks = [0, 10, 20, 30];

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 shrink-0" style={{ backgroundColor: accentColor }} />
          <h3 className="text-sm font-semibold text-[#3B2923]">{title}</h3>
        </div>
        {filterWindow && (
          <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#0369A1]">
            <span className="inline-block w-3 h-2.5 rounded-xs bg-[#0369A1]/15 border border-[#0369A1]/60" />
            <span>{filterWindow.label}</span>
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
        {yTicks.map((yt) => {
          const yPos = getY(yt);
          return (
            <g key={`spec-yt-${yt}`}>
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

        {fTicks.map((ft) => {
          const xp = getX(ft);
          return (
            <g key={`spec-xt-${ft}`}>
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
                y={height - padding.bottom + 15}
                textAnchor="middle"
                className="text-[11px] font-mono font-semibold fill-[#3B2923]"
              >
                {ft}
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

        {/* Bandpass Filter Window */}
        {filterWindow && (
          <rect
            x={getX(filterWindow.low)}
            y={padding.top}
            width={Math.max(4, getX(filterWindow.high) - getX(filterWindow.low))}
            height={plotH}
            fill={accentColor}
            fillOpacity={0.12}
            stroke={accentColor}
            strokeOpacity={0.65}
            strokeDasharray="3 2.5"
            strokeWidth={1.2}
            rx={2}
          />
        )}

        {/* Carrier Reference */}
        <line
          x1={getX(fc)}
          y1={padding.top}
          x2={getX(fc)}
          y2={baseY}
          stroke="rgba(59,41,35,0.38)"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <text
          x={getX(fc)}
          y={padding.top - 5}
          textAnchor="middle"
          className="text-[10px] font-mono font-semibold fill-[#6B5145]"
        >
          fc = {fc} Hz
        </text>

        {/* Sidebands */}
        {peaks.map((pk) => {
          const px = getX(pk.freq);
          const py = getY(pk.amp);
          const color = pk.active ? accentColor : '#BE123C';
          const isDual = peaks.length > 1;
          const anchor = !isDual ? 'middle' : pk.label === 'LSB' ? 'end' : 'start';
          const labelX = !isDual ? px : pk.label === 'LSB' ? px - 6 : px + 6;
          return (
            <g key={`${pk.label}-${pk.freq}`}>
              <line
                x1={px}
                y1={baseY}
                x2={px}
                y2={py}
                stroke={color}
                strokeWidth={pk.active ? 2.6 : 1.75}
                strokeDasharray={pk.active ? undefined : '3 2.5'}
                strokeLinecap="round"
                opacity={pk.active ? 1 : 0.7}
              />
              <circle cx={px} cy={py} r={pk.active ? 3.5 : 2.8} fill={color} />
              <text
                x={labelX}
                y={Math.max(padding.top + 10, py - 6)}
                textAnchor={anchor}
                className="text-[10px] font-mono font-semibold fill-[#3B2923]"
              >
                {pk.label} ({pk.freq.toFixed(1)})
              </text>
            </g>
          );
        })}

        <text
          x={padding.left + plotW / 2}
          y={height - 3}
          textAnchor="middle"
          className="text-[10px] font-sans font-semibold fill-[#6B5145]"
        >
          Frequency f (Hz)
        </text>
        <text
          x={11}
          y={padding.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 11 ${padding.top + plotH / 2})`}
          className="text-[10px] font-sans font-semibold fill-[#6B5145]"
        >
          Mag
        </text>
      </svg>
    </div>
  );
}
