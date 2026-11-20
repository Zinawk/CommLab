import React, { useRef, useEffect, useCallback } from 'react';

function formatMillisecondsTick(sec) {
  return (sec * 1000).toFixed(1);
}

function formatAxisTick(val) {
  return val.toFixed(1);
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * HiDPI oscilloscope canvas rendered in crisp dark-brown engineering ink on pure white.
 */
export function WaveformCanvas({
  tValues,
  yValues,
  overlayValues = null,
  envelopeValues = null,
  showOverlay = true,
  yMin = -2.2,
  yMax = 2.2,
  color = '#0369A1',
  yAxisLabel = 'Amplitude (V)',
  xAxisLabel = 'Time t (ms)',
  height = 135,
}) {
  const canvasRef = useRef(null);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tValues || !yValues) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const padL = 44;
    const padR = 14;
    const padT = 8;
    const padB = 28;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    if (plotW <= 20 || plotH <= 20) return;

    const tMin = tValues[0];
    const tMax = tValues[tValues.length - 1];
    const tSpan = Math.max(1e-9, tMax - tMin);

    const mapX = (t) => padL + ((t - tMin) / tSpan) * plotW;
    const mapY = (val) => padT + ((yMax - val) / Math.max(1e-6, yMax - yMin)) * plotH;
    const zeroY = mapY(0);

    // Y gridlines & dark brown ticks
    const yTicks = 5;
    for (let i = 0; i < yTicks; i++) {
      const frac = i / (yTicks - 1);
      const yVal = yMax - frac * (yMax - yMin);
      const py = padT + frac * plotH;

      ctx.strokeStyle = 'rgba(59, 41, 35, 0.10)';
      ctx.lineWidth = 0.9;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(w - padR, py);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#6B5145';
      ctx.font = '10px "Fira Code", ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatAxisTick(yVal), padL - 6, py);
    }

    // X gridlines & ticks (ms)
    const xTicks = 5;
    for (let i = 0; i < xTicks; i++) {
      const frac = i / (xTicks - 1);
      const px = padL + frac * plotW;
      const tVal = tMin + frac * tSpan;

      ctx.strokeStyle = 'rgba(59, 41, 35, 0.10)';
      ctx.lineWidth = 0.9;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, h - padB);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3B2923';
      ctx.font = '600 10.5px "Fira Code", ui-monospace, monospace';
      ctx.textAlign = i === 0 ? 'left' : i === xTicks - 1 ? 'right' : 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(formatMillisecondsTick(tVal), px, h - padB + 4);
    }

    // Dark brown L-frame axes + zero reference
    ctx.strokeStyle = 'rgba(59, 41, 35, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, h - padB);
    ctx.lineTo(w - padR, h - padB);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(59, 41, 35, 0.25)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(padL, zeroY);
    ctx.lineTo(w - padR, zeroY);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();

    // Optional symmetric ±envelope guide for DSB-SC modulated signal
    if (envelopeValues && envelopeValues.length === tValues.length) {
      ctx.strokeStyle = 'rgba(4, 120, 87, 0.7)';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([3, 2.5]);

      ctx.beginPath();
      for (let i = 0; i < tValues.length; i++) {
        const px = mapX(tValues[i]);
        const py = mapY(envelopeValues[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(190, 18, 60, 0.6)';
      ctx.beginPath();
      for (let i = 0; i < tValues.length; i++) {
        const px = mapX(tValues[i]);
        const py = mapY(-envelopeValues[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Optional reference m(t) overlay
    if (overlayValues && showOverlay && overlayValues.length === tValues.length) {
      ctx.strokeStyle = 'rgba(3, 105, 161, 0.72)';
      ctx.lineWidth = 1.15;
      ctx.setLineDash([3, 2.5]);
      ctx.beginPath();
      for (let i = 0; i < tValues.length; i++) {
        const px = mapX(tValues[i]);
        const py = mapY(overlayValues[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Crisp waveform trace
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < tValues.length; i++) {
      const px = mapX(tValues[i]);
      const py = mapY(yValues[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Rotated Y-axis label
    ctx.save();
    ctx.fillStyle = '#6B5145';
    ctx.font = '600 9.5px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(10, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    // Bottom X-axis label
    ctx.fillStyle = '#6B5145';
    ctx.font = '600 9.5px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(xAxisLabel, padL + plotW / 2, h - 1);
  }, [
    tValues,
    yValues,
    overlayValues,
    envelopeValues,
    showOverlay,
    yMin,
    yMax,
    color,
    yAxisLabel,
    xAxisLabel,
    height,
  ]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const observer = new ResizeObserver(() => {
      drawWaveform();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawWaveform]);

  return (
    <div className="w-full overflow-hidden">
      <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px`, display: 'block' }} />
    </div>
  );
}

/**
 * DSB-SC Magnitude Spectrum |S(f)| Canvas in crisp engineering light style.
 */
export function SpectrumCanvas({
  mode = 'passband',
  isVoice = false,
  fMin,
  fMax,
  fc,
  fm,
  fFrequencies,
  fMagnitudes,
  peakHeight = 0.5,
  yMax = 2.2,
  yAxisLabel = '|S(f)| (V)',
  xAxisLabel = 'Frequency f (Hz)',
  color = '#C2410C',
  height = 175,
}) {
  const canvasRef = useRef(null);

  const drawSpectrum = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fFrequencies || !fMagnitudes) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const padL = 44;
    const padR = 14;
    const padT = 18;
    const padB = 30;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    if (plotW <= 20 || plotH <= 20) return;

    const fSpan = Math.max(100, fMax - fMin);
    const magMax = Math.max(1.0, yMax);

    const mapX = (fHz) => padL + ((fHz - fMin) / fSpan) * plotW;
    const mapY = (mag) => padT + ((magMax - mag) / magMax) * plotH;

    // Shaded bandwidth band
    if (mode === 'passband') {
      const xBw1 = Math.max(padL, mapX(fc - fm));
      const xBw2 = Math.min(w - padR, mapX(fc + fm));
      const bwWidth = Math.max(2, xBw2 - xBw1);
      ctx.fillStyle = 'rgba(194, 65, 12, 0.08)';
      ctx.fillRect(xBw1, padT, bwWidth, plotH);
    } else {
      const xBwEnd = Math.min(w - padR, mapX(fm));
      const bwWidth = Math.max(2, xBwEnd - padL);
      ctx.fillStyle = 'rgba(4, 120, 87, 0.08)';
      ctx.fillRect(padL, padT, bwWidth, plotH);
    }

    // Y ticks & dashed grid
    const yTicks = 4;
    for (let i = 0; i < yTicks; i++) {
      const frac = i / (yTicks - 1);
      const magVal = magMax * (1 - frac);
      const py = padT + frac * plotH;

      ctx.strokeStyle = 'rgba(59, 41, 35, 0.10)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(w - padR, py);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#6B5145';
      ctx.font = '10px "Fira Code", ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatAxisTick(magVal), padL - 6, py);
    }

    // X ticks
    const xTicks = 5;
    for (let i = 0; i < xTicks; i++) {
      const frac = i / (xTicks - 1);
      const px = padL + frac * plotW;
      const fValHz = fMin + frac * fSpan;

      ctx.strokeStyle = 'rgba(59, 41, 35, 0.10)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, h - padB);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3B2923';
      ctx.font = '600 10.5px "Fira Code", ui-monospace, monospace';
      ctx.textAlign = i === 0 ? 'left' : i === xTicks - 1 ? 'right' : 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${Math.round(fValHz)}`, px, h - padB + 4);
    }

    // L-frame axes
    ctx.strokeStyle = 'rgba(59, 41, 35, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, h - padB);
    ctx.lineTo(w - padR, h - padB);
    ctx.stroke();

    // Suppressed carrier reference line at fc
    if (mode === 'passband') {
      const xFc = mapX(fc);
      if (xFc >= padL && xFc <= w - padR) {
        ctx.strokeStyle = 'rgba(59, 41, 35, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(xFc, padT);
        ctx.lineTo(xFc, h - padB);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#3B2923';
        ctx.font = '600 9.5px "Fira Code", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('fc', xFc, padT - 2);
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();

    ctx.beginPath();
    ctx.moveTo(mapX(fFrequencies[0]), h - padB);
    for (let i = 0; i < fFrequencies.length; i++) {
      ctx.lineTo(mapX(fFrequencies[i]), mapY(fMagnitudes[i]));
    }
    ctx.lineTo(mapX(fFrequencies[fFrequencies.length - 1]), h - padB);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, 0.14);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    for (let i = 0; i < fFrequencies.length; i++) {
      const px = mapX(fFrequencies[i]);
      const py = mapY(fMagnitudes[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Dynamic LSB / USB or Baseband labels
    if (mode === 'passband') {
      if (isVoice) {
        ctx.fillStyle = '#3B2923';
        ctx.font = '600 9.5px "Fira Code", ui-monospace, monospace';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        ctx.fillText('LSB', padL + plotW * 0.25, padT + 4);
        ctx.fillText('USB', padL + plotW * 0.75, padT + 4);
      } else {
        const xLsb = mapX(fc - fm);
        const xUsb = mapX(fc + fm);
        const yPeak = Math.max(padT + 12, mapY(peakHeight) - 4);
        ctx.fillStyle = '#3B2923';
        ctx.font = '600 9.5px "Fira Code", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('LSB', xLsb, yPeak);
        ctx.fillText('USB', xUsb, yPeak);
      }
    } else if (!isVoice) {
      const xFm = mapX(fm);
      const yPeak = Math.max(padT + 12, mapY(peakHeight) - 4);
      if (xFm >= padL + 10 && xFm <= w - padR - 10) {
        ctx.fillStyle = '#3B2923';
        ctx.font = '600 9.5px "Fira Code", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('fm', xFm, yPeak);
      }
    }
    ctx.restore();

    // Axis Labels
    ctx.save();
    ctx.fillStyle = '#6B5145';
    ctx.font = '600 9.5px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(10, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    ctx.fillStyle = '#6B5145';
    ctx.font = '600 9.5px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(xAxisLabel, padL + plotW / 2, h - 1);
  }, [
    mode,
    isVoice,
    fMin,
    fMax,
    fc,
    fm,
    fFrequencies,
    fMagnitudes,
    peakHeight,
    yMax,
    yAxisLabel,
    xAxisLabel,
    color,
    height,
  ]);

  useEffect(() => {
    drawSpectrum();
  }, [drawSpectrum]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const observer = new ResizeObserver(() => {
      drawSpectrum();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawSpectrum]);

  return (
    <div className="w-full overflow-hidden">
      <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px`, display: 'block' }} />
    </div>
  );
}
