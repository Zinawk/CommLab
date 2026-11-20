import React, { useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

function ModuleOneIllustration() {
  const path = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 140; i++) {
      const u = i / 140;
      const x = 14 + u * 312;
      const env = Math.exp(-Math.pow((u - 0.5) * 3.0, 2));
      const y = 46 - 30 * env * Math.cos(2 * Math.PI * 5 * (u - 0.5));
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, []);

  return (
    <div className="bg-white border border-[#E4DBD2] rounded-xl px-4 py-3">
      <div className="flex items-center justify-between text-[10px] font-mono text-[#6B5145] mb-1">
        <span>Signal Synthesis &amp; Impulse Response</span>
        <span>x(t) · h(t)</span>
      </div>
      <svg
        viewBox="0 0 340 88"
        className="w-full h-20 block"
        role="img"
        aria-label="Signal packet and impulse response waveform illustration"
      >
        <line x1="14" y1="46" x2="326" y2="46" stroke="#E4DBD2" strokeWidth="1" />
        <line
          x1="170"
          y1="8"
          x2="170"
          y2="80"
          stroke="#E4DBD2"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path
          d={path}
          fill="none"
          stroke="#9A4324"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function ModuleTwoIllustration() {
  const { modPath, envTopPath, envBottomPath } = useMemo(() => {
    const modPts = [];
    const topPts = [];
    const botPts = [];
    for (let i = 0; i <= 160; i++) {
      const u = i / 160;
      const x = 14 + u * 312;
      const env = 18 + 12 * Math.cos(2 * Math.PI * 2 * u);
      const carrier = Math.cos(2 * Math.PI * 20 * u);
      modPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${(46 - env * carrier).toFixed(1)}`);
      topPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${(46 - env).toFixed(1)}`);
      botPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${(46 + env).toFixed(1)}`);
    }
    return {
      modPath: modPts.join(' '),
      envTopPath: topPts.join(' '),
      envBottomPath: botPts.join(' '),
    };
  }, []);

  return (
    <div className="bg-white border border-[#E4DBD2] rounded-xl px-4 py-3">
      <div className="flex items-center justify-between text-[10px] font-mono text-[#6B5145] mb-1">
        <span>Modulated Carrier &amp; Envelope</span>
        <span>AM / SSB</span>
      </div>
      <svg
        viewBox="0 0 340 88"
        className="w-full h-20 block"
        role="img"
        aria-label="Amplitude modulated carrier and envelope waveform illustration"
      >
        <line x1="14" y1="46" x2="326" y2="46" stroke="#E4DBD2" strokeWidth="1" />
        <path
          d={envTopPath}
          fill="none"
          stroke="#0369A1"
          strokeOpacity="0.65"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <path
          d={envBottomPath}
          fill="none"
          stroke="#0369A1"
          strokeOpacity="0.65"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <path
          d={modPath}
          fill="none"
          stroke="#9A4324"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function ModuleOverview({
  moduleData,
  onBackToOverview,
  onSelectSection,
}) {
  if (!moduleData) return null;

  const isModuleOne = moduleData.id === 1;

  return (
    <div className="w-full max-w-6xl mx-auto py-3 sm:py-5 space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToOverview}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#F5F0EA] hover:bg-[#EDE4DA] text-[#3B2923] border border-[#E4DBD2] text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#9A4324]" />
          <span>Back to Simulation Home Page</span>
        </button>

        <span className="text-xs font-mono text-[#6B5145] tabular-nums">
          {moduleData.label} · {moduleData.sections.length}{' '}
          {moduleData.sections.length === 1 ? 'Topic' : 'Topics'}
        </span>
      </div>

      {/* Module Banner with Introduction & Relevant Waveform Visual */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-2xl p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-2.5">
          <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
            {moduleData.label}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#3B2923] leading-snug text-balance">
            {moduleData.label} – {moduleData.subtitle}
          </h1>
          <p className="text-sm sm:text-base text-[#6B5145] leading-relaxed max-w-2xl">
            {moduleData.description}
          </p>
        </div>

        <div className="lg:col-span-5">
          {isModuleOne ? <ModuleOneIllustration /> : <ModuleTwoIllustration />}
        </div>
      </section>

      {/* Organized Topic Grid */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#6B5145]">
          Select a Topic to Simulate
        </h2>

        <div
          className={`grid gap-4 ${
            isModuleOne
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {moduleData.sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                className="group text-left bg-[#F5F0EA] hover:bg-[#EDE4DA] border border-[#E4DBD2] hover:border-[#C88A72] rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-colors cursor-pointer"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-bold text-[#9A4324] tabular-nums">
                      {section.code}
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-white border border-[#E4DBD2] flex items-center justify-center text-[#9A4324] group-hover:bg-[#9A4324] group-hover:text-white group-hover:border-[#9A4324] transition-colors shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#3B2923] leading-snug">
                    {section.code} {section.title}
                  </h3>

                  <p className="text-xs text-[#6B5145] leading-relaxed">
                    {section.summary}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[#E4DBD2] flex items-center justify-between text-xs font-semibold text-[#9A4324]">
                  <span>Open Simulation</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
