import React from 'react';
import MathView from './MathView.jsx';
import {
  Scale,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/**
 * Clean light-theme System Properties Analysis card
 */
export default function PropertiesCard({ analysis }) {
  if (!analysis) return null;

  const {
    systemName,
    systemEquation,
    impulseEquation,
    linearity,
    timeInvariance,
    causality,
    stability,
  } = analysis;

  const properties = [
    { key: 'linearity', data: linearity, icon: Scale, label: 'Linearity' },
    { key: 'timeInvariance', data: timeInvariance, icon: Clock, label: 'Time Invariance' },
    { key: 'causality', data: causality, icon: ArrowRight, label: 'Causality' },
    { key: 'stability', data: stability, icon: ShieldCheck, label: 'BIBO Stability' },
  ];

  return (
    <div className="bg-white border border-[#E4DBD2] rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E4DBD2]">
        <h4 className="text-sm font-bold text-[#3B2923]">{systemName}</h4>
        <div className="flex flex-wrap items-center gap-5 text-xs text-[#3B2923]">
          <div className="inline-flex items-center gap-1.5">
            <span className="text-[#6B5145] font-medium">I/O:</span>
            <MathView math={systemEquation} />
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-[#6B5145] font-medium">Impulse h:</span>
            <MathView math={impulseEquation} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {properties.map(({ key, data: prop, icon: Icon, label }) => {
          const isPassed = prop.passed;

          return (
            <div
              key={key}
              className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-lg p-3.5 flex flex-col justify-between space-y-2.5"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-[#9A4324] shrink-0" />
                    <span className="text-xs font-bold text-[#3B2923] truncate">{label}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold shrink-0 ${
                      isPassed ? 'text-[#047857]' : 'text-[#BE123C]'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{isPassed ? 'Yes' : 'No'}</span>
                  </span>
                </div>

                <p className="text-xs text-[#6B5145] leading-relaxed">{prop.explanation}</p>
              </div>

              <div className="text-xs text-[#3B2923] pt-2 border-t border-[#E4DBD2] overflow-x-auto">
                <MathView math={prop.test} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
