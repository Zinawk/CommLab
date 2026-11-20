import React, { useState, useRef } from 'react';
import {
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  ChevronDown,
  Mic,
  Square,
  Upload,
} from 'lucide-react';

const WAVEFORM_OPTIONS = [
  { id: 'sine', label: 'Sinusoidal' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'square', label: 'Square' },
  { id: 'voice', label: 'Real Voice (1 min)' },
];

export default function ModulationControls({
  Am,
  setAm,
  fm,
  setFm,
  Ac,
  setAc,
  fc,
  setFc,
  phiDeg,
  setPhiDeg,
  waveform,
  setWaveform,
  noiseEnabled,
  setNoiseEnabled,
  snrDb,
  setSnrDb,
  audioVolume,
  setAudioVolume,
  onResetAll,
  isQuadratureNull,
  isPlaying,
  onTogglePlayPause,
  timerRemaining,
  isCustomVoice = false,
  voicePreset = 'talk',
  onSelectVoicePreset,
  isRecordingMic = false,
  recordingSeconds = 0,
  onToggleMicRecord,
  onUploadVoiceFile,
  onUseDefaultVoice,
}) {
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef(null);
  const isVoice = waveform === 'voice';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadVoiceFile) {
      onUploadVoiceFile(file);
    }
    e.target.value = '';
  };

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-4 sm:p-5 space-y-4">
      {/* Header + Play/Pause + Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E4DBD2]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#9A4324]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
            Modulation Controls
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {onTogglePlayPause && (
            <button
              type="button"
              onClick={onTogglePlayPause}
              className="px-2.5 py-1 rounded-lg bg-[#9A4324] hover:bg-[#7D341A] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
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
            onClick={onResetAll}
            className="p-1.5 rounded-lg bg-white hover:bg-[#EDE4DA] border border-[#E4DBD2] text-[#6B5145] hover:text-[#3B2923] transition-colors cursor-pointer"
            title="Reset all parameters"
            aria-label="Reset all parameters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Group 1: Waveform Source */}
      <div className="space-y-1.5">
        <label htmlFor="s5-waveform-select" className="text-xs font-semibold text-[#3B2923] block">
          Message Waveform
        </label>
        <select
          id="s5-waveform-select"
          value={waveform}
          onChange={(e) => setWaveform(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4C8BC] text-sm text-[#3B2923] focus:outline-none focus:border-[#9A4324] cursor-pointer"
        >
          {WAVEFORM_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Group 2: Parameter Sliders */}
      <div className="space-y-3 pt-3 border-t border-[#E4DBD2]">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#6B5145] font-medium">
              Message Amp (A<sub>m</sub>)
            </span>
            <span className="font-mono text-[#9A4324] font-semibold tabular-nums">
              {Am.toFixed(2)} V
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.0"
            step="0.05"
            value={Am}
            onChange={(e) => setAm(parseFloat(e.target.value))}
            className="w-full"
            aria-label="Message Amplitude Am"
          />
        </div>

        {!isVoice ? (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#6B5145] font-medium">
                Message Freq (f<sub>m</sub>)
              </span>
              <span className="font-mono text-[#3B2923] font-semibold tabular-nums">{fm} Hz</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="10"
              value={fm}
              onChange={(e) => setFm(parseInt(e.target.value, 10))}
              className="w-full"
              aria-label="Message Frequency fm"
            />
          </div>
        ) : (
          <div className="flex justify-between items-center text-xs bg-white border border-[#E4DBD2] rounded-lg px-3 py-2">
            <span className="text-[#6B5145] font-medium">Voice Bandwidth</span>
            <span className="font-mono text-[#3B2923] font-semibold tabular-nums">3.6 kHz</span>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#6B5145] font-medium">
              Carrier Amp (A<sub>c</sub>)
            </span>
            <span className="font-mono text-[#3B2923] font-semibold tabular-nums">
              {Ac.toFixed(2)} V
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.0"
            step="0.05"
            value={Ac}
            onChange={(e) => setAc(parseFloat(e.target.value))}
            className="w-full"
            aria-label="Carrier Amplitude Ac"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#6B5145] font-medium">
              Carrier Freq (f<sub>c</sub>)
            </span>
            <span className="font-mono text-[#3B2923] font-semibold tabular-nums">
              {(fc / 1000).toFixed(1)} kHz
            </span>
          </div>
          <input
            type="range"
            min="5000"
            max="50000"
            step="1000"
            value={fc}
            onChange={(e) => setFc(parseInt(e.target.value, 10))}
            className="w-full"
            aria-label="Carrier Frequency fc"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className={`font-medium ${isQuadratureNull ? 'text-[#BE123C]' : 'text-[#6B5145]'}`}>
              {isQuadratureNull ? 'Phase Error (φ) · Null' : 'Phase Error (φ)'}
            </span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                isQuadratureNull ? 'text-[#BE123C]' : 'text-[#3B2923]'
              }`}
            >
              {phiDeg}°
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            step="1"
            value={phiDeg}
            onChange={(e) => setPhiDeg(parseInt(e.target.value, 10))}
            className="w-full"
            aria-label="Carrier Phase phi"
          />
        </div>
      </div>

      {/* Group 3: 1-Min Voice Source */}
      <div className="pt-3 border-t border-[#E4DBD2] space-y-2.5">
        <span className="text-xs font-semibold text-[#3B2923] block">
          1-Minute Voice Source
        </span>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-white border border-[#E4DBD2]">
          <button
            type="button"
            onClick={() => onSelectVoicePreset && onSelectVoicePreset('talk')}
            className={`px-2 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              !isCustomVoice && voicePreset === 'talk'
                ? 'bg-[#9A4324] text-white'
                : 'text-[#6B5145] hover:text-[#3B2923]'
            }`}
            title="1-minute two-speaker casual dialogue"
          >
            Dialogue
          </button>
          <button
            type="button"
            onClick={() => onSelectVoicePreset && onSelectVoicePreset('lab')}
            className={`px-2 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              !isCustomVoice && voicePreset === 'lab'
                ? 'bg-[#9A4324] text-white'
                : 'text-[#6B5145] hover:text-[#3B2923]'
            }`}
            title="1-minute single-speaker lab voice"
          >
            Lab Voice
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMicRecord}
            className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              isRecordingMic
                ? 'bg-[#BE123C] border-[#BE123C] text-white'
                : 'bg-white hover:bg-[#EDE4DA] border-[#D4C8BC] text-[#3B2923]'
            }`}
            title={isRecordingMic ? 'Stop microphone recording' : 'Record your own talk (up to 60s)'}
          >
            {isRecordingMic ? (
              <>
                <Square className="w-3 h-3" />
                <span className="tabular-nums">Stop {recordingSeconds}s</span>
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 text-[#9A4324]" />
                <span>Record Mic</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#EDE4DA] border border-[#D4C8BC] text-xs font-semibold text-[#3B2923] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
            title="Upload audio file (up to 60s)"
          >
            <Upload className="w-3 h-3 text-[#9A4324]" />
            <span>Upload</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {isCustomVoice && onUseDefaultVoice && (
          <button
            type="button"
            onClick={onUseDefaultVoice}
            className="w-full text-left text-xs text-[#9A4324] hover:text-[#7D341A] font-semibold cursor-pointer"
          >
            Restore built-in 1-minute talk
          </button>
        )}
      </div>

      {/* Group 4: Collapsible Channel & Audio */}
      <div className="pt-3 border-t border-[#E4DBD2]">
        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[#3B2923] hover:text-[#9A4324] cursor-pointer py-1 transition-colors"
        >
          <span>Channel &amp; Audio Options</span>
          <ChevronDown
            className={`w-4 h-4 text-[#6B5145] transition-transform ${showOptions ? 'rotate-180' : ''}`}
          />
        </button>

        {showOptions && (
          <div className="pt-3 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-[#6B5145] font-medium">
                  <Volume2 className="w-3.5 h-3.5 text-[#9A4324]" />
                  <span>Audio Volume</span>
                </span>
                <span className="font-mono text-[#3B2923] font-semibold tabular-nums">
                  {Math.round((audioVolume / 0.5) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.02"
                value={audioVolume}
                onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                className="w-full"
                aria-label="Audio Volume"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-medium text-[#3B2923] cursor-pointer">
                <span>AWGN Channel Noise</span>
                <input
                  type="checkbox"
                  checked={noiseEnabled}
                  onChange={(e) => setNoiseEnabled(e.target.checked)}
                  className="accent-[#9A4324] w-4 h-4 rounded cursor-pointer"
                />
              </label>

              {noiseEnabled && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6B5145]">Channel SNR</span>
                    <span className="font-mono text-[#9A4324] font-semibold tabular-nums">
                      {snrDb} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={snrDb}
                    onChange={(e) => setSnrDb(parseInt(e.target.value, 10))}
                    className="w-full"
                    aria-label="AWGN SNR in dB"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
