import React, { useMemo } from 'react';

function EmptyChartState() {
  return (
    <div className="h-[140px] flex items-center justify-center text-xs text-[#6B5145] bg-[#F5F0EA]/60 rounded-lg border border-dashed border-[#D4C8BC] text-center px-3">
      Press Play to generate signals
    </div>
  );
}

/**
 * White-card Time-Domain Signal Chart
 */
export function TimeSeriesChart({
  title,
  waveformPoints,
  valueKey,
  strokeColor,
  yBound,
  referenceKey = null,
  referenceColor = '#B45309',
  referenceLabel = 'Original',
  primaryLabel = 'Signal',
}) {
  const width = 400;
  const height = 185;
  const padding = { top: 12, right: 16, bottom: 30, left: 46 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const yTicks = useMemo(() => [-yBound, 0, yBound], [yBound]);

  const { primaryPath, refPath, nStart, nEnd } = useMemo(() => {
    if (!waveformPoints || waveformPoints.length === 0) {
      return { primaryPath: '', refPath: '', nStart: 0, nEnd: 0 };
    }
    const len = waveformPoints.length;
    const maxIdx = Math.max(1, len - 1);
    const getX = (idx) => padding.left + (idx / maxIdx) * plotW;
    const getY = (val) =>
      padding.top + (1 - (val + yBound) / (2 * yBound || 1)) * plotH;

    const pPath = waveformPoints
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt[valueKey]).toFixed(1)}`
      )
      .join(' ');

    const rPath = referenceKey
      ? waveformPoints
          .map(
            (pt, i) =>
              `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt[referenceKey]).toFixed(1)}`
          )
          .join(' ')
      : '';

    return {
      primaryPath: pPath,
      refPath: rPath,
      nStart: waveformPoints[0].n,
      nEnd: waveformPoints[len - 1].n,
    };
  }, [waveformPoints, valueKey, referenceKey, yBound, plotW, plotH, padding.left, padding.top]);

  const getY = (val) =>
    padding.top + (1 - (val + yBound) / (2 * yBound || 1)) * plotH;

  const nMid = Math.round(0.5 * (nStart + nEnd));

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-0.5 shrink-0" style={{ backgroundColor: strokeColor }} />
          <h3 className="text-sm font-semibold text-[#3B2923] truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-[#6B5145]">
          {referenceKey && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5" style={{ backgroundColor: referenceColor }} />
              <span>{referenceLabel}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-2.5 h-0.5" style={{ backgroundColor: strokeColor }} />
            <span>{primaryLabel}</span>
          </span>
        </div>
      </div>

      {waveformPoints.length === 0 ? (
        <EmptyChartState />
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
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
            { label: nStart, x: padding.left, anchor: 'start' },
            { label: nMid, x: padding.left + plotW / 2, anchor: 'middle' },
            { label: nEnd, x: width - padding.right, anchor: 'end' },
          ].map((tick, idx) => (
            <g key={`xt-${idx}`}>
              <line
                x1={tick.x}
                y1={padding.top}
                x2={tick.x}
                y2={height - padding.bottom}
                stroke="rgba(59,41,35,0.10)"
                strokeDasharray="2 3"
                strokeWidth={0.9}
              />
              <text
                x={tick.x}
                y={height - padding.bottom + 15}
                textAnchor={tick.anchor}
                className="text-[11px] font-mono font-semibold fill-[#3B2923]"
              >
                {tick.label}
              </text>
            </g>
          ))}

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
          <line
            x1={padding.left}
            y1={getY(0)}
            x2={width - padding.right}
            y2={getY(0)}
            stroke="rgba(59,41,35,0.28)"
            strokeWidth={0.9}
          />

          {refPath && (
            <path
              d={refPath}
              fill="none"
              stroke={referenceColor}
              strokeOpacity={0.75}
              strokeWidth={1.3}
              strokeDasharray="3 2.5"
              strokeLinejoin="round"
            />
          )}

          <path
            d={primaryPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.65}
            strokeLinejoin="round"
          />

          <text
            x={padding.left + plotW / 2}
            y={height - 3}
            textAnchor="middle"
            className="text-[10px] font-sans font-semibold fill-[#6B5145]"
          >
            Sample (n)
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
      )}
    </div>
  );
}

/**
 * White-card PMF Chart
 */
export function PmfChart({ pmfData, hasSamples }) {
  const width = 400;
  const height = 185;
  const padding = { top: 16, right: 16, bottom: 30, left: 46 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const yMax = 0.8;
  const yTicks = [0, 0.4, 0.8];

  const minLvl = pmfData[0]?.level ?? -1;
  const maxLvl = pmfData[pmfData.length - 1]?.level ?? 1;
  const padSpan = Math.max(0.8, (maxLvl - minLvl) * 0.35);
  const xLow = minLvl - padSpan;
  const xHigh = maxLvl + padSpan;

  const getX = (v) => padding.left + ((v - xLow) / (xHigh - xLow || 1)) * plotW;
  const getY = (p) => padding.top + (1 - Math.min(yMax, Math.max(0, p)) / yMax) * plotH;
  const baseY = getY(0);

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="w-3 h-0.5 bg-[#B45309] shrink-0" />
        <h3 className="text-sm font-semibold text-[#3B2923]">PMF (Mass Function)</h3>
      </div>

      {!hasSamples ? (
        <EmptyChartState />
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {yTicks.map((yt) => {
            const yPos = getY(yt);
            return (
              <g key={`pmf-yt-${yt}`}>
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

          {pmfData.map((item) => {
            const cx = getX(item.level);
            const cy = getY(item.empiricalProb);
            return (
              <g key={`pmf-lvl-${item.level}`}>
                <line
                  x1={cx}
                  y1={baseY}
                  x2={cx}
                  y2={cy}
                  stroke="#B45309"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <circle cx={cx} cy={cy} r={3.8} fill="#B45309" />
                <text
                  x={cx}
                  y={Math.max(padding.top + 6, cy - 7)}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-semibold fill-[#9A4324]"
                >
                  {item.empiricalProb.toFixed(2)}
                </text>
                <text
                  x={cx}
                  y={height - padding.bottom + 15}
                  textAnchor="middle"
                  className="text-[11px] font-mono font-semibold fill-[#3B2923]"
                >
                  {item.level.toFixed(1)}
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
            Level (V)
          </text>
          <text
            x={10}
            y={padding.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 10 ${padding.top + plotH / 2})`}
            className="text-[10px] font-sans font-semibold fill-[#6B5145]"
          >
            Prob
          </text>
        </svg>
      )}
    </div>
  );
}

