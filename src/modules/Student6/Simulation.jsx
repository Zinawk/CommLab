import React, { useState } from 'react';
import { Activity, BarChart2 } from 'lucide-react';
import AutocorrSimulation from './AutocorrSimulation.jsx';
import PsdSimulation from './PsdSimulation.jsx';

/**
 * Correlation & Spectral Analysis Simulation Hub:
 * 1. Autocorrelation (Time-lag correlation analysis)
 * 2. Power Spectral Density (PSD) (Frequency-domain power distribution)
 */
export default function Simulation() {
  const [activeTab, setActiveTab] = useState('autocorr'); // 'autocorr' | 'psd'

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 py-2">
      {/* Module Header + Segmented Navigation */}
      <div className="border-b border-[#E4DBD2] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
            Module 1 · Section 1.7
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3B2923] tracking-tight mt-0.5">
            {activeTab === 'autocorr'
              ? 'Autocorrelation Function R_X(τ)'
              : 'Power Spectral Density (PSD)'}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-[#F5F0EA] border border-[#E4DBD2] p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('autocorr')}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'autocorr'
                ? 'bg-white text-[#9A4324] border border-[#E4DBD2] shadow-xs'
                : 'text-[#6B5145] hover:text-[#3B2923]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>Autocorrelation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('psd')}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'psd'
                ? 'bg-white text-[#9A4324] border border-[#E4DBD2] shadow-xs'
                : 'text-[#6B5145] hover:text-[#3B2923]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Power Spectral Density (PSD)</span>
            <span className="inline sm:hidden">PSD</span>
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      {activeTab === 'autocorr' && <AutocorrSimulation />}
      {activeTab === 'psd' && <PsdSimulation />}
    </div>
  );
}
