import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import { SlidersHorizontal, BarChart2 } from 'lucide-react';
import ModulationControls from './ModulationControls.jsx';
import ModulationColumn from './ModulationColumn.jsx';
import StationarySimulation from './StationarySimulation.jsx';
import { generateModulationSignals } from './modulationMath.js';
import { audioEngine } from './audioSynthesizer.js';

const TIMER_MAX_SECONDS = 60;

export default function Simulation({ section = 'dsb', onTitleChange }) {
  const [activeTab, setActiveTab] = useState('waveforms'); // 'waveforms' | 'spectrum'

  useEffect(() => {
    if (onTitleChange) {
      onTitleChange(
        section === 'stationary' ? 'SSS vs WSS Stationarity' : 'DSB-SC Modulation'
      );
    }
  }, [section, onTitleChange]);

  // Interactive DSB-SC Parameters (Default graph: Sinusoidal)
  const [Am, setAm] = useState(1.0);
  const [fm, setFm] = useState(280);
  const [Ac, setAc] = useState(1.0);
  const [fc, setFc] = useState(10000);
  const [phiDeg, setPhiDeg] = useState(0);
  const [waveform, setWaveform] = useState('sine');

  // Auxiliary Options
  const [noiseEnabled, setNoiseEnabled] = useState(false);
  const [snrDb, setSnrDb] = useState(20);
  const [showOverlay] = useState(true);

  // 60-second continuous timer and animation loop
  const [isPlaying, setIsPlaying] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(TIMER_MAX_SECONDS);
  const [animTime, setAnimTime] = useState(0);

  // 1-Minute Voice State (defaults to Dialogue 'talk'; 'lab' also selectable)
  const [voicePreset, setVoicePreset] = useState('talk');
  const [voiceData, setVoiceData] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(true);
  const [voiceTime, setVoiceTime] = useState(0);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const lastFrameRef = useRef(null);
  const timerStartRef = useRef(null);
  const initialRemainingRef = useRef(TIMER_MAX_SECONDS);
  const mediaRecorderRef = useRef(null);
  const micStreamRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const recordChunksRef = useRef([]);

  // Audio Playback State
  const [audioMode, setAudioMode] = useState(null);
  const [audioVolume, setAudioVolume] = useState(0.22);
  const [audioError, setAudioError] = useState(null);
  const latestAudioSignalsRef = useRef({
    mValues: null,
    yValues: null,
    timeSpan: 0.01,
    fm: 280,
  });

  // Preload 1-minute real talk voice sample on mount for DSB-SC section
  useEffect(() => {
    if (section !== 'dsb') {
      setVoiceLoading(false);
      return undefined;
    }

    let cancelled = false;
    setVoiceLoading(true);
    audioEngine.loadDefaultVoice().then((loaded) => {
      if (cancelled) return;
      setVoiceLoading(false);
      if (loaded) {
        setVoiceData(loaded);
      } else if (audioEngine.lastError) {
        setAudioError(audioEngine.lastError);
      }
    });

    audioEngine.setOnVoiceEnded(() => {
      setAudioMode(null);
      setVoiceTime(0);
    });

    return () => {
      cancelled = true;
      audioEngine.setOnVoiceEnded(null);
    };
  }, [section]);

  useEffect(() => {
    audioEngine.setVolume(audioVolume);
  }, [audioVolume]);

  const stopMicTracks = useCallback(() => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      audioEngine.stop();
      stopMicTracks();
    };
  }, [stopMicTracks]);

  const stopAllAudio = useCallback(() => {
    if (audioEngine.activeType === 'voice') {
      const pos = audioEngine.getVoicePosition();
      setVoiceTime(pos);
    }
    audioEngine.stop();
    setAudioMode(null);
    setAudioError(null);
  }, []);

  const playVoiceChannel = useCallback(
    async (channel) => {
      const started = await audioEngine.playVoiceMode(channel, {
        Am,
        Ac,
        phiDeg,
        noiseEnabled,
        snrDb,
      });
      if (started) {
        setAudioMode(channel === 'original' ? 'voice-original' : 'voice-recovered');
        setAudioError(null);
      } else {
        setAudioMode(null);
        setAudioError(audioEngine.lastError || 'Unable to play 1-minute voice audio.');
      }
    },
    [Am, Ac, phiDeg, noiseEnabled, snrDb]
  );

  const playToneChannel = useCallback(async (channel) => {
    const started = await audioEngine.playMode(channel, latestAudioSignalsRef.current);
    if (started) {
      setAudioMode(channel === 'original' ? 'tone-original' : 'tone-recovered');
      setAudioError(null);
    } else {
      setAudioMode(null);
      setAudioError(audioEngine.lastError || 'Unable to play simulation tone.');
    }
  }, []);

  const toggleOriginalVoice = useCallback(() => {
    if (audioMode === 'voice-original') {
      stopAllAudio();
    } else {
      playVoiceChannel('original');
    }
  }, [audioMode, playVoiceChannel, stopAllAudio]);

  const toggleRecoveredVoice = useCallback(() => {
    if (audioMode === 'voice-recovered') {
      stopAllAudio();
    } else {
      playVoiceChannel('recovered');
    }
  }, [audioMode, playVoiceChannel, stopAllAudio]);

  const toggleOriginalTone = useCallback(() => {
    if (audioMode === 'tone-original') {
      stopAllAudio();
    } else {
      playToneChannel('original');
    }
  }, [audioMode, playToneChannel, stopAllAudio]);

  const toggleRecoveredTone = useCallback(() => {
    if (audioMode === 'tone-recovered') {
      stopAllAudio();
    } else {
      playToneChannel('recovered');
    }
  }, [audioMode, playToneChannel, stopAllAudio]);

  const handleWaveformChange = useCallback(
    (nextWaveform) => {
      if (nextWaveform !== waveform) {
        if (audioMode === 'tone-original' || audioMode === 'tone-recovered') {
          stopAllAudio();
        }
        setWaveform(nextWaveform);
      }
    },
    [waveform, audioMode, stopAllAudio]
  );

  const handleSeekVoice = useCallback(
    (sec) => {
      const dur = voiceData?.duration || TIMER_MAX_SECONDS;
      const clamped = Math.max(0, Math.min(dur, sec));
      setVoiceTime(clamped);
      audioEngine.setVoiceOffset(clamped);
    },
    [voiceData]
  );

  const handleToggleMicRecord = useCallback(async () => {
    if (isRecordingMic) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioError('Microphone recording is not supported in this browser.');
      return;
    }

    stopAllAudio();
    setAudioError(null);
    audioEngine.init();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      recordChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stopMicTracks();
        setIsRecordingMic(false);
        const blob = new Blob(recordChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size > 0) {
          const decoded = await audioEngine.decodeAudioBlob(blob, 'Mic Voice Recording');
          if (decoded) {
            setVoiceData(decoded);
            setVoiceTime(0);
          } else {
            setAudioError(audioEngine.lastError || 'Failed to decode recorded audio.');
          }
        }
      };

      recorder.start(250);
      setIsRecordingMic(true);
      setRecordingSeconds(0);

      const startMs = performance.now();
      recordIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((performance.now() - startMs) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= TIMER_MAX_SECONDS && recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 250);
    } catch (err) {
      stopMicTracks();
      setIsRecordingMic(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setAudioError(
          'Microphone permission was denied. Allow microphone access in your browser site settings, or use Upload to load an audio file.'
        );
      } else if (err?.name === 'NotFoundError') {
        setAudioError('No microphone device was found. Connect a microphone or use Upload.');
      } else {
        setAudioError(err?.message || 'Unable to access microphone.');
      }
    }
  }, [isRecordingMic, stopAllAudio, stopMicTracks]);

  const handleUploadVoiceFile = useCallback(
    async (file) => {
      stopAllAudio();
      setAudioError(null);
      const decoded = await audioEngine.decodeAudioBlob(file, file.name);
      if (decoded) {
        setVoiceData(decoded);
        setVoiceTime(0);
      } else {
        setAudioError(audioEngine.lastError || 'Unable to decode selected audio file.');
      }
    },
    [stopAllAudio]
  );

  const handleSelectVoicePreset = useCallback(
    async (presetKey) => {
      stopAllAudio();
      setAudioError(null);
      setVoicePreset(presetKey);
      setVoiceLoading(true);
      const loaded = await audioEngine.loadVoicePreset(presetKey);
      setVoiceLoading(false);
      if (loaded) {
        setVoiceData(loaded);
        setVoiceTime(0);
      } else if (audioEngine.lastError) {
        setAudioError(audioEngine.lastError);
      }
    },
    [stopAllAudio]
  );

  const handleUseDefaultVoice = useCallback(async () => {
    await handleSelectVoicePreset('talk');
  }, [handleSelectVoicePreset]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (timerRemaining <= 0.1) {
        setTimerRemaining(TIMER_MAX_SECONDS);
        initialRemainingRef.current = TIMER_MAX_SECONDS;
      } else {
        initialRemainingRef.current = timerRemaining;
      }
      timerStartRef.current = performance.now();
      setIsPlaying(true);
    }
  }, [isPlaying, timerRemaining]);

  const handleResetTimer = useCallback(() => {
    setIsPlaying(false);
    setTimerRemaining(TIMER_MAX_SECONDS);
    initialRemainingRef.current = TIMER_MAX_SECONDS;
    setAnimTime(0);
    setVoiceTime(0);
    audioEngine.setVoiceOffset(0);
  }, []);

  const handleSelectTab = useCallback(
    (tab) => {
      setActiveTab(tab);
      if (tab === 'stationary') {
        stopAllAudio();
      }
    },
    [stopAllAudio]
  );

  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      return undefined;
    }

    let rafId;
    const stepFrame = (timestamp) => {
      const dtSec = lastFrameRef.current !== null ? (timestamp - lastFrameRef.current) / 1000 : 0;
      lastFrameRef.current = timestamp;

      if (dtSec > 0) {
        setAnimTime((prev) => prev + dtSec * 1.5);
      }

      if (timerStartRef.current !== null) {
        const elapsedSec = (timestamp - timerStartRef.current) / 1000;
        const remaining = Math.max(0, initialRemainingRef.current - elapsedSec);
        setTimerRemaining(remaining);

        if (remaining <= 0) {
          setIsPlaying(false);
          lastFrameRef.current = null;
          return;
        }
      }

      rafId = window.requestAnimationFrame(stepFrame);
    };

    rafId = window.requestAnimationFrame(stepFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const isVoiceAudioActive = audioMode === 'voice-original' || audioMode === 'voice-recovered';
  useEffect(() => {
    if (!isVoiceAudioActive) return undefined;
    let rafId;
    const syncVoiceClock = () => {
      if (audioEngine.isPlaying && audioEngine.activeType === 'voice') {
        setVoiceTime(audioEngine.getVoicePosition());
      }
      rafId = window.requestAnimationFrame(syncVoiceClock);
    };
    rafId = window.requestAnimationFrame(syncVoiceClock);
    return () => window.cancelAnimationFrame(rafId);
  }, [isVoiceAudioActive]);

  const handleResetAll = useCallback(() => {
    stopAllAudio();
    setAm(1.0);
    setFm(280);
    setAc(1.0);
    setFc(10000);
    setPhiDeg(0);
    setWaveform('sine');
    setNoiseEnabled(false);
    setSnrDb(20);
    handleResetTimer();
  }, [handleResetTimer, stopAllAudio]);

  const simData = useMemo(() => {
    if (section === 'stationary') {
      return null;
    }
    return generateModulationSignals({
      Am,
      fm,
      Ac,
      fc,
      phiDeg,
      waveform,
      noiseEnabled,
      snrDb,
      animTime,
      voiceData,
      voiceTime,
    });
  }, [section, Am, fm, Ac, fc, phiDeg, waveform, noiseEnabled, snrDb, animTime, voiceData, voiceTime]);

  const {
    timeSpan,
    tValues,
    mValues,
    cValues,
    sDsbValues,
    envPosValues,
    yDsbValues,
    fMin,
    fMax,
    fFrequencies,
    fMagDsb,
    peakHeightDsb,
    basebandMaxF,
    basebandFrequencies,
    basebandMagRecovered,
    peakHeightBaseband,
    metrics,
    isQuadratureNull,
    isVoice,
  } = simData || {};

  latestAudioSignalsRef.current = {
    mValues,
    yValues: yDsbValues,
    timeSpan,
    fm,
  };

  useEffect(() => {
    if (audioEngine.isPlaying) {
      if (audioEngine.activeType === 'voice') {
        audioEngine.updateVoiceParams({ Am, Ac, phiDeg, noiseEnabled, snrDb });
      } else {
        audioEngine.updateSignals(latestAudioSignalsRef.current);
      }
    }
  }, [Am, fm, Ac, fc, phiDeg, waveform, noiseEnabled, snrDb]);

  const voiceDuration = voiceData?.duration || TIMER_MAX_SECONDS;

  const modFormulaHtml = useMemo(
    () =>
      katex.renderToString(
        's(t) = A_c\\,m(t)\\cos(2\\pi f_c t),\\quad \\mathrm{BW} = 2 B_m',
        { throwOnError: false, displayMode: false }
      ),
    []
  );

  const demodFormulaHtml = useMemo(
    () =>
      katex.renderToString(
        `y(t) = A_c\\cos(\\phi)\\,m(t)\\quad [\\cos(${phiDeg}^\\circ) = ${Math.cos((phiDeg * Math.PI) / 180).toFixed(2)}]`,
        { throwOnError: false, displayMode: false }
      ),
    [phiDeg]
  );

  if (section === 'stationary') {
    return (
      <div className="w-full flex-1 flex flex-col space-y-6 py-2">
        <div className="border-b border-[#E4DBD2] pb-4">
          <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
            Module 1 · Section 1.6
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3B2923] tracking-tight mt-0.5">
            SSS vs WSS Stationarity
          </h2>
        </div>

        <StationarySimulation
          animTime={animTime}
          onResetTimer={handleResetTimer}
          isPlaying={isPlaying}
          onTogglePlayPause={togglePlayPause}
          timerRemaining={timerRemaining}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 py-2">
      {/* Module Header + Segmented Navigation */}
      <div className="border-b border-[#E4DBD2] pb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#9A4324] font-semibold">
            Module 1 · Section 1.5
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3B2923] tracking-tight mt-0.5">
            DSB-SC Modulation &amp; Coherent Recovery
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-[#F5F0EA] border border-[#E4DBD2] p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => handleSelectTab('waveforms')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'waveforms'
                ? 'bg-white text-[#9A4324] border border-[#E4DBD2] shadow-xs'
                : 'text-[#6B5145] hover:text-[#3B2923]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">DSB-SC Waveforms</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('spectrum')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'spectrum'
                ? 'bg-white text-[#9A4324] border border-[#E4DBD2] shadow-xs'
                : 'text-[#6B5145] hover:text-[#3B2923]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Frequency Spectrum</span>
          </button>
        </div>
      </div>

      {/* DSB-SC Tabs (Waveforms or Spectrum) */}
      {(activeTab === 'waveforms' || activeTab === 'spectrum') && (
        <div className="w-full flex-1 flex flex-col gap-6">
          <p className="text-sm text-[#6B5145] max-w-2xl">
            {activeTab === 'waveforms'
              ? 'Observe DSB-SC modulation s(t) = A_c·m(t)·cos(2πf_c t), coherent demodulation y(t), and real-time voice playback on m(t) and y(t).'
              : 'Compare the modulated passband sidebands |S(f)| centered around carrier f_c against the recovered baseband message spectrum |Y(f)|.'}
          </p>

          <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="flex-1 min-w-0 w-full">
              <ModulationColumn
                view={activeTab}
                tValues={tValues}
                mValues={mValues}
                cValues={cValues}
                sValues={sDsbValues}
                envPosValues={envPosValues}
                yValues={yDsbValues}
                showOverlay={showOverlay}
                Am={Am}
                fm={simData.fm}
                Ac={Ac}
                fc={fc}
                phiDeg={phiDeg}
                noiseEnabled={noiseEnabled}
                snrDb={snrDb}
                isVoice={isVoice}
                voiceTime={voiceTime}
                voiceDuration={voiceDuration}
                voiceLabel={voiceData?.label || 'Real Talk (1:00)'}
                voiceLoading={voiceLoading}
                onSeekVoice={handleSeekVoice}
                fMin={fMin}
                fMax={fMax}
                fFrequencies={fFrequencies}
                fMagnitudes={fMagDsb}
                peakHeightDsb={peakHeightDsb}
                basebandMaxF={basebandMaxF}
                basebandFrequencies={basebandFrequencies}
                basebandMagRecovered={basebandMagRecovered}
                peakHeightBaseband={peakHeightBaseband}
                metrics={metrics}
                isQuadratureNull={isQuadratureNull}
                audioMode={audioMode}
                audioError={audioError}
                onToggleOriginalVoice={toggleOriginalVoice}
                onToggleRecoveredVoice={toggleRecoveredVoice}
                onToggleOriginalTone={toggleOriginalTone}
                onToggleRecoveredTone={toggleRecoveredTone}
              />
            </div>

            <ModulationControls
              Am={Am}
              setAm={setAm}
              fm={fm}
              setFm={setFm}
              Ac={Ac}
              setAc={setAc}
              fc={fc}
              setFc={setFc}
              phiDeg={phiDeg}
              setPhiDeg={setPhiDeg}
              waveform={waveform}
              setWaveform={handleWaveformChange}
              noiseEnabled={noiseEnabled}
              setNoiseEnabled={setNoiseEnabled}
              snrDb={snrDb}
              setSnrDb={setSnrDb}
              audioVolume={audioVolume}
              setAudioVolume={setAudioVolume}
              onResetAll={handleResetAll}
              isQuadratureNull={isQuadratureNull}
              isPlaying={isPlaying}
              onTogglePlayPause={togglePlayPause}
              timerRemaining={timerRemaining}
              isCustomVoice={Boolean(voiceData?.isCustom)}
              voicePreset={voicePreset}
              onSelectVoicePreset={handleSelectVoicePreset}
              isRecordingMic={isRecordingMic}
              recordingSeconds={recordingSeconds}
              onToggleMicRecord={handleToggleMicRecord}
              onUploadVoiceFile={handleUploadVoiceFile}
              onUseDefaultVoice={handleUseDefaultVoice}
            />
          </div>

          <section className="bg-[#F5F0EA] border border-[#E4DBD2] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                Modulation &amp; Coherent Recovery Equations
              </h3>
              <div className="space-y-2 text-sm text-[#3B2923] overflow-x-auto">
                <div dangerouslySetInnerHTML={{ __html: modFormulaHtml }} />
                <div dangerouslySetInnerHTML={{ __html: demodFormulaHtml }} />
              </div>
              <div className="font-mono text-xs text-[#6B5145] pt-2 border-t border-[#E4DBD2] tabular-nums">
                {`Passband BW = ${metrics.bw.toLocaleString()} Hz · Sideband Power = ${metrics.powerEfficiency}%`}
              </div>
            </div>

            <div className="space-y-2 md:pl-6 md:border-l border-[#E4DBD2]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B2923]">
                Explanation
              </h3>
              <div className="text-sm text-[#6B5145] leading-relaxed space-y-2">
                <p>
                  Multiplying the message m(t) directly by the carrier suppresses the discrete carrier line so 100% of transmitted power sits in the upper and lower sidebands around f_c.
                </p>
                <p>
                  Play Voice 1m on m(t) and Demod Voice on y(t) separately to hear the real difference: coherent recovery scales by cos(φ), filters through the 3.4 kHz receiver LPF, and reflects AWGN channel noise.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
