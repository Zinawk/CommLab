import React, { useState, useMemo, useCallback } from 'react';
import katex from 'katex';
import {
  Sliders,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import {
  createStationaryEnsemble,
  sampleFourRealizations,
  computeLiveStationarityPDFs,
} from './stationarityMath.js';
import RealizationsChart from './RealizationsChart.jsx';
import { CombinedPdfChart, AutocorrelationChart, SingleTimePdfChart } from './PdfCharts.jsx';

const TIME_COLORS = [
  '#0369A1',
  '#7E22CE',
  '#B45309',
  '#BE123C',
];

const PROCESS_MODES = [
  { id: 'sss', label: 'SSS (Strict-Sense)' },
  { id: 'wss', label: 'WSS (Wide-Sense)' },
  { id: 'non-stationary', label: 'Non-Stationary' },
];

export default function StationarySimulation({
  animTime = 0,
  onResetTimer,
  isPlaying,
  onTogglePlayPause,
  timerRemaining,
}) {
  const [processMode, setProcessMode] = useState('sss');
  const [showTimeSlices, setShowTimeSlices] = useState(false);
  const [pdfView, setPdfView] = useState('combined'); // 'combined' | 'slices'

  const [sampleTimes, setSampleTimes] = useState([140, 360, 620, 850]);
  const [tau, setTau] = useState(220);
  const [sigmaNoise, setSigmaNoise] = useState(0.24);
  const [period, setPeriod] = useState(220);
  const [realizationsCount] = useState(500);

  const [seed] = useState(0.314159);
  const ensemble = useMemo(() => createStationaryEnsemble(seed), [seed]);

  const handleResetAll = useCallback(() => {
    setProcessMode('sss');
    setSampleTimes([140, 360, 620, 850]);
    setTau(220);
    setSigmaNoise(0.24);
    setPeriod(220);
    if (onResetTimer) onResetTimer();
  }, [onResetTimer]);

  const handleTauChange = useCallback((newTau) => {
    setTau(newTau);
    setSampleTimes((prev) => {
      let t1 = prev[0];
      let t2 = t1 + newTau;
      if (t2 > 980) {
        t2 = 980;
        t1 = Math.max(20, t2 - newTau);
      } else if (t2 < 20) {
        t2 = 20;
        t1 = Math.min(980, t2 - newTau);
      }
      return [t1, t2, prev[2], prev[3]];
    });
  }, []);

  const handleChangeSampleTime = useCallback(
    (idx, newT) => {
      const clampedT = Math.max(20, Math.min(980, newT));
      if (idx === 1) {
        setTau(Math.round(clampedT - sampleTimes[0]));
      }
      setSampleTimes((prev) => {
        const next = [...prev];
        next[idx] = clampedT;
        if (idx === 0) {
          next[1] = Math.max(20, Math.min(980, clampedT + tau));
        }
        return next;
      });
    },
    [tau, sampleTimes]
  );

  const modelParams = useMemo(
    () => ({
      period,
      sigmaNoise,
      processMode,
    }),
    [period, sigmaNoise, processMode]
  );

  const scaledAnimTime = animTime * 50;

  const traces = useMemo(
    () => sampleFourRealizations(ensemble, sampleTimes, scaledAnimTime, modelParams),
    [ensemble, sampleTimes, scaledAnimTime, modelParams]
  );

  const pdfStats = useMemo(
    () =>
      computeLiveStationarityPDFs(
        ensemble,
        realizationsCount,
        sampleTimes,
        scaledAnimTime,
        modelParams
      ),
    [ensemble, realizationsCount, sampleTimes, scaledAnimTime, modelParams]
  );

  const { verification, means, variances, bins, bellCurve, autocorr } = pdfStats;

  const wssTexHtml = useMemo(
    () =>
      katex.renderToString(
        '\\mathbb{E}[X(t)] = \\mu,\\quad R_X(t, t+\\tau) = R_X(\\tau)',
        { throwOnError: false, displayMode: false }
      ),
    []
  );

  const sssTexHtml = useMemo(
    () =>
      katex.renderToString(
        'f_X(x;\\,t_1) = f_X(x;\\,t_2) = \\dots = f_X(x)',
        { throwOnError: false, displayMode: false }
      ),
    []
  );

  return (
    <div className="w-full flex-1 flex flex-col gap-6">
      <p className="text-sm text-[#6B5145] max-w-2xl">
        Compare Strict-Sense Stationary (SSS), Wide-Sense Stationary (WSS), and Non-Stationary stochastic processes across interactive time slices t₁–t₄.
      </p>

      {/* Main Two-Zone Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left: Charts Area */}
        <div className="flex-1 min-w-0 w-full grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <RealizationsChart
            traces={traces}
            sampleTimes={sampleTimes}
            timeColors={TIME_COLORS}
            onChangeSampleTime={handleChangeSampleTime}
          />

          <div className="flex flex-col gap-5 min-w-0">
            <AutocorrelationChart
              autocorr={autocorr}
              currentTau={tau}
              timeColors={TIME_COLORS}
            />

            <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E4DBD2]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B5145]">
                  Distribution View
                </span>
                <div className="flex items-center gap-1 bg-[#F5F0EA] border border-[#E4DBD2] p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPdfView('combined')}
                    className={`px-2.5 py-1 rounded-md cursor-pointer text-xs font-semibold transition-colors ${
                      pdfView === 'combined'
                        ? 'bg-[#9A4324] text-white'
                        : 'text-[#6B5145] hover:text-[#3B2923]'
                    }`}
                  >
                    Combined PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfView('slices')}
                    className={`px-2.5 py-1 rounded-md cursor-pointer text-xs font-semibold transition-colors ${
                      pdfView === 'slices'
                        ? 'bg-[#9A4324] text-white'
                        : 'text-[#6B5145] hover:text-[#3B2923]'
                    }`}
                  >
                    Time Slices t₁–t₄
                  </button>
                </div>
              </div>

              {pdfView === 'combined' ? (
                <CombinedPdfChart
                  bins={bins}
                  bellCurve={bellCurve}
                  timeColors={TIME_COLORS}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sampleTimes.map((tk, idx) => (
                    <SingleTimePdfChart
                      key={`single-pdf-${idx}`}
                      index={idx}
                      bins={bins}
                      bellCurve={bellCurve}
                      color={TIME_COLORS[idx]}
                      mean={means[idx] || 0}
                      variance={variances[idx] || 1}
                      sampleTime={tk}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Parameters Panel */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DBD2]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#9A4324]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                Process Controls
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {onTogglePlayPause && (
                <button
                  type="button"
                  onClick={onTogglePlayPause}
                  className="px-2.5 py-1 rounded-lg bg-[#9A4324] hover:bg-[#7D341A] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span className="tabular-nums">
                    {typeof timerRemaining === 'number'
                      ? `${timerRemaining.toFixed(0)}s`
                      : isPlaying
                      ? 'Pause'
                      : 'Play'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetAll}
                className="p-1.5 rounded-lg bg-white hover:bg-[#EDE4DA] border border-[#E4DBD2] text-[#6B5145] hover:text-[#3B2923] transition-colors cursor-pointer"
                title="Reset parameters"
                aria-label="Reset parameters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="s5-process-mode" className="text-xs font-semibold text-[#3B2923] block">
              Process Mode
            </label>
            <select
              id="s5-process-mode"
              value={processMode}
              onChange={(e) => setProcessMode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4C8BC] text-sm text-[#3B2923] focus:outline-none focus:border-[#9A4324] cursor-pointer"
            >
              {PROCESS_MODES.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 pt-3 border-t border-[#E4DBD2]">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B5145] font-medium">Noise (σ)</span>
                <span className="font-mono font-semibold text-[#9A4324] tabular-nums">
                  {sigmaNoise.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.80"
                step="0.01"
                value={sigmaNoise}
                onChange={(e) => setSigmaNoise(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B5145] font-medium">Period (T₀)</span>
                <span className="font-mono font-semibold text-[#3B2923] tabular-nums">
                  {period} ms
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="450"
                step="5"
                value={period}
                onChange={(e) => setPeriod(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B5145] font-medium">Lag (τ)</span>
                <span className="font-mono font-semibold text-[#3B2923] tabular-nums">
                  {tau >= 0 ? `+${tau}` : tau} ms
                </span>
              </div>
              <input
                type="range"
                min="-350"
                max="500"
                step="5"
                value={tau}
                onChange={(e) => handleTauChange(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>
          </div>

          {/* Collapsible Sample Times */}
          <div className="pt-3 border-t border-[#E4DBD2]">
            <button
              type="button"
              onClick={() => setShowTimeSlices((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-[#3B2923] hover:text-[#9A4324] cursor-pointer py-1 transition-colors"
            >
              <span>Time Slices (t₁–t₄)</span>
              <ChevronDown
                className={`w-4 h-4 text-[#6B5145] transition-transform ${showTimeSlices ? 'rotate-180' : ''}`}
              />
            </button>

            {showTimeSlices && (
              <div className="pt-2 space-y-2.5">
                {sampleTimes.map((tk, idx) => (
                  <div key={`slider-t-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold" style={{ color: TIME_COLORS[idx] }}>
                        t<sub>{idx + 1}</sub>
                      </span>
                      <span className="font-mono text-[#3B2923] font-semibold tabular-nums">
                        {tk} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="980"
                      step="5"
                      value={tk}
                      onChange={(e) => handleChangeSampleTime(idx, parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Verdict */}
          <div className="pt-3 border-t border-[#E4DBD2]">
            {verification.finalBadge === 'SSS' && (
              <div className="flex items-center gap-2 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] rounded-lg px-3 py-2 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                <span>Strict-Sense Stationary (SSS)</span>
              </div>
            )}
            {verification.finalBadge === 'WSS' && (
              <div className="flex items-center gap-2 bg-[#F0F9FF] border border-[#BAE6FD] text-[#075985] rounded-lg px-3 py-2 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#0369A1] shrink-0" />
                <span>Wide-Sense Stationary (WSS)</span>
              </div>
            )}
            {verification.finalBadge === 'NON_STATIONARY' && (
              <div className="flex items-center gap-2 bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] rounded-lg px-3 py-2 text-xs font-semibold">
                <XCircle className="w-4 h-4 text-[#BE123C] shrink-0" />
                <span>Non-Stationary Process</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Formulas & Explanation */}
      <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Stationarity Conditions
          </h3>
          <div className="space-y-2 text-sm text-[#3B2923] overflow-x-auto">
            <div>
              <span className="text-xs font-semibold text-[#6B5145] mr-2">WSS:</span>
              <span dangerouslySetInnerHTML={{ __html: wssTexHtml }} />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#6B5145] mr-2">SSS:</span>
              <span dangerouslySetInnerHTML={{ __html: sssTexHtml }} />
            </div>
          </div>
          <div className="font-mono text-xs text-[#6B5145] pt-2 border-t border-[#E4DBD2] tabular-nums">
            {`Δμ = ${verification.meanDiff.toFixed(2)} · ΔR = ${verification.maxRDiff.toFixed(2)} · Classification = ${verification.finalBadge}`}
          </div>
        </div>

        <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Explanation
          </h3>
          <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
            <p>
              A Wide-Sense Stationary (WSS) process maintains constant mean E[X(t)] and a lag-only autocorrelation R_X(τ), causing R(t₁, t₁+τ) and R(t₃, t₃+τ) to overlap closely.
            </p>
            <p>
              Strict-Sense Stationarity (SSS) additionally requires every time slice PDF f_X(x; tₖ) to remain invariant under time shifts; in Non-Stationary mode both moments and distributions drift with t.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
