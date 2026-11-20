import React from 'react';

/**
 * Clean white-card visual schematic of the Diode-RC Envelope Detector.
 */
export default function AmCircuitDiagram() {
  const width = 420;

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#9A4324] shrink-0" />
          <h3 className="text-sm font-semibold text-[#3B2923]">Envelope Detector Circuit</h3>
        </div>
        <span className="text-xs font-mono text-[#6B5145]">Diode-RC Stage</span>
      </div>

      <div className="w-full overflow-hidden flex-1 flex items-center">
        <svg viewBox={`0 0 ${width} 145`} className="w-full h-auto select-none font-sans">
          {/* Input Terminal: s(t) */}
          <circle cx="42" cy="52" r="4" fill="#0369A1" />
          <text x="42" y="34" textAnchor="middle" fill="#0369A1" className="text-[11px] font-bold">
            s(t) Input
          </text>
          <text x="42" y="72" textAnchor="middle" className="text-[9.5px] font-mono fill-[#6B5145]">
            AM Signal
          </text>

          {/* Wire to Diode */}
          <line x1="46" y1="52" x2="116" y2="52" stroke="#3B2923" strokeWidth="1.5" />

          {/* Diode Symbol */}
          <g transform="translate(116, 36)">
            <polygon
              points="0,4 0,28 26,16"
              fill="#F5F0EA"
              stroke="#3B2923"
              strokeWidth="1.6"
            />
            <line
              x1="26"
              y1="4"
              x2="26"
              y2="28"
              stroke="#3B2923"
              strokeWidth="2.2"
            />
            <text x="13" y="-5" textAnchor="middle" className="text-[10.5px] font-semibold fill-[#3B2923]">
              Diode (D)
            </text>
          </g>

          {/* Wire from Diode to RC Node */}
          <line x1="142" y1="52" x2="232" y2="52" stroke="#3B2923" strokeWidth="1.5" />

          {/* Node V_C */}
          <circle cx="232" cy="52" r="3.5" fill="#9A4324" />
          <text x="232" y="34" textAnchor="middle" className="text-[10.5px] font-mono font-bold fill-[#3B2923]">
            Node V_C
          </text>

          {/* Capacitor Branch */}
          <line x1="232" y1="52" x2="232" y2="72" stroke="#3B2923" strokeWidth="1.5" />
          <g transform="translate(216, 72)">
            <line x1="0" y1="3" x2="32" y2="3" stroke="#3B2923" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="32" y2="10" stroke="#3B2923" strokeWidth="2" strokeLinecap="round" />
            <text x="38" y="10" className="text-[10.5px] font-bold fill-[#3B2923] font-mono">
              C
            </text>
          </g>
          <line x1="232" y1="82" x2="232" y2="116" stroke="#3B2923" strokeWidth="1.5" />

          {/* Resistor Branch */}
          <line x1="232" y1="52" x2="312" y2="52" stroke="#3B2923" strokeWidth="1.5" />
          <line x1="312" y1="52" x2="312" y2="66" stroke="#3B2923" strokeWidth="1.5" />
          <g transform="translate(306, 66)">
            <path
              d="M 6 0 L 6 5 L 0 9 L 12 14 L 0 19 L 12 24 L 0 29 L 6 33 L 6 38"
              fill="none"
              stroke="#3B2923"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <text x="18" y="23" className="text-[10.5px] font-bold fill-[#3B2923] font-mono">
              R
            </text>
          </g>
          <line x1="312" y1="104" x2="312" y2="116" stroke="#3B2923" strokeWidth="1.5" />

          {/* Ground Bus */}
          <line x1="202" y1="116" x2="340" y2="116" stroke="#3B2923" strokeWidth="1.5" />
          <g transform="translate(271, 116)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#3B2923" strokeWidth="1.5" />
            <line x1="-11" y1="6" x2="11" y2="6" stroke="#3B2923" strokeWidth="1.5" />
            <line x1="-7" y1="10" x2="7" y2="10" stroke="#3B2923" strokeWidth="1.3" />
            <line x1="-3.5" y1="14" x2="3.5" y2="14" stroke="#3B2923" strokeWidth="1.1" />
            <text x="16" y="13" className="text-[9.5px] fill-[#6B5145] font-mono font-semibold">
              GND
            </text>
          </g>

          {/* Wire to Output Terminal */}
          <line x1="312" y1="52" x2="376" y2="52" stroke="#047857" strokeWidth="1.6" />
          <circle cx="380" cy="52" r="4" fill="#047857" />
          <text x="380" y="34" textAnchor="middle" fill="#047857" className="text-[11px] font-bold">
            m(t) Output
          </text>
          <text x="380" y="72" textAnchor="middle" className="text-[9.5px] font-mono fill-[#6B5145]">
            Recovered
          </text>
        </svg>
      </div>
    </div>
  );
}
