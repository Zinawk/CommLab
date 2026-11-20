import React, { useMemo } from 'react';
import MathView from './MathView.jsx';
import { getDiscreteConvolutionStep } from './signalMath.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Light-theme Convolution Step Inspector
 */
export default function ConvolutionInspector({
  isContinuous,
  selectedSample,
  onSelectSample,
  xSignal,
  hSignal,
}) {
  const varSym = isContinuous ? 't' : 'n';

  const stepData = useMemo(() => {
    if (isContinuous) return null;
    return getDiscreteConvolutionStep(selectedSample, xSignal, hSignal);
  }, [isContinuous, selectedSample, xSignal, hSignal]);

  const activeTerms = useMemo(() => {
    if (!stepData) return [];
    return stepData.terms.filter((t) => t.product !== 0);
  }, [stepData]);

  const currentOutputVal = stepData ? stepData.totalSum : 0;

  return (
    <div className="bg-white border border-[#E4DBD2] rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E4DBD2]">
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#3B2923]">
          <span className="font-bold">
            {isContinuous ? 'Continuous Convolution Integral' : `Discrete Evaluation at n = ${selectedSample}`}
          </span>
          {!isContinuous && (
            <span className="font-mono text-[#9A4324] font-bold tabular-nums">
              y[{selectedSample}] = {currentOutputVal.toFixed(3)}
            </span>
          )}
        </div>

        <div className="flex items-center bg-[#F5F0EA] border border-[#E4DBD2] rounded-lg px-1.5 py-1 text-xs font-mono text-[#3B2923]">
          <button
            type="button"
            onClick={() => selectedSample > -3 && onSelectSample(selectedSample - 1)}
            className="p-1 text-[#6B5145] hover:text-[#3B2923] cursor-pointer"
            aria-label="Previous sample"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2.5 font-semibold tabular-nums">
            {varSym} = {selectedSample}
          </span>
          <button
            type="button"
            onClick={() => selectedSample < 20 && onSelectSample(selectedSample + 1)}
            className="p-1 text-[#6B5145] hover:text-[#3B2923] cursor-pointer"
            aria-label="Next sample"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isContinuous ? (
        activeTerms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4DBD2] text-[#6B5145] font-semibold">
                  <th className="py-2 px-3">Index k</th>
                  <th className="py-2 px-3">x[k]</th>
                  <th className="py-2 px-3">h[{selectedSample} − k]</th>
                  <th className="py-2 px-3">h Value</th>
                  <th className="py-2 px-3 text-right">Product x[k]·h[n−k]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DBD2] font-mono text-xs text-[#3B2923] tabular-nums">
                {activeTerms.map((term) => (
                  <tr key={`term-${term.k}`} className="hover:bg-[#F5F0EA]/60">
                    <td className="py-2 px-3 text-[#9A4324] font-semibold">k = {term.k}</td>
                    <td className="py-2 px-3">{term.xVal.toFixed(3)}</td>
                    <td className="py-2 px-3 text-[#6B5145]">h[{selectedSample - term.k}]</td>
                    <td className="py-2 px-3">{term.hVal.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right font-bold text-[#047857]">
                      {term.product >= 0 ? '+' : ''}
                      {term.product.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[#6B5145]">
            No overlapping non-zero support at n = {selectedSample} (y[{selectedSample}] = 0.000).
          </div>
        )
      ) : (
        <div className="py-4 text-center space-y-2 text-xs text-[#3B2923]">
          <MathView math="y(t) = (x * h)(t) = \int_{-\infty}^{\infty} x(\tau)\,h(t - \tau)\,d\tau" display />
          <p className="text-xs text-[#6B5145] max-w-lg mx-auto">
            In continuous-time mode, h(t − τ) slides continuously across x(τ) and integrates numerically with step Δτ = 0.2. Switch to Discrete [n] to inspect exact term-by-term summation.
          </p>
        </div>
      )}
    </div>
  );
}
