import React, { useRef, useCallback } from 'react';

/**
 * Light-canvas Unit Circle on Complex Plane with dark brown axes and high-contrast projection vectors.
 */
export default function EulerComplexPlane({
  angleDeg,
  onAngleChange,
  amplitude = 1,
  showProjections = true,
  title = 'Unit Circle e^(jθ) in Complex Plane',
}) {
  const svgRef = useRef(null);

  const width = 440;
  const height = 250;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 84;

  const angleRad = (angleDeg * Math.PI) / 180;
  const cosVal = Math.cos(angleRad);
  const sinVal = Math.sin(angleRad);
  const cleanCos = Math.abs(cosVal) < 1e-12 ? 0 : cosVal;
  const cleanSin = Math.abs(sinVal) < 1e-12 ? 0 : sinVal;

  const tipX = cx + cleanCos * radius;
  const tipY = cy - cleanSin * radius;

  const arcRadius = 26;
  const arcEndX = cx + arcRadius * Math.cos(angleRad);
  const arcEndY = cy - arcRadius * Math.sin(angleRad);
  const largeArcFlag = angleDeg > 180 ? 1 : 0;
  const arcPath =
    angleDeg > 0.5
      ? `M ${cx + arcRadius} ${cy} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 0 ${arcEndX.toFixed(1)} ${arcEndY.toFixed(1)}`
      : '';

  const handlePlanePointer = useCallback(
    (e) => {
      if (!svgRef.current || !onAngleChange) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX === undefined || clientY === undefined) return;

      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const clickX = (clientX - rect.left) * scaleX - cx;
      const clickY = -((clientY - rect.top) * scaleY - cy);

      let deg = (Math.atan2(clickY, clickX) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      onAngleChange(Math.round(deg * 10) / 10);
    },
    [onAngleChange, cx, cy]
  );

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-[#3B2923] truncate">{title}</h3>
        <span className="text-xs font-mono text-[#6B5145] tabular-nums">
          ({(amplitude * cleanCos).toFixed(2)}, {(amplitude * cleanSin).toFixed(2)})
        </span>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none cursor-crosshair"
          onPointerDown={handlePlanePointer}
        >
          {/* Coordinate Crosshairs */}
          <line
            x1={cx - radius - 42}
            y1={cy}
            x2={cx + radius + 42}
            y2={cy}
            stroke="rgba(59, 41, 35, 0.45)"
            strokeWidth={1.1}
          />
          <line
            x1={cx}
            y1={cy + radius + 24}
            x2={cx}
            y2={cy - radius - 24}
            stroke="rgba(59, 41, 35, 0.45)"
            strokeWidth={1.1}
          />

          {/* Unit Circle */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="rgba(3, 105, 161, 0.05)"
            stroke="rgba(59, 41, 35, 0.3)"
            strokeWidth={1.3}
          />

          {/* Axis Ticks */}
          <text
            x={cx + radius + 8}
            y={cy + 4}
            textAnchor="start"
            fill="#3B2923"
            className="text-[11px] font-mono font-semibold tabular-nums"
          >
            +{amplitude === 1 ? '1' : amplitude.toFixed(1)}
          </text>
          <text
            x={cx - radius - 8}
            y={cy + 4}
            textAnchor="end"
            fill="#3B2923"
            className="text-[11px] font-mono font-semibold tabular-nums"
          >
            -{amplitude === 1 ? '1' : amplitude.toFixed(1)}
          </text>
          <text
            x={cx + 8}
            y={cy - radius - 6}
            textAnchor="start"
            fill="#3B2923"
            className="text-[11px] font-mono font-semibold"
          >
            +j
          </text>
          <text
            x={cx + 8}
            y={cy + radius + 14}
            textAnchor="start"
            fill="#3B2923"
            className="text-[11px] font-mono font-semibold"
          >
            -j
          </text>

          {/* Axis Labels */}
          <text
            x={cx + radius + 44}
            y={cy - 6}
            textAnchor="end"
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            Re
          </text>
          <text
            x={cx - 10}
            y={cy - radius - 10}
            textAnchor="end"
            fill="#6B5145"
            className="text-[11px] font-sans font-medium"
          >
            Im
          </text>

          {/* Angle Arc */}
          {arcPath && (
            <path
              d={arcPath}
              fill="rgba(154, 67, 36, 0.14)"
              stroke="#9A4324"
              strokeWidth={1.4}
            />
          )}

          {/* Projections */}
          {showProjections && (
            <>
              <line
                x1={tipX}
                y1={tipY}
                x2={tipX}
                y2={cy}
                stroke="#0369A1"
                strokeWidth={1.3}
                strokeDasharray="3 2"
              />
              <line
                x1={cx}
                y1={cy}
                x2={tipX}
                y2={cy}
                stroke="#0369A1"
                strokeWidth={2.5}
              />
              <line
                x1={tipX}
                y1={tipY}
                x2={cx}
                y2={tipY}
                stroke="#C2410C"
                strokeWidth={1.3}
                strokeDasharray="3 2"
              />
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={tipY}
                stroke="#C2410C"
                strokeWidth={2.5}
              />
            </>
          )}

          {/* Rotating Vector */}
          <line
            x1={cx}
            y1={cy}
            x2={tipX}
            y2={tipY}
            stroke="#9A4324"
            strokeWidth={2.4}
          />
          <circle cx={cx} cy={cy} r={3} fill="#3B2923" />
          <circle cx={tipX} cy={tipY} r={5} fill="#9A4324" stroke="#FFFFFF" strokeWidth={1.6} />
        </svg>
      </div>
    </div>
  );
}
