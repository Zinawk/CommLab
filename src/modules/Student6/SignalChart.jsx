import React, { useState, useMemo } from 'react';

/**
 * Clean white-card signal chart component for time series and autocorrelation plots.
 */
export default function SignalChart({
  title,
  xData,
  yData,
  color = '#0369A1',
  strokeWidth = 1.6,
  xUnit = 's',
  xLabel = 'Time (s)',
  yLabel = 'Amplitude',
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const width = 440;
  const height = 220;
  const padding = { top: 12, right: 18, bottom: 32, left: 50 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const xMin = xData.length > 0 ? xData[0] : 0;
  const xMax = xData.length > 0 ? xData[xData.length - 1] : 1;

  const { yMin, yMax, yTicks } = useMemo(() => {
    let actualMin = 0;
    let actualMax = 0;

    for (let i = 0; i < yData.length; i++) {
      if (yData[i] < actualMin) actualMin = yData[i];
      if (yData[i] > actualMax) actualMax = yData[i];
    }

    if (actualMax > 0.85 && actualMax <= 1.05 && actualMin >= -0.35) {
      const minTick = actualMin < -0.12 ? -0.2 : 0.0;
      const computedMin = Math.min(minTick - 0.08, actualMin - 0.04);
      const computedMax = 1.06;
      const ticks = [];
      for (let v = minTick; v <= 1.001; v += 0.2) {
        ticks.push(Number(v.toFixed(1)));
      }
      return { yMin: computedMin, yMax: computedMax, yTicks: ticks };
    }

    const span = Math.max(0.1, actualMax - actualMin);
    let computedMin = actualMin - span * 0.15;
    let computedMax = actualMax + span * 0.15;

    const totalSpan = computedMax - computedMin;
    const step = totalSpan <= 1.5 ? 0.25 : totalSpan <= 3 ? 0.5 : totalSpan <= 6 ? 1 : 2;

    computedMin = Math.floor(computedMin / step) * step;
    computedMax = Math.ceil(computedMax / step) * step;

    if (computedMin > 0) computedMin = 0;
    if (computedMax < 0) computedMax = 0;

    const ticks = [];
    for (let v = computedMin; v <= computedMax + 0.001; v += step) {
      ticks.push(Number(v.toFixed(2)));
    }

    return { yMin: computedMin, yMax: computedMax, yTicks: ticks };
  }, [yData]);

  const getX = (val) => padding.left + ((val - xMin) / (xMax - xMin || 1)) * plotWidth;
  const getY = (val) => padding.top + (1 - (val - yMin) / (yMax - yMin || 1)) * plotHeight;
  const zeroY = getY(0);

  const xTicks = useMemo(() => {
    const span = xMax - xMin;
    if (span <= 0) return [xMin];

    if (Math.abs(xMin + xMax) < 1e-6 && xMax >= 20) {
      const half = Math.round(xMax);
      let step = 50;
      if (half <= 60) step = 25;
      else if (half <= 150) step = 50;
      else if (half <= 220) step = 100;
      else step = 150;

      const ticks = [0];
      for (let v = step; v <= half; v += step) {
        ticks.unshift(-v);
        ticks.push(v);
      }
      if (ticks[0] > -half) ticks.unshift(-half);
      if (ticks[ticks.length - 1] < half) ticks.push(half);
      return ticks;
    }

    if (span >= 40) {
      const rawStep = span / 4;
      const niceSteps = [10, 20, 25, 50, 100, 150, 200, 250, 500];
      const step = niceSteps.find((s) => s >= rawStep * 0.9) || Math.round(rawStep);
      const start = Math.ceil(xMin / step) * step;
      const ticks = [];
      for (let v = start; v <= xMax + 0.001; v += step) {
        ticks.push(Math.round(v));
      }
      return ticks;
    }

    const ticks = [];
    const count = 4;
    const step = span / count;
    for (let i = 0; i <= count; i++) {
      ticks.push(Number((xMin + i * step).toFixed(2)));
    }
    return ticks;
  }, [xMin, xMax]);

  const pathD = useMemo(() => {
    if (!xData.length || !yData.length) return '';
    return xData
      .map((x, i) => `${i === 0 ? 'M' : 'L'} ${getX(x).toFixed(1)} ${getY(yData[i]).toFixed(1)}`)
      .join(' ');
  }, [xData, yData, yMin, yMax]);

  const hoveredX = hoverIndex !== null && xData[hoverIndex] !== undefined ? xData[hoverIndex] : null;
  const hoveredY = hoverIndex !== null && yData[hoverIndex] !== undefined ? yData[hoverIndex] : null;

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 min-h-[20px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-0.5 shrink-0" style={{ backgroundColor: color }} />
          <h3 className="text-sm font-semibold text-[#3B2923] truncate">{title}</h3>
        </div>
        {hoveredX !== null && hoveredY !== null && (
          <span className="text-xs font-mono text-[#9A4324] font-semibold tabular-nums shrink-0">
            {xMax - xMin >= 20 ? Math.round(hoveredX) : hoveredX.toFixed(2)} {xUnit} ·{' '}
            {hoveredY.toFixed(3)}
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
                  {Number.isInteger(Number((tickVal * 10).toFixed(4)))
                    ? tickVal.toFixed(1)
                    : tickVal.toFixed(2)}
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
                  {xMax - xMin >= 20 ? Math.round(tickVal) : tickVal.toFixed(2)}
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

          {/* Zero Horizontal Reference */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="rgba(59,41,35,0.28)"
            strokeWidth={0.9}
          />

          {/* Zero Vertical Lag Symmetry Reference */}
          {xMin < 0 && xMax > 0 && (
            <line
              x1={getX(0)}
              y1={padding.top}
              x2={getX(0)}
              y2={height - padding.bottom}
              stroke="rgba(59,41,35,0.28)"
              strokeDasharray="3 3"
              strokeWidth={0.9}
            />
          )}

          {/* Crisp Waveform Path */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Hover Point & Vertical Guide */}
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
          {xData.map((x, i) => (
            <rect
              key={`hit-${i}`}
              x={getX(x) - 4}
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
