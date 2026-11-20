import React, { useState, useMemo } from 'react';

/**
 * Clean white-card SVG chart for Power Spectral Density (PSD).
 */
export default function PsdChart({
  title = 'Power Spectral Density (PSD)',
  frequencies = [],
  psdData = [],
  theoData = null,
  isDbScale = false,
  peakFreq = null,
  color = '#C2410C',
  xLabel = 'Frequency f (Hz)',
  yLabel = isDbScale ? 'PSD S_X(f) (dB/Hz)' : 'PSD S_X(f) (V²/Hz)',
  showTheoretical = true,
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const width = 440;
  const height = 220;
  const padding = { top: 12, right: 18, bottom: 32, left: 52 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const xMin = frequencies.length > 0 ? frequencies[0] : 0;
  const xMax = frequencies.length > 0 ? frequencies[frequencies.length - 1] : 125;

  const { yMin, yMax, yTicks } = useMemo(() => {
    if (!psdData || psdData.length === 0) {
      return { yMin: 0, yMax: 1, yTicks: [0, 0.5, 1.0] };
    }

    let actualMin = Infinity;
    let actualMax = -Infinity;

    for (let i = 0; i < psdData.length; i++) {
      const v = psdData[i];
      if (Number.isFinite(v)) {
        if (v < actualMin) actualMin = v;
        if (v > actualMax) actualMax = v;
      }
    }

    if (showTheoretical && theoData && theoData.length) {
      for (let i = 0; i < theoData.length; i++) {
        const v = theoData[i];
        if (Number.isFinite(v)) {
          if (v < actualMin) actualMin = v;
          if (v > actualMax) actualMax = v;
        }
      }
    }

    if (!Number.isFinite(actualMin) || !Number.isFinite(actualMax)) {
      return { yMin: 0, yMax: 1, yTicks: [0, 0.5, 1.0] };
    }

    if (isDbScale) {
      const minBound = Math.floor((actualMin - 4) / 10) * 10;
      const maxBound = Math.ceil((actualMax + 4) / 10) * 10;
      const ticks = [];
      const step = Math.max(10, Math.round((maxBound - minBound) / 4));
      for (let val = minBound; val <= maxBound; val += step) {
        ticks.push(val);
      }
      return { yMin: minBound, yMax: maxBound, yTicks: ticks };
    } else {
      const maxHead = Math.max(1e-5, actualMax * 1.15);
      const niceSteps = [
        0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005,
        0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0,
      ];
      const rawStep = maxHead / 4;
      const step = niceSteps.find((s) => s >= rawStep * 0.95) || Math.ceil(rawStep);

      const computedMax = Math.max(step * 3, Math.ceil(maxHead / step) * step);
      const ticks = [];
      for (let val = 0; val <= computedMax + step * 0.01; val += step) {
        ticks.push(Number(val.toFixed(5)));
      }
      return { yMin: 0, yMax: computedMax, yTicks: ticks };
    }
  }, [psdData, theoData, showTheoretical, isDbScale]);

  const getX = (val) => padding.left + ((val - xMin) / (xMax - xMin || 1)) * plotWidth;
  const getY = (val) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return padding.top + (1 - (clamped - yMin) / (yMax - yMin || 1)) * plotHeight;
  };
  const zeroY = getY(0);

  const xTicks = useMemo(() => {
    const span = xMax - xMin;
    if (span <= 0) return [0];
    const rawStep = span / 4;
    const niceSteps = [25, 50, 100, 125, 200, 250];
    const step = niceSteps.find((s) => s >= rawStep * 0.9) || Math.round(rawStep);
    const ticks = [];
    for (let v = Math.ceil(xMin / step) * step; v <= xMax + 0.001; v += step) {
      ticks.push(Math.round(v));
    }
    return ticks;
  }, [xMin, xMax]);

  const { pathD, areaD } = useMemo(() => {
    if (!frequencies.length || !psdData.length) {
      return { pathD: '', areaD: '' };
    }

    const pts = frequencies.map((f, i) => {
      const x = getX(f).toFixed(1);
      const y = getY(psdData[i] || 0).toFixed(1);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    const lineStr = pts.join(' ');
    const baselineY = isDbScale ? getY(yMin).toFixed(1) : zeroY.toFixed(1);
    const areaStr = `${lineStr} L ${getX(xMax).toFixed(1)} ${baselineY} L ${getX(xMin).toFixed(1)} ${baselineY} Z`;

    return { pathD: lineStr, areaD: areaStr };
  }, [frequencies, psdData, yMin, yMax, isDbScale]);

  const hoveredX = hoverIndex !== null && frequencies[hoverIndex] !== undefined ? frequencies[hoverIndex] : null;
  const hoveredY = hoverIndex !== null && psdData[hoverIndex] !== undefined ? psdData[hoverIndex] : null;

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 min-h-[20px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-0.5 shrink-0" style={{ backgroundColor: color }} />
          <h3 className="text-sm font-semibold text-[#3B2923] truncate">{title}</h3>
        </div>

        {hoveredX !== null && hoveredY !== null && (
          <span className="text-xs font-mono text-[#9A4324] font-semibold tabular-nums shrink-0">
            {hoveredX.toFixed(0)} Hz · {hoveredY < 0.01 ? hoveredY.toFixed(4) : hoveredY.toFixed(3)}{' '}
            {isDbScale ? 'dB/Hz' : 'V²/Hz'}
          </span>
        )}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Y Gridlines & Ticks */}
          {yTicks.map((tickVal) => {
            const yPos = getY(tickVal);
            return (
              <g key={`y-${tickVal}`}>
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
                  x={padding.left - 7}
                  y={yPos + 3.5}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-[#6B5145]"
                >
                  {isDbScale
                    ? `${tickVal}`
                    : yMax >= 1
                    ? tickVal.toFixed(1)
                    : yMax >= 0.05
                    ? tickVal.toFixed(2)
                    : yMax >= 0.005
                    ? tickVal.toFixed(3)
                    : tickVal.toFixed(4)}
                </text>
              </g>
            );
          })}

          {/* X Gridlines & Ticks */}
          {xTicks.map((tickVal) => {
            const xPos = getX(tickVal);
            return (
              <g key={`x-${tickVal}`}>
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
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Dark Brown Axes */}
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
            y1={isDbScale ? getY(yMin) : zeroY}
            x2={width - padding.right}
            y2={isDbScale ? getY(yMin) : zeroY}
            stroke="rgba(59,41,35,0.45)"
            strokeWidth={1}
          />

          {/* Subtle Area Fill + Crisp PSD Curve */}
          {areaD && <path d={areaD} fill={color} fillOpacity={0.1} />}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Hover Point & Crosshair Guide */}
          {hoveredX !== null && hoveredY !== null && (
            <g pointerEvents="none">
              <line
                x1={getX(hoveredX)}
                y1={padding.top}
                x2={getX(hoveredX)}
                y2={height - padding.bottom}
                stroke="rgba(59,41,35,0.35)"
                strokeDasharray="2 2"
                strokeWidth={1}
              />
              <circle
                cx={getX(hoveredX)}
                cy={getY(hoveredY)}
                r={4}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth={2}
              />
            </g>
          )}

          {/* Transparent Hover Hit Columns */}
          {frequencies.map((f, i) => (
            <rect
              key={`hit-${i}`}
              x={getX(f) - 4}
              y={padding.top}
              width={8}
              height={plotHeight}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}

          {/* Axis Labels */}
          <text
            x={(padding.left + width - padding.right) / 2}
            y={height - 3}
            textAnchor="middle"
            className="text-[10px] font-sans font-semibold fill-[#6B5145]"
          >
            {xLabel}
          </text>
          <text
            x={10}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 10 ${padding.top + plotHeight / 2})`}
            className="text-[10px] font-sans font-semibold fill-[#6B5145]"
          >
            {yLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}