/**
 * White-card PDF Chart
 */
export function PdfChart({ xMin, xMax, binWidth, pdfBins, pdfCurve, hasSamples }) {
  const width = 400;
  const height = 185;
  const padding = { top: 16, right: 16, bottom: 30, left: 46 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const yMax = useMemo(() => {
    let peak = 0.25;
    for (let i = 0; i < pdfBins.length; i++) peak = Math.max(peak, pdfBins[i].density);
    for (let i = 0; i < pdfCurve.length; i++) peak = Math.max(peak, pdfCurve[i].density);
    const padded = peak * 1.18;
    const step = padded <= 0.4 ? 0.2 : padded <= 0.8 ? 0.4 : 0.5;
    return Math.ceil(padded / step) * step;
  }, [pdfBins, pdfCurve]);

  const yTicks = [0, yMax / 2, yMax];
  const getX = (x) => padding.left + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const getY = (d) => padding.top + (1 - Math.min(yMax, Math.max(0, d)) / yMax) * plotH;
  const baseY = getY(0);
  const barW = Math.max(2.5, (binWidth / (xMax - xMin || 1)) * plotW - 1);

  const curvePath = useMemo(
    () =>
      pdfCurve
        .map(
          (pt, i) =>
            `${i === 0 ? 'M' : 'L'} ${getX(pt.x).toFixed(1)} ${getY(pt.density).toFixed(1)}`
        )
        .join(' '),
    [pdfCurve, xMin, xMax, yMax]
  );

  const xTicks = [xMin, 0.5 * (xMin + xMax), xMax];

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="w-3 h-0.5 bg-[#047857] shrink-0" />
        <h3 className="text-sm font-semibold text-[#3B2923]">PDF (Density Function)</h3>
      </div>

      {!hasSamples ? (
        <EmptyChartState />
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {yTicks.map((yt) => {
            const yPos = getY(yt);
            return (
              <g key={`pdf-yt-${yt}`}>
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
                  {yt.toFixed(2)}
                </text>
              </g>
            );
          })}

          {xTicks.map((xt, idx) => {
            const xp = getX(xt);
            return (
              <g key={`pdf-xt-${idx}`}>
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
                  textAnchor={idx === 0 ? 'start' : idx === 2 ? 'end' : 'middle'}
                  className="text-[11px] font-mono font-semibold fill-[#3B2923]"
                >
                  {xt.toFixed(1)}
                </text>
              </g>
            );
          })}

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

          {pdfBins.map((b, idx) => {
            const yTop = getY(b.density);
            return (
              <rect
                key={`pdf-b-${idx}`}
                x={getX(b.x - binWidth / 2) + 0.5}
                y={yTop}
                width={barW}
                height={Math.max(0, baseY - yTop)}
                fill="#047857"
                fillOpacity={0.62}
                rx={1}
              />
            );
          })}

          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke="#3B2923"
              strokeWidth={1.35}
              strokeDasharray="3 2.5"
            />
          )}

          <text
            x={padding.left + plotW / 2}
            y={height - 3}
            textAnchor="middle"
            className="text-[10px] font-sans font-semibold fill-[#6B5145]"
          >
            Amplitude (V)
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
      )}
    </div>
  );
}

