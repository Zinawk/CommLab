import React, { useState, useMemo, useRef, useCallback } from 'react';

function computeYScale(values, minFloor = -0.5, maxCeil = 1.2) {
  let actualMin = 0;
  let actualMax = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < actualMin) actualMin = v;
    if (v > actualMax) actualMax = v;
  }

  let low = Math.min(actualMin * 1.18, minFloor);
  let high = Math.max(actualMax * 1.18, maxCeil);

  if (low > -0.1 && actualMin >= 0) low = -0.25;
  if (high < 0.25) high = 1.0;

  const rawSpan = high - low;
  const step =
    rawSpan <= 1.6
      ? 0.5
      : rawSpan <= 3.2
      ? 1.0
      : rawSpan <= 7
      ? 2.0
      : rawSpan <= 14
      ? 3.0
      : 5.0;

  const yMin = Math.floor(low / step) * step;
  const yMax = Math.ceil(high / step) * step;

  const ticks = [];
  for (let v = yMin; v <= yMax + 1e-6; v += step) {
    ticks.push(Number(v.toFixed(2)));
  }

  return { yMin, yMax, yTicks: ticks, step };
}

function ImpulseArrow({ x, zeroY, y, color, label, dashed = false }) {
  const isUp = y <= zeroY;
  const tipY = y;
  const arrowSize = 4.5;
  const points = isUp
    ? `${x},${tipY} ${x - arrowSize * 0.75},${tipY + arrowSize * 1.3} ${x + arrowSize * 0.75},${tipY + arrowSize * 1.3}`
    : `${x},${tipY} ${x - arrowSize * 0.75},${tipY - arrowSize * 1.3} ${x + arrowSize * 0.75},${tipY - arrowSize * 1.3}`;

  return (
    <g>
      <line
        x1={x}
        y1={zeroY}
        x2={x}
        y2={tipY}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dashed ? '4 2.5' : undefined}
      />
      <polygon points={points} fill={color} />
      {label && (
        <text
          x={x + 5}
          y={isUp ? tipY + 4 : tipY - 3}
          className="text-[10px] font-mono font-semibold"
          fill={color}
        >
          {label}
        </text>
      )}
    </g>
  );
}

/**
 * Light-canvas continuous-time waveform plot inside clean bordered card.
 */
