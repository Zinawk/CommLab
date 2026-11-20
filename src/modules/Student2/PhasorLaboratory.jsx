import React, { useMemo } from 'react';
import { TWO_PI } from './eulerMath.js';

export function PhasorOrbitChart({
  amplitude = 1.5,
  currentAngleDeg = 0,
  title = 'Phasor Orbit A·e^(jθ(t))',
}) {
  const angleRad = (currentAngleDeg * Math.PI) / 180;
  const realCoord = amplitude * Math.cos(angleRad);
  const imagCoord = amplitude * Math.sin(angleRad);

  const orbW = 440;
  const orbH = 240;
  const cx = orbW / 2;
  const cy = orbH / 2;
  const pxPerUnit = amplitude <= 1.2 ? 68 : 34;
  const orbitR = amplitude * pxPerUnit;
  const tipX = cx + realCoord * pxPerUnit;
  const tipY = cy - imagCoord * pxPerUnit;

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-[#3B2923] truncate">{title}</h3>
        <span className="text-xs font-mono text-[#6B5145] tabular-nums">
          {amplitude.toFixed(1)}∠{currentAngleDeg.toFixed(0)}°
        </span>
      </div>
      <svg viewBox={`0 0 ${orbW} ${orbH}`} className="w-full h-auto select-none">
        <line x1={cx - 125} y1={cy} x2={cx + 125} y2={cy} stroke="rgba(59, 41, 35, 0.45)" strokeWidth={1.1} />
        <line x1={cx} y1={cy + 95} x2={cx} y2={cy - 95} stroke="rgba(59, 41, 35, 0.45)" strokeWidth={1.1} />
        <circle cx={cx} cy={cy} r={orbitR} fill="rgba(3, 105, 161, 0.05)" stroke="rgba(59, 41, 35, 0.35)" strokeDasharray="3 3" strokeWidth={1.2} />

        <line x1={tipX} y1={tipY} x2={tipX} y2={cy} stroke="#0369A1" strokeWidth={1.3} strokeDasharray="3 2" />
        <line x1={tipX} y1={tipY} x2={cx} y2={tipY} stroke="#C2410C" strokeWidth={1.3} strokeDasharray="3 2" />
        <line x1={cx} y1={cy} x2={tipX} y2={tipY} stroke="#9A4324" strokeWidth={2.4} />
        <circle cx={cx} cy={cy} r={3} fill="#3B2923" />
        <circle cx={tipX} cy={tipY} r={4.8} fill="#9A4324" stroke="#FFFFFF" strokeWidth={1.5} />

        <text x={cx + orbitR + 8} y={cy + 4} fill="#3B2923" className="text-[11px] font-mono font-semibold tabular-nums">+{amplitude.toFixed(1)}</text>
        <text x={cx - orbitR - 8} y={cy + 4} textAnchor="end" fill="#3B2923" className="text-[11px] font-mono font-semibold tabular-nums">-{amplitude.toFixed(1)}</text>
        <text x={cx + 8} y={cy - 82} fill="#6B5145" className="text-[11px] font-sans font-medium">+j Im</text>
        <text x={cx + 122} y={cy - 7} textAnchor="end" fill="#6B5145" className="text-[11px] font-sans font-medium">Re</text>
      </svg>
    </div>
  );
}