/**
 * White-card CDF Chart
 */
export function CdfChart({ xMin, xMax, cdfPoints, hasSamples }) {
  const width = 400;
  const height = 185;
  const padding = { top: 16, right: 16, bottom: 30, left: 46 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const yTicks = [0, 0.5, 1.0];
  const getX = (x) => padding.left + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const getY = (p) => padding.top + (1 - Math.min(1, Math.max(0, p))) * plotH;

  const { empPath, theoPath } = useMemo(() => {
    const emp = cdfPoints
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(pt.x).toFixed(1)} ${getY(pt.empiricalCdf).toFixed(1)}`
      )
      .join(' ');
    const theo = cdfPoints
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(pt.x).toFixed(1)} ${getY(pt.theoreticalCdf).toFixed(1)}`
      )
      .join(' ');
    return { empPath: emp, theoPath: theo };
  }, [cdfPoints, xMin, xMax]);

  const xTicks = [xMin, 0.5 * (xMin + xMax), xMax];

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="w-3 h-0.5 bg-[#7E22CE] shrink-0" />
        <h3 className="text-sm font-semibold text-[#3B2923]">CDF (Cumulative)</h3>
      </div>

      {!hasSamples ? (
        <EmptyChartState />
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {yTicks.map((yt) => {
            const yPos = getY(yt);
            return (
              <g key={`cdf-yt-${yt}`}>
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

          {xTicks.map((xt, idx) => {
            const xp = getX(xt);
            return (
              <g key={`cdf-xt-${idx}`}>
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
                  textAnchor={idx === 0 ? 'start' : idx === 2 ? 'end' : 'middle'}
                  className="text-[11px] font-mono font-semibold fill-[#3B2923]"
                >
                  {xt.toFixed(1)}
                </text>
              </g>
            );
          })}

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

          {theoPath && (
            <path
              d={theoPath}
              fill="none"
              stroke="rgba(59, 41, 35, 0.55)"
              strokeWidth={1.2}
              strokeDasharray="3 2.5"
            />
          )}

          {empPath && (
            <path
              d={empPath}
              fill="none"
              stroke="#7E22CE"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          <text
            x={padding.left + plotW / 2}
            y={height - 3}
            textAnchor="middle"
            className="text-[10px] font-sans font-semibold fill-[#6B5145]"
          >
            Amplitude (V)
          </text>
          <text
            x={10}
            y={padding.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 10 ${padding.top + plotH / 2})`}
            className="text-[10px] font-sans font-semibold fill-[#6B5145]"
          >
            Prob
          </text>
        </svg>
      )}
    </div>
  );
}
