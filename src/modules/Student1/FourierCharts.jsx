import React, { useState, useRef, useMemo } from 'react';
import { TASK1_WAVEFORMS } from './fourierMath.js';

const HARMONIC_COLORS = [
  '#7E22CE',
  '#BE123C',
  '#0F766E',
  '#C2410C',
  '#0369A1',
  '#B45309',
  '#9A4324',
];

const WAVEFORM_LABEL_MAP = Object.fromEntries(
  TASK1_WAVEFORMS.map((w) => [w.id, w.label])
);

/**
 * High-contrast light-theme Time-Domain Chart.
 */
export function TimeDomainChart({
  waveformData,
  amplitude,
  harmonicsCount,
  waveform = 'square',
  modulationMode = 'none',
  showHarmonics = false,
}) {
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const {
    tStart,
    tEnd,
    points,
    individualTraces,
    maxAbsSignal,
  } = waveformData;

  const width = 460;
  const height = 240;
  const padding = { top: 14, right: 20, bottom: 38, left: 52 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const yBound = useMemo(() => {
    const peakRef = Math.max(0.8, maxAbsSignal || amplitude, amplitude * 1.15);
    const raw = peakRef * 1.2;
    const step = raw <= 1.5 ? 0.5 : raw <= 3.5 ? 1.0 : raw <= 7 ? 2.0 : 5.0;
    return Math.ceil(raw / step) * step;
  }, [maxAbsSignal, amplitude]);

  const yTicks = useMemo(
    () => [-yBound, -yBound / 2, 0, yBound / 2, yBound],
    [yBound]
  );

  const xTicks = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 4; i++) {
      arr.push(tStart + (i / 4) * (tEnd - tStart));
    }
    return arr;
  }, [tStart, tEnd]);

  const getX = (t) => padding.left + ((t - tStart) / (tEnd - tStart || 1)) * plotW;
  const getY = (v) => padding.top + (1 - (v + yBound) / (2 * yBound || 1)) * plotH;
  const zeroY = getY(0);

  const hasEnvelope = modulationMode !== 'none' && points.length > 0 && points[0].envPos !== null;
  const hasRefTrace =
    (modulationMode === 'fm_wave' || modulationMode === 'fm_carrier') &&
    points.length > 0 &&
    points[0].refTrace !== null;

  const { idealPath, sumPath, envPosPath, envNegPath, refPath, harmonicPaths } = useMemo(() => {
    const ideal = points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.t).toFixed(1)} ${getY(pt.ideal).toFixed(1)}`)
      .join(' ');

    const sum = points
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(pt.t).toFixed(1)} ${getY(pt.reconstructed).toFixed(1)}`
      )
      .join(' ');

    const envP = hasEnvelope
      ? points
          .map(
            (pt, i) =>
              `${i === 0 ? 'M' : 'L'} ${getX(pt.t).toFixed(1)} ${getY(pt.envPos).toFixed(1)}`
          )
          .join(' ')
      : '';

    const envN = hasEnvelope
      ? points
          .map(
            (pt, i) =>
              `${i === 0 ? 'M' : 'L'} ${getX(pt.t).toFixed(1)} ${getY(pt.envNeg).toFixed(1)}`
          )
          .join(' ')
      : '';

    const refP = hasRefTrace
      ? points
          .map(
            (pt, i) =>
              `${i === 0 ? 'M' : 'L'} ${getX(pt.t).toFixed(1)} ${getY(pt.refTrace).toFixed(1)}`
          )
          .join(' ')
      : '';

    const hPaths = showHarmonics && modulationMode === 'none'
      ? individualTraces.map((tr, tIdx) => ({
          order: tr.order,
          color: HARMONIC_COLORS[tIdx % HARMONIC_COLORS.length],
          d: tr.values
            .map(
              (v, i) =>
                `${i === 0 ? 'M' : 'L'} ${getX(points[i].t).toFixed(1)} ${getY(v).toFixed(1)}`
            )
            .join(' '),
        }))
      : [];

    return {
      idealPath: ideal,
      sumPath: sum,
      envPosPath: envP,
      envNegPath: envN,
      refPath: refP,
      harmonicPaths: hPaths,
    };
  }, [points, individualTraces, showHarmonics, modulationMode, hasEnvelope, hasRefTrace, yBound, tStart, tEnd]);

  const handleMouseMove = (e) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const svgX = (e.clientX - rect.left) * scaleX;
    const ratio = Math.max(0, Math.min(1, (svgX - padding.left) / plotW));
    setHoverIdx(Math.round(ratio * (points.length - 1)));
  };

  const hovered = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : null;
  const waveformName = WAVEFORM_LABEL_MAP[waveform] || 'Signal';
  const titleText =
    modulationMode === 'carrier'
      ? 'AM Carrier s(t)'
      : modulationMode === 'envelope'
      ? 'Envelope AM y(t)'
      : modulationMode === 'fm_wave'
      ? `FM Signal (N=${harmonicsCount})`
      : modulationMode === 'fm_carrier'
      ? 'FM Carrier s(t)'
      : `${waveformName} x_N(t) (N=${harmonicsCount})`;

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-[#3B2923] truncate">{titleText}</h3>
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#6B5145]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#0369A1] inline-block" />
            <span>x_N(t)</span>
          </span>
          {modulationMode === 'none' && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-[#C2410C] inline-block" />
              <span>Ideal</span>
            </span>
          )}
          {hovered && (
            <span className="text-[#3B2923] font-semibold tabular-nums">
              {hovered.t.toFixed(2)}s, {hovered.reconstructed.toFixed(2)}V
            </span>
          )}
        </div>
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
          {/* Y Gridlines & Labels */}
          {yTicks.map((yt) => {
            const yPos = getY(yt);
            return (
              <g key={`tyt-${yt}`}>
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
                  {yt.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X Gridlines & Labels */}
          {xTicks.map((xt, idx) => {
            const xPos = getX(xt);
            return (
              <g key={`txt-${idx}`}>
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
                  className="text-[11px] font-mono font-semibold tabular-nums"
                >
                  {xt.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Axis Lines */}
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

          {/* Zero Axis Reference */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="rgba(59, 41, 35, 0.28)"
            strokeWidth={1}
          />

          {/* Harmonic Components */}
          {harmonicPaths.map((hp) => (
            <path
              key={`harm-trace-${hp.order}`}
              d={hp.d}
              fill="none"
              stroke={hp.color}
              strokeOpacity={0.55}
              strokeWidth={1.1}
              strokeLinecap="round"
            />
          ))}

          {/* Target Ideal Waveform */}
          {modulationMode === 'none' && (
            <path
              d={idealPath}
              fill="none"
              stroke="#C2410C"
              strokeOpacity={0.85}
              strokeWidth={1.4}
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
          )}

          {/* Reference Trace for FM */}
          {hasRefTrace && (
            <path
              d={refPath}
              fill="none"
              stroke="#C2410C"
              strokeOpacity={0.7}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              strokeLinejoin="round"
            />
          )}

          {/* AM / Constant FM Envelopes */}
          {hasEnvelope && (
            <>
              <path
                d={envPosPath}
                fill="none"
                stroke="#047857"
                strokeOpacity={0.85}
                strokeWidth={1.3}
                strokeDasharray="4 2.5"
              />
              <path
                d={envNegPath}
                fill="none"
                stroke="#C2410C"
                strokeOpacity={0.85}
                strokeWidth={1.3}
                strokeDasharray="4 2.5"
              />
            </>
          )}

          {/* Primary Waveform Curve */}
          <path
            d={sumPath}
            fill="none"
            stroke="#0369A1"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Marker */}
          {hovered && (
            <g pointerEvents="none">
              <line
                x1={getX(hovered.t)}
                y1={padding.top}
                x2={getX(hovered.t)}
                y2={height - padding.bottom}
                stroke="rgba(59, 41, 35, 0.35)"
                strokeDasharray="2 2"
                strokeWidth={1}
              />
              <circle
                cx={getX(hovered.t)}
                cy={getY(hovered.reconstructed)}
                r={4}
                fill="#FFFFFF"
                stroke="#9A4324"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={(padding.left + width - padding.right) / 2}
            y={height - 4}
            textAnchor="middle"
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            Time t (s)
          </text>
          <text
            x={13}
            y={padding.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 13 ${padding.top + plotH / 2})`}
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            Amplitude (V)
          </text>
        </svg>
      </div>
    </div>
  );
}

/**
 * High-contrast light-theme Frequency-Domain Spectrum Chart.
 */
export function FrequencySpectrumChart({ spectrumData, mode = 'linear' }) {
  const [hoverText, setHoverText] = useState(null);

  const {
    modulationMode,
    maxFreq,
    components,
    modStems = [],
    envelopeLinear,
    envelopeRelative,
    envelopeDb,
    envelopePower,
    fundamentalAmp,
  } = spectrumData;

  const width = 460;
  const height = 240;
  const padding = { top: 14, right: 20, bottom: 38, left: 52 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const { yMin, yMax, yTicks, getVal, getEnvVal, envelopeData, yTitle } = useMemo(() => {
    if (mode === 'relative' && modulationMode === 'none') {
      return {
        yMin: 0,
        yMax: 1.15,
        yTicks: [0, 0.5, 1.0],
        getVal: (c) => (c.isActive ? c.relativeRatio : 0),
        getEnvVal: (pt) => pt.val,
        envelopeData: envelopeRelative,
        yTitle: 'c_n / c₁',
      };
    }
    if (mode === 'db' && modulationMode === 'none') {
      return {
        yMin: -40,
        yMax: 5,
        yTicks: [-40, -20, 0],
        getVal: (c) => (c.isActive ? Math.max(-40, c.dbValue) : -40),
        getEnvVal: (pt) => Math.max(-40, pt.val),
        envelopeData: envelopeDb,
        yTitle: 'Mag (dB)',
      };
    }
    if (mode === 'power' && modulationMode === 'none') {
      const pMax = Math.max(0.25, 0.5 * fundamentalAmp * fundamentalAmp);
      const step = pMax <= 1 ? 0.25 : pMax <= 3 ? 0.5 : 1.0;
      const top = Math.ceil((pMax * 1.15) / step) * step;
      return {
        yMin: 0,
        yMax: top,
        yTicks: [0, top / 2, top],
        getVal: (c) => (c.isActive ? c.powerWatts : 0),
        getEnvVal: (pt) => pt.val,
        envelopeData: envelopePower,
        yTitle: 'Power (W)',
      };
    }

    const rawMax = Math.max(0.6, fundamentalAmp * 1.15);
    const step = rawMax <= 1.5 ? 0.5 : rawMax <= 3.5 ? 1.0 : 1.5;
    const top = Math.ceil(rawMax / step) * step;
    return {
      yMin: 0,
      yMax: top,
      yTicks: [0, top / 2, top],
      getVal: (c) => (c.isActive ? c.amplitude : 0),
      getEnvVal: (pt) => pt.val,
      envelopeData: modulationMode === 'none' ? envelopeLinear : [],
      yTitle: modulationMode === 'carrier' || modulationMode === 'fm_carrier' ? '|S(f)| (V)' : 'c_n (V)',
    };
  }, [mode, modulationMode, fundamentalAmp, envelopeLinear, envelopeRelative, envelopeDb, envelopePower]);

  const fMaxPlot = Math.max(1, maxFreq * 1.05);
  const getX = (f) => padding.left + (f / fMaxPlot) * plotW;
  const getY = (v) => {
    const clamped = Math.max(yMin, Math.min(yMax, v));
    return padding.top + (1 - (clamped - yMin) / (yMax - yMin || 1)) * plotH;
  };
  const baseY = getY(yMin);

  const xTicks = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 4; i++) {
      arr.push((i / 4) * maxFreq);
    }
    return arr;
  }, [maxFreq]);

  const envelopePath = useMemo(() => {
    if (!envelopeData || envelopeData.length === 0) return '';
    return envelopeData
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.freqHz).toFixed(1)} ${getY(getEnvVal(pt)).toFixed(1)}`)
      .join(' ');
  }, [envelopeData, fMaxPlot, yMin, yMax, getEnvVal]);

  const titleText =
    modulationMode === 'carrier'
      ? 'AM Spectrum |S(f)|'
      : modulationMode === 'envelope'
      ? 'Modulated Spectrum'
      : modulationMode === 'fm_wave'
      ? 'FM Bessel Spectrum'
      : modulationMode === 'fm_carrier'
      ? 'FM Carrier Spectrum'
      : 'Frequency Spectrum c_n';

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-[#3B2923] truncate">{titleText}</h3>
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#6B5145]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#047857] inline-block" />
            <span>Harmonics</span>
          </span>
          {hoverText && (
            <span className="text-[#3B2923] font-semibold tabular-nums">{hoverText}</span>
          )}
        </div>
      </div>

      {/* SVG Spectrum */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverText(null)}
        >
          {/* Y Gridlines */}
          {yTicks.map((yt) => {
            const yPos = getY(yt);
            return (
              <g key={`fyt-${yt}`}>
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
                  {yt.toFixed(mode === 'relative' && modulationMode === 'none' ? 2 : 1)}
                </text>
              </g>
            );
          })}

          {/* X Gridlines & Labels */}
          {xTicks.map((ft, idx) => {
            const xPos = getX(ft);
            return (
              <g key={`fxt-${idx}`}>
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
                  className="text-[11px] font-mono font-semibold tabular-nums"
                >
                  {ft >= 10 ? ft.toFixed(0) : ft.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Axis Lines */}
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

          {/* Theoretical Decay Envelope */}
          {envelopePath && (
            <path
              d={envelopePath}
              fill="none"
              stroke="rgba(59, 41, 35, 0.35)"
              strokeWidth={1.2}
              strokeDasharray="3 3"
            />
          )}

          {/* Baseband Harmonic Stems */}
          {(modulationMode === 'none' || modulationMode === 'envelope') &&
            components.map((comp) => {
              const cx = getX(comp.freqHz);
              const val = getVal(comp);
              const cy = getY(val);
              const hasNonZeroAmp = comp.isActive && comp.amplitude > 1e-6;

              return (
                <g
                  key={`spec-n-${comp.order}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverText(`${comp.freqHz.toFixed(1)}Hz, ${val.toFixed(2)}`)}
                >
                  {hasNonZeroAmp ? (
                    <>
                      <line
                        x1={cx}
                        y1={baseY}
                        x2={cx}
                        y2={cy}
                        stroke="#047857"
                        strokeWidth={2.2}
                      />
                      <circle cx={cx} cy={cy} r={3.2} fill="#047857" />
                    </>
                  ) : (
                    <circle
                      cx={cx}
                      cy={baseY}
                      r={2}
                      fill="rgba(59, 41, 35, 0.25)"
                    />
                  )}
                  <rect
                    x={cx - 6}
                    y={padding.top}
                    width={12}
                    height={plotH}
                    fill="transparent"
                  />
                </g>
              );
            })}

          {/* Modulated Carrier & Sideband Stems */}
          {modulationMode !== 'none' &&
            modStems.map((stem, idx) => {
              const cx = getX(stem.freqHz);
              const cy = getY(stem.amp);
              const isCarrier = stem.kind === 'carrier';
              const strokeCol = isCarrier ? '#0369A1' : '#C2410C';
              return (
                <g
                  key={`mod-stem-${idx}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverText(`${stem.freqHz.toFixed(1)}Hz, ${stem.amp.toFixed(2)}V`)}
                >
                  <line
                    x1={cx}
                    y1={baseY}
                    x2={cx}
                    y2={cy}
                    stroke={strokeCol}
                    strokeWidth={isCarrier ? 2.4 : 1.8}
                  />
                  <circle cx={cx} cy={cy} r={isCarrier ? 3.5 : 2.8} fill={strokeCol} />
                  <rect x={cx - 6} y={padding.top} width={12} height={plotH} fill="transparent" />
                </g>
              );
            })}

          {/* Axis Labels */}
          <text
            x={(padding.left + width - padding.right) / 2}
            y={height - 4}
            textAnchor="middle"
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            Frequency f (Hz)
          </text>
          <text
            x={13}
            y={padding.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 13 ${padding.top + plotH / 2})`}
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            {yTitle}
          </text>
        </svg>
      </div>
    </div>
  );
}
