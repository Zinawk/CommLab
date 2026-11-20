import React, { useState } from 'react';
import { Radio, Waves } from 'lucide-react';
import RandomNoiseSimulation from './RandomNoiseSimulation.jsx';
import SsbSimulation from './SsbSimulation.jsx';

/**
 * Module 1 · 1.8 Random Signal & Noise OR Module 2 · 2.2 SSB Simulation Hub
 */
export default function Simulation({ section = 'ssb' }) {
  const [activeTab, setActiveTab] = useState('ssb_gen'); // 'ssb_gen' | 'ssb_demod'

  if (section === 'random') {
    return (
      <div className="w-full flex-1 flex flex-col space-y-6 py-2">
        <div className="border-b border-[#E4DBD2] pb-4">
          <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
            Module 1 · Section 1.8
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3B2923] tracking-tight mt-0.5">
            Random Signal &amp; Additive Gaussian Noise
          </h2>
        </div>

        <RandomNoiseSimulation />
      </div>
    );
  }

  const headingTitle =
    activeTab === 'ssb_gen'
      ? 'SSB — Single-Sideband Generation'
      : 'SSB — Coherent Demodulation';

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 py-2">
      {/* Module Header + Segmented Navigation */}
      <div className="border-b border-[#E4DBD2] pb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
            Module 2 · Section 2.2
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3B2923] tracking-tight mt-0.5">
            {headingTitle}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-[#F5F0EA] border border-[#E4DBD2] p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ssb_gen')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'ssb_gen'
                ? 'bg-white text-[#9A4324] border border-[#E4DBD2] shadow-xs'
                : 'text-[#6B5145] hover:text-[#3B2923]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">SSB Generation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ssb_demod')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'ssb_demod'
                ? 'bg-white text-[#9A4324] border border-[#E4DBD2] shadow-xs'
                : 'text-[#6B5145] hover:text-[#3B2923]'
            }`}
          >
            <Waves className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate hidden sm:inline">SSB Coherent Demodulation</span>
            <span className="inline sm:hidden">SSB Demod</span>
          </button>
        </div>
      </div>

      {activeTab === 'ssb_gen' && <SsbSimulation stage="gen" />}
      {activeTab === 'ssb_demod' && <SsbSimulation stage="demod" />}
    </div>
  );
}
