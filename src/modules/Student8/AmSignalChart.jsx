import React, { useState, useMemo } from 'react';

/**
 * Clean white-card oscilloscope-style signal chart for AM signals.
 */
export default function AmSignalChart({
  title,
  subtitle,
  timeArray,
  series = [],
  referenceLines = [],
  dotColor = '#0369A1',
  xUnit = 's',
  xLabel = 'Time t (s)',
  yLabel = 'Amplitude (V)',
  legend = [],
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const width = 440;
  const height = 195;
  const padding = { top: 12, right: 18, bottom: 32, left: 48 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const numPoints = timeArray ? timeArray.length : 0;
  const xMin = numPoints > 0 ? timeArray[0] : 0;
  const xMax = numPoints > 0 ? timeArray[numPoints - 1] : 1;

  const { yMin, yMax, yTicks } = useMemo(() => {
    let minVal = 0;
    let maxVal = 0;

    series.forEach((s) => {
      if (!s.data) return;
      for (let i = 0; i < s.data.length; i++) {
        if (s.data[i] < minVal) minVal = s.data[i];
        if (s.data[i] > maxVal) maxVal = s.data[i];
      }
    });

    referenceLines.forEach((ref) => {
      if (ref.value < minVal) minVal = ref.value;
      if (ref.value > maxVal) maxVal = ref.value;
    });

    const peak = Math.max(0.6, Math.max(Math.abs(minVal), Math.abs(maxVal)));
    const headroom = peak * 1.15;
    const step = headroom <= 1.4 ? 0.5 : headroom <= 3.2 ? 1.0 : 1.5;

    const computedMax = Math.ceil(headroom / step) * step;
    const computedMin = -computedMax;

    const ticks = [];
    for (let v = computedMin; v <= computedMax + 0.001; v += step) {
      ticks.push(Number(v.toFixed(1)));
    }

    return { yMin: computedMin, yMax: computedMax, yTicks: ticks };
  }, [series, referenceLines]);

  const getX = (t) => padding.left + ((t - xMin) / (xMax - xMin || 1)) * plotWidth;
  const getY = (v) => padding.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotHeight;
  const zeroY = getY(0);

  const xTicks = useMemo(() => {
    const span = xMax - xMin;
    if (span >= 40) {
      const rawStep = span / 4;
      const niceSteps = [25, 50, 100, 150, 200];
      const step = niceSteps.find((s) => s >= rawStep * 0.9) || Math.round(rawStep);
      const ticks = [];
      for (let v = Math.ceil(xMin / step) * step; v <= xMax + 0.001; v += step) {
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

  const paths = useMemo(() => {
    if (!timeArray || numPoints === 0) return [];

    return series.map((s) => {
      if (!s.data || s.data.length === 0) return { ...s, d: '', areaD: '' };

      const step = Math.max(1, Math.floor(s.data.length / 450));
      const pts = [];
      for (let i = 0; i < s.data.length; i += step) {
        const x = getX(timeArray[i]);
        const y = getY(s.data[i]);
        pts.push(`${pts.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      if ((s.data.length - 1) % step !== 0) {
        const lastIdx = s.data.length - 1;
        pts.push(`L ${getX(timeArray[lastIdx]).toFixed(1)} ${getY(s.data[lastIdx]).toFixed(1)}`);
      }

      const lineD = pts.join(' ');
      let areaD = '';
      if (s.fillArea) {
        areaD = `${lineD} L ${getX(xMax).toFixed(1)} ${zeroY.toFixed(1)} L ${getX(xMin).toFixed(1)} ${zeroY.toFixed(1)} Z`;
      }

      return {
        ...s,
        d: lineD,
        areaD,
      };
    });
  }, [series, timeArray, numPoints, xMin, xMax, yMin, yMax, zeroY]);

  const hoveredTime =
    hoverIndex !== null && timeArray && timeArray[hoverIndex] !== undefined
      ? timeArray[hoverIndex]
      : null;

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col gap-3">
      {/* Title & Legend Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#3B2923] flex items-center gap-2">
            <span className="w-3 h-0.5 shrink-0" style={{ backgroundColor: dotColor }} />
            <span>{title}</span>
          </h3>
          {subtitle && <div className="text-xs text-[#6B5145]">{subtitle}</div>}
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {hoveredTime !== null && (
            <span className="font-mono font-semibold text-[#9A4324] tabular-nums">
              t = {hoveredTime.toFixed(1)} {xUnit}
            </span>
          )}
          {legend.length > 0 && (
            <div className="flex items-center gap-2.5">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    className="w-2.5 h-0.5 inline-block"
                    style={{
                      backgroundColor: item.color,
                      borderTop: item.dashed ? '1px dashed #6B5145' : 'none',
                    }}
                  />
                  <span className="text-[#6B5145] font-mono">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Plot */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none font-sans"
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
                  x={padding.left - 6}
                  y={yPos + 3.5}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-[#6B5145]"
                >
                  {tickVal.toFixed(1)}
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
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="rgba(59,41,35,0.45)"
            strokeWidth={1}
          />

          {/* Zero Voltage Axis Reference */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="rgba(59,41,35,0.28)"
            strokeWidth={0.9}
          />

          {/* Series Lines */}
          {paths.map((p, idx) => (
            <path
              key={p.name || idx}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={p.strokeWidth ? p.strokeWidth + 0.3 : 1.4}
              strokeDasharray={p.strokeDasharray}
              strokeOpacity={p.opacity || 1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Reference Lines */}
          {referenceLines.map((ref) => {
            const yPos = getY(ref.value);
            return (
              <g key={ref.label}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke={ref.color}
                  strokeDasharray="3 3"
                  strokeWidth={1.2}
                  strokeOpacity={0.85}
                />
                <text
                  x={width - padding.right + 3}
                  y={yPos + 3}
                  className="text-[9px] font-mono font-bold"
                  fill={ref.color}
                >
                  {ref.label}
                </text>
              </g>
            );
          })}

          {/* Interactive Hover Line */}
          {hoveredTime !== null && (
            <line
              x1={getX(hoveredTime)}
              y1={padding.top}
              x2={getX(hoveredTime)}
              y2={height - padding.bottom}
              stroke="rgba(59,41,35,0.35)"
              strokeDasharray="2 2"
              strokeWidth={1}
              pointerEvents="none"
            />
          )}

          {/* Transparent Hover Hit Columns */}
          {timeArray &&
            timeArray.length > 0 &&
            Array.from({ length: 30 }).map((_, i) => {
              const frac = i / 29;
              const idx = Math.min(timeArray.length - 1, Math.floor(frac * timeArray.length));
              const xVal = timeArray[idx];
              return (
                <rect
                  key={`hit-${i}`}
                  x={getX(xVal) - plotWidth / 60}
                  y={padding.top}
                  width={plotWidth / 30}
                  height={plotHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIndex(idx)}
                />
              );
            })}

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