export function TimeSignalPlot({
  title,
  points,
  impulses = [],
  color = '#0369A1',
  xLabel = 'Time t (s)',
  yLabel = 'Amplitude',
  unit = '',
  highlightTime = null,
  highlightValue = null,
  currentIndicator = null,
  compact = false,
  primaryLabel = null,
  extraSeries = [],
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const width = 460;
  const height = compact ? 195 : 230;
  const padding = { top: 14, right: 18, bottom: 36, left: 48 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const xMin = points.length > 0 ? points[0].t : -4;
  const xMax = points.length > 0 ? points[points.length - 1].t : 16;

  const { yMin, yMax, yTicks, step } = useMemo(() => {
    const vals = points.map((p) => p.val);
    impulses.forEach((imp) => vals.push(imp.weight));
    extraSeries.forEach((s) => {
      if (Array.isArray(s.points)) {
        for (let i = 0; i < s.points.length; i++) vals.push(s.points[i].val);
      }
      if (Array.isArray(s.impulses)) {
        s.impulses.forEach((imp) => vals.push(imp.weight));
      }
    });
    if (typeof highlightValue === 'number') vals.push(highlightValue);
    return computeYScale(vals, -0.3, 1.2);
  }, [points, impulses, extraSeries, highlightValue]);

  const getX = useCallback(
    (t) => padding.left + ((t - xMin) / (xMax - xMin || 1)) * plotW,
    [xMin, xMax, plotW, padding.left]
  );
  const getY = useCallback(
    (v) => padding.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH,
    [yMin, yMax, plotH, padding.top]
  );
  const zeroY = getY(0);

  const xTicks = useMemo(() => {
    const ticks = [];
    const span = xMax - xMin;
    const tickStep = span <= 12 ? 2 : 4;
    for (let t = Math.ceil(xMin / tickStep) * tickStep; t <= xMax + 1e-6; t += tickStep) {
      ticks.push(Number(t.toFixed(1)));
    }
    return ticks;
  }, [xMin, xMax]);

  const { linePath, activeAreaPath } = useMemo(() => {
    if (!points.length) return { linePath: '', activeAreaPath: '' };

    const coords = points.map(
      (p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.t).toFixed(1)} ${getY(p.val).toFixed(1)}`
    );
    const fullLine = coords.join(' ');

    let partialArea = '';
    if (typeof highlightTime === 'number') {
      const subPts = points.filter((p) => p.t <= highlightTime + 1e-6);
      if (subPts.length >= 2) {
        const subCoords = subPts
          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.t).toFixed(1)} ${getY(p.val).toFixed(1)}`)
          .join(' ');
        const lastT = subPts[subPts.length - 1].t;
        partialArea = `${subCoords} L ${getX(lastT).toFixed(1)} ${zeroY.toFixed(1)} L ${getX(subPts[0].t).toFixed(1)} ${zeroY.toFixed(1)} Z`;
      }
    }

    return { linePath: fullLine, activeAreaPath: partialArea };
  }, [points, getX, getY, zeroY, highlightTime]);

  const extraPaths = useMemo(() => {
    return extraSeries.map((s) => {
      if (!Array.isArray(s.points) || s.points.length === 0) return '';
      return s.points
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.t).toFixed(1)} ${getY(p.val).toFixed(1)}`)
        .join(' ');
    });
  }, [extraSeries, getX, getY]);

  const handleMouseMove = (e) => {
    if (!svgRef.current || !points.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const svgX = (e.clientX - rect.left) * scaleX;
    const ratio = (svgX - padding.left) / plotW;
    if (ratio < 0 || ratio > 1) {
      setHoverIdx(null);
      return;
    }
    const idx = Math.round(ratio * (points.length - 1));
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  };

  const hoveredPt = hoverIdx !== null ? points[hoverIdx] : null;
  const decimals = step < 0.5 ? 2 : 1;

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <h4 className="text-sm font-bold text-[#3B2923] truncate">{title}</h4>

        {hoveredPt ? (
          <span className="text-xs font-mono tabular-nums text-[#3B2923] font-semibold">
            {hoveredPt.t.toFixed(1)}s, {hoveredPt.val.toFixed(2)}{unit ? unit : ''}
          </span>
        ) : typeof currentIndicator === 'string' ? (
          <span className="text-xs font-mono tabular-nums text-[#9A4324] font-semibold">
            {currentIndicator}
          </span>
        ) : extraSeries.length > 0 ? (
          <div className="flex items-center gap-2.5 text-[11px] text-[#6B5145] font-mono">
            {primaryLabel && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: color }} />
                <span>{primaryLabel}</span>
              </span>
            )}
            {extraSeries.map((s, idx) => (
              <span key={`leg-${idx}`} className="flex items-center gap-1">
                <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: s.color }} />
                <span>{s.label}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* SVG Plot */}
      <div className="w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {yTicks.map((tick) => {
            const yPos = getY(tick);
            return (
              <g key={`yt-${tick}`}>
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
                  {tick.toFixed(decimals)}
                </text>
              </g>
            );
          })}

          {xTicks.map((tick) => {
            const xPos = getX(tick);
            return (
              <g key={`xt-${tick}`}>
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
                  {tick}
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

          {activeAreaPath && <path d={activeAreaPath} fill={color} fillOpacity={0.14} />}

          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {extraSeries.map((s, sIdx) => (
            <g key={`es-${sIdx}`}>
              {extraPaths[sIdx] && (
                <path
                  d={extraPaths[sIdx]}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1.8}
                  strokeDasharray={s.dashed ? '4 3' : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {(s.impulses || []).map((imp, impIdx) => {
                if (imp.t < xMin || imp.t > xMax) return null;
                return (
                  <ImpulseArrow
                    key={`es-imp-${sIdx}-${impIdx}`}
                    x={getX(imp.t)}
                    zeroY={zeroY}
                    y={getY(imp.weight)}
                    color={s.color}
                    dashed={Boolean(s.dashed)}
                    label={`(${imp.weight.toFixed(1)})`}
                  />
                );
              })}
            </g>
          ))}

          {impulses.map((imp, idx) => {
            if (imp.t < xMin || imp.t > xMax) return null;
            return (
              <ImpulseArrow
                key={`imp-${idx}`}
                x={getX(imp.t)}
                zeroY={zeroY}
                y={getY(imp.weight)}
                color={color}
                label={`(${imp.weight.toFixed(1)})`}
              />
            );
          })}

          {typeof highlightTime === 'number' &&
            highlightTime >= xMin &&
            highlightTime <= xMax && (
              <g pointerEvents="none">
                <line
                  x1={getX(highlightTime)}
                  y1={padding.top}
                  x2={getX(highlightTime)}
                  y2={height - padding.bottom}
                  stroke="#9A4324"
                  strokeOpacity={0.65}
                  strokeDasharray="3 2.5"
                  strokeWidth={1.2}
                />
                {typeof highlightValue === 'number' && (
                  <circle
                    cx={getX(highlightTime)}
                    cy={getY(highlightValue)}
                    r={4}
                    fill="#FFFFFF"
                    stroke={color}
                    strokeWidth={2}
                  />
                )}
              </g>
            )}

          {hoveredPt && (
            <g pointerEvents="none">
              <line
                x1={getX(hoveredPt.t)}
                y1={padding.top}
                x2={getX(hoveredPt.t)}
                y2={height - padding.bottom}
                stroke="rgba(59, 41, 35, 0.35)"
                strokeDasharray="2 2"
                strokeWidth={1}
              />
              <circle
                cx={getX(hoveredPt.t)}
                cy={getY(hoveredPt.val)}
                r={4}
                fill="#FFFFFF"
                stroke="#9A4324"
                strokeWidth={2}
              />
            </g>
          )}

          <text
            x={(padding.left + width - padding.right) / 2}
            y={height - 4}
            textAnchor="middle"
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            {xLabel}
          </text>
          <text
            x={12}
            y={padding.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 12 ${padding.top + plotH / 2})`}
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
 * Light-canvas Integrand Overlap Plot (τ-domain).
 */
export function IntegrandOverlapPlot({
  tauData,
  xImpulses = [],
  hFlippedImpulses = [],
  evalTime,
  onSelectTime,
  compact = false,
}) {
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const width = 460;
  const height = compact ? 195 : 230;
  const padding = { top: 14, right: 18, bottom: 36, left: 48 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const tauMin = tauData.length > 0 ? tauData[0].tau : -4;
  const tauMax = tauData.length > 0 ? tauData[tauData.length - 1].tau : 16;

  const { yMin, yMax, yTicks, step } = useMemo(() => {
    const vals = [];
    for (let i = 0; i < tauData.length; i++) {
      vals.push(tauData[i].xVal, tauData[i].hFlippedVal, tauData[i].prodVal);
    }
    xImpulses.forEach((imp) => vals.push(imp.weight));
    hFlippedImpulses.forEach((imp) => vals.push(imp.weight));
    return computeYScale(vals, -0.3, 1.2);
  }, [tauData, xImpulses, hFlippedImpulses]);

  const getX = useCallback(
    (tau) => padding.left + ((tau - tauMin) / (tauMax - tauMin || 1)) * plotW,
    [tauMin, tauMax, plotW, padding.left]
  );
  const getY = useCallback(
    (v) => padding.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH,
    [yMin, yMax, plotH, padding.top]
  );
  const zeroY = getY(0);

  const tauTicks = useMemo(() => {
    const ticks = [];
    for (let tau = Math.ceil(tauMin / 4) * 4; tau <= tauMax + 1e-6; tau += 4) {
      ticks.push(tau);
    }
    return ticks;
  }, [tauMin, tauMax]);

  const { xPath, hPath, prodPath, prodArea } = useMemo(() => {
    if (!tauData.length) return { xPath: '', hPath: '', prodPath: '', prodArea: '' };

    const xPts = [];
    const hPts = [];
    const pPts = [];

    for (let i = 0; i < tauData.length; i++) {
      const cmd = i === 0 ? 'M' : 'L';
      const xp = getX(tauData[i].tau).toFixed(1);
      xPts.push(`${cmd} ${xp} ${getY(tauData[i].xVal).toFixed(1)}`);
      hPts.push(`${cmd} ${xp} ${getY(tauData[i].hFlippedVal).toFixed(1)}`);
      pPts.push(`${cmd} ${xp} ${getY(tauData[i].prodVal).toFixed(1)}`);
    }

    const pLine = pPts.join(' ');
    const pFill = `${pLine} L ${getX(tauMax).toFixed(1)} ${zeroY.toFixed(1)} L ${getX(tauMin).toFixed(1)} ${zeroY.toFixed(1)} Z`;

    return {
      xPath: xPts.join(' '),
      hPath: hPts.join(' '),
      prodPath: pLine,
      prodArea: pFill,
    };
  }, [tauData, getX, getY, tauMin, tauMax, zeroY]);

  const scrubFromClientX = (clientX) => {
    if (!svgRef.current || !onSelectTime) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const svgX = (clientX - rect.left) * scaleX;
    const ratio = Math.max(0, Math.min(1, (svgX - padding.left) / plotW));
    const newT = Math.round((tauMin + ratio * (tauMax - tauMin)) * 10) / 10;
    onSelectTime(newT);
  };

  const decimals = step < 0.5 ? 2 : 1;

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <h4 className="text-sm font-bold text-[#3B2923]">Overlap Product g(τ)</h4>

        <div className="flex items-center gap-2.5 text-[11px] text-[#6B5145] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-[#0369A1] inline-block" />
            <span>x(τ)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t border-dashed border-[#C2410C] inline-block" />
            <span>h(t−τ)</span>
          </span>
          <span className="text-[#9A4324] font-semibold tabular-nums">t={evalTime.toFixed(1)}s</span>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none cursor-ew-resize touch-none"
          onMouseDown={(e) => {
            setIsDragging(true);
            scrubFromClientX(e.clientX);
          }}
          onMouseMove={(e) => {
            if (isDragging) scrubFromClientX(e.clientX);
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={(e) => {
            if (e.touches[0]) scrubFromClientX(e.touches[0].clientX);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) scrubFromClientX(e.touches[0].clientX);
          }}
        >
          {yTicks.map((tick) => {
            const yPos = getY(tick);
            return (
              <g key={`iyt-${tick}`}>
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
                  {tick.toFixed(decimals)}
                </text>
              </g>
            );
          })}

          {tauTicks.map((tick) => {
            const xPos = getX(tick);
            return (
              <g key={`ixt-${tick}`}>
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
                  {tick}
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

          <path d={prodArea} fill="#7E22CE" fillOpacity={0.18} />
          <path
            d={prodPath}
            fill="none"
            stroke="#7E22CE"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={xPath}
            fill="none"
            stroke="#0369A1"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={hPath}
            fill="none"
            stroke="#C2410C"
            strokeWidth={1.8}
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {xImpulses.map((imp, idx) =>
            imp.tau >= tauMin && imp.tau <= tauMax ? (
              <ImpulseArrow
                key={`xi-${idx}`}
                x={getX(imp.tau)}
                zeroY={zeroY}
                y={getY(imp.weight)}
                color="#0369A1"
                label={`(${imp.weight.toFixed(1)})`}
              />
            ) : null
          )}
          {hFlippedImpulses.map((imp, idx) =>
            imp.tau >= tauMin && imp.tau <= tauMax ? (
              <ImpulseArrow
                key={`hi-${idx}`}
                x={getX(imp.tau)}
                zeroY={zeroY}
                y={getY(imp.weight)}
                color="#C2410C"
                dashed
                label={`(${imp.weight.toFixed(1)})`}
              />
            ) : null
          )}

          {evalTime >= tauMin && evalTime <= tauMax && (
            <line
              x1={getX(evalTime)}
              y1={padding.top}
              x2={getX(evalTime)}
              y2={height - padding.bottom}
              stroke="#9A4324"
              strokeOpacity={0.75}
              strokeDasharray="3 2.5"
              strokeWidth={1.2}
              pointerEvents="none"
            />
          )}

          <text
            x={(padding.left + width - padding.right) / 2}
            y={height - 4}
            textAnchor="middle"
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            Time τ (s)
          </text>
          <text
            x={12}
            y={padding.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 12 ${padding.top + plotH / 2})`}
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            Amplitude
          </text>
        </svg>
      </div>
    </div>
  );
}