export function PhasorWavesChart({
  amplitude = 1.5,
  frequency = 0.5,
  phaseDeg = 0,
  currentAngleDeg = 0,
}) {
  const angleRad = (currentAngleDeg * Math.PI) / 180;
  const realCoord = amplitude * Math.cos(angleRad);
  const imagCoord = amplitude * Math.sin(angleRad);

  const plotW = 440;
  const plotH = 240;
  const pad = { top: 14, right: 20, bottom: 38, left: 50 };
  const innerW = plotW - pad.left - pad.right;
  const innerH = plotH - pad.top - pad.bottom;
  const maxY = Math.max(1.2, amplitude * 1.2);
  const getX = (theta) => pad.left + (theta / TWO_PI) * innerW;
  const getY = (val) => pad.top + (1 - (val + maxY) / (2 * maxY)) * innerH;
  const zeroY = getY(0);

  const { cosPath, sinPath } = useMemo(() => {
    const steps = 120;
    const cPts = [];
    const sPts = [];
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * TWO_PI;
      const x = getX(th).toFixed(1);
      cPts.push(`${i === 0 ? 'M' : 'L'} ${x} ${getY(amplitude * Math.cos(th)).toFixed(1)}`);
      sPts.push(`${i === 0 ? 'M' : 'L'} ${x} ${getY(amplitude * Math.sin(th)).toFixed(1)}`);
    }
    return { cosPath: cPts.join(' '), sinPath: sPts.join(' ') };
  }, [amplitude, maxY]);

  const normRad = ((currentAngleDeg % 360) / 360) * TWO_PI;

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-[#3B2923]">Real &amp; Imaginary Projections</h3>
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#6B5145]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#0369A1] inline-block" />
            <span>Re cos</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#C2410C] inline-block" />
            <span>Im sin</span>
          </span>
          <span className="tabular-nums">ω={(TWO_PI * frequency).toFixed(2)} rad/s</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${plotW} ${plotH}`} className="w-full h-auto select-none">
        {[-amplitude, 0, amplitude].map((yt) => {
          const yp = getY(yt);
          return (
            <g key={`py-${yt}`}>
              <line x1={pad.left} y1={yp} x2={plotW - pad.right} y2={yp} stroke="rgba(59, 41, 35, 0.10)" strokeDasharray="3 3" strokeWidth={0.9} />
              <text x={pad.left - 8} y={yp + 3.5} textAnchor="end" fill="#6B5145" className="text-[11px] font-mono tabular-nums">
                {yt.toFixed(1)}
              </text>
            </g>
          );
        })}

        {[
          { r: 0, l: '0' },
          { r: Math.PI, l: 'π' },
          { r: TWO_PI, l: '2π' },
        ].map((xt) => (
          <g key={`px-${xt.l}`}>
            <line x1={getX(xt.r)} y1={pad.top} x2={getX(xt.r)} y2={plotH - pad.bottom} stroke="rgba(59, 41, 35, 0.10)" strokeDasharray="3 3" strokeWidth={0.9} />
            <text x={getX(xt.r)} y={plotH - pad.bottom + 16} textAnchor="middle" fill="#3B2923" className="text-[11px] font-mono font-semibold">
              {xt.l}
            </text>
          </g>
        ))}

        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={plotH - pad.bottom} stroke="rgba(59, 41, 35, 0.45)" strokeWidth={1.1} />
        <line x1={pad.left} y1={plotH - pad.bottom} x2={plotW - pad.right} y2={plotH - pad.bottom} stroke="rgba(59, 41, 35, 0.45)" strokeWidth={1.1} />
        <line x1={pad.left} y1={zeroY} x2={plotW - pad.right} y2={zeroY} stroke="rgba(59, 41, 35, 0.28)" strokeWidth={1} />

        <path d={cosPath} fill="none" stroke="#0369A1" strokeWidth={2} />
        <path d={sinPath} fill="none" stroke="#C2410C" strokeWidth={2} />

        <line x1={getX(normRad)} y1={pad.top} x2={getX(normRad)} y2={plotH - pad.bottom} stroke="rgba(59, 41, 35, 0.35)" strokeDasharray="2 2" strokeWidth={1} />
        <circle cx={getX(normRad)} cy={getY(realCoord)} r={4} fill="#FFFFFF" stroke="#0369A1" strokeWidth={2} />
        <circle cx={getX(normRad)} cy={getY(imagCoord)} r={4} fill="#FFFFFF" stroke="#C2410C" strokeWidth={2} />

        <text x={(pad.left + plotW - pad.right) / 2} y={plotH - 4} textAnchor="middle" fill="#6B5145" className="text-[11px] font-sans font-medium">
          Phase ωt + ϕ (ϕ = {phaseDeg}°)
        </text>
        <text x={13} y={pad.top + innerH / 2} textAnchor="middle" transform={`rotate(-90 13 ${pad.top + innerH / 2})`} fill="#6B5145" className="text-[11px] font-sans font-medium">
          Amplitude
        </text>
      </svg>
    </div>
  );
}

/**
 * Side-by-side Phasor Laboratory visualization
 */
export default function PhasorLaboratory({
  amplitude = 1.5,
  frequency = 0.5,
  phaseDeg = 0,
  currentAngleDeg = 0,
}) {
  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-5">
      <PhasorOrbitChart amplitude={amplitude} currentAngleDeg={currentAngleDeg} />
      <PhasorWavesChart
        amplitude={amplitude}
        frequency={frequency}
        phaseDeg={phaseDeg}
        currentAngleDeg={currentAngleDeg}
      />
    </div>
  );
}
