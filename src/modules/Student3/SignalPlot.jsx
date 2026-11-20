import React, { useState, useMemo } from 'react';

/**
 * Light-canvas SignalPlot with dark brown axes, readable gridlines, and crisp stems/curves.
 */
export default function SignalPlot({
  title,
  data = [],
  color = '#0369A1',
  yLabel = '',
  mode = 'discrete',
  selectedSample = null,
  onSelectSample = null,
  xRange = null,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const isContinuous = mode === 'continuous';
  const varSymbol = isContinuous ? 't' : 'n';

  const width = 440;
  const height = 225;
  const padding = { top: 14, right: 18, bottom: 36, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const rawXMin = data.length > 0 ? data[0].n : -5;
  const rawXMax = data.length > 0 ? data[data.length - 1].n : 35;
  const activeXMin = xRange ? xRange[0] : rawXMin;
  const activeXMax = xRange ? xRange[1] : rawXMax;

  const visibleData = useMemo(
    () => data.filter((d) => d.n >= activeXMin - 0.5 && d.n <= activeXMax + 0.5),
    [data, activeXMin, activeXMax]
  );

  const { yMin, yMax, yTicks } = useMemo(() => {
    let actualMin = 0;
    let actualMax = 0;
    const source = visibleData.length > 0 ? visibleData : data;
    source.forEach((d) => {
      if (d.val < actualMin) actualMin = d.val;
      if (d.val > actualMax) actualMax = d.val;
    });

    let computedMin = Math.min(actualMin, -0.2);
    let computedMax = Math.max(actualMax, 1.1);
    computedMin = Math.floor(computedMin * 1.15 * 2) / 2;
    computedMax = Math.ceil(computedMax * 1.15 * 2) / 2;
    if (computedMin > 0) computedMin = 0;
    if (computedMax < 0) computedMax = 0;

    const span = computedMax - computedMin;
    const step = span <= 1.5 ? 0.5 : span <= 4 ? 1 : 2;
    const ticks = [];
    for (let v = computedMin; v <= computedMax + 0.001; v += step) {
      ticks.push(Number(v.toFixed(1)));
    }
    return { yMin: computedMin, yMax: computedMax, yTicks: ticks };
  }, [data, visibleData]);

  const getX = (n) =>
    padding.left + ((n - activeXMin) / Math.max(0.1, activeXMax - activeXMin)) * plotWidth;
  const getY = (val) =>
    padding.top + (1 - (val - yMin) / Math.max(0.1, yMax - yMin)) * plotHeight;
  const zeroY = getY(0);

  const xTicks = useMemo(() => {
    const ticks = [];
    const span = activeXMax - activeXMin;
    const step = span > 25 ? 10 : span > 10 ? 5 : 2;
    const start = Math.ceil(activeXMin / step) * step;
    for (let n = start; n <= activeXMax; n += step) {
      ticks.push(Number(n.toFixed(0)));
    }
    return ticks;
  }, [activeXMin, activeXMax]);

  const continuousPath = useMemo(() => {
    if (!data || data.length === 0) return '';
    const pts = data.filter((d) => d.n >= activeXMin - 1 && d.n <= activeXMax + 1);
    if (pts.length === 0) return '';
    return pts
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.n).toFixed(1)} ${getY(d.val).toFixed(1)}`)
      .join(' ');
  }, [data, activeXMin, activeXMax, yMin, yMax]);

  const selectedPoint = useMemo(() => {
    if (selectedSample === null) return null;
    return data.find((d) => Math.abs(d.n - selectedSample) < (isContinuous ? 0.1 : 0.5));
  }, [data, selectedSample, isContinuous]);

  const cleanClipId = `s3-clip-${title.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <h4 className="text-sm font-bold text-[#3B2923] truncate">{title}</h4>
        {hoveredPoint ? (
          <span className="text-xs font-mono text-[#3B2923] font-semibold shrink-0 tabular-nums">
            {varSymbol}={hoveredPoint.n.toFixed(isContinuous ? 1 : 0)}, {hoveredPoint.val.toFixed(2)}
          </span>
        ) : selectedPoint ? (
          <span className="text-xs font-mono text-[#9A4324] font-semibold shrink-0 tabular-nums">
            {varSymbol}={selectedSample}: {selectedPoint.val.toFixed(2)}
          </span>
        ) : null}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <clipPath id={cleanClipId}>
              <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>

          {yTicks.map((tickVal) => {
            const yPos = getY(tickVal);
            return (
              <g key={`y-${tickVal}`}>
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
                  x={padding.left - 7}
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

          {xTicks.map((tickVal) => {
            const xPos = getX(tickVal);
            if (xPos < padding.left - 1 || xPos > width - padding.right + 1) return null;
            return (
              <g key={`x-${tickVal}`}>
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
                  y={height - padding.bottom + 15}
                  textAnchor="middle"
                  fill="#3B2923"
                  className="text-[11px] font-mono font-semibold tabular-nums"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Axis Borders & Zero Reference */}
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

          {selectedSample !== null && (
            <line
              x1={getX(selectedSample)}
              y1={padding.top}
              x2={getX(selectedSample)}
              y2={height - padding.bottom}
              stroke="#9A4324"
              strokeOpacity={0.55}
              strokeWidth={1.1}
              strokeDasharray="3 2"
            />
          )}

          <g clipPath={`url(#${cleanClipId})`}>
            {isContinuous ? (
              <g>
                <path
                  d={continuousPath}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {selectedPoint && (
                  <circle
                    cx={getX(selectedPoint.n)}
                    cy={getY(selectedPoint.val)}
                    r={4}
                    fill="#FFFFFF"
                    stroke="#9A4324"
                    strokeWidth={2}
                  />
                )}
                {visibleData.map((d) => (
                  <rect
                    key={`track-${d.n}`}
                    x={getX(d.n) - 3}
                    y={padding.top}
                    width={6}
                    height={plotHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(d)}
                    onClick={() => onSelectSample && onSelectSample(Math.round(d.n))}
                  />
                ))}
              </g>
            ) : (
              visibleData.map((d) => {
                const xPos = getX(d.n);
                const yPos = getY(d.val);
                const isSelected = selectedSample === d.n;
                return (
                  <g
                    key={`stem-${d.n}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(d)}
                    onClick={() => onSelectSample && onSelectSample(d.n)}
                  >
                    <line
                      x1={xPos}
                      y1={zeroY}
                      x2={xPos}
                      y2={yPos}
                      stroke={isSelected ? '#9A4324' : color}
                      strokeWidth={isSelected ? 2.4 : 1.7}
                    />
                    <circle
                      cx={xPos}
                      cy={yPos}
                      r={isSelected ? 4 : 2.8}
                      fill={isSelected ? '#9A4324' : color}
                    />
                    <rect
                      x={xPos - 5}
                      y={padding.top}
                      width={10}
                      height={plotHeight}
                      fill="transparent"
                    />
                  </g>
                );
              })
            )}
          </g>

          <text
            x={(padding.left + width - padding.right) / 2}
            y={height - 4}
            textAnchor="middle"
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            {isContinuous ? 'Time t' : 'Sample n'}
          </text>
          <text
            x={12}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 12 ${padding.top + plotHeight / 2})`}
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
