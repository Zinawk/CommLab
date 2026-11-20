/**
 * Mathematical Engine for Euler's Formula Simulator
 * e^(jθ) = cos(θ) + j*sin(θ)
 * All calculations use radians internally with degree conversions for user interaction.
 */

export const TWO_PI = 2 * Math.PI;

/**
 * Convert degrees to radians
 */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Normalize degrees into [0, 360)
 */
export function normalizeDeg(deg) {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Normalize radians into [0, 2π)
 */
export function normalizeRad(rad) {
  const mod = rad % TWO_PI;
  return mod < 0 ? mod + TWO_PI : mod;
}

/**
 * Compute real and imaginary components with high precision and clean zero-clamping
 */
export function computeEuler(thetaRad, amplitude = 1) {
  let cosVal = Math.cos(thetaRad);
  let sinVal = Math.sin(thetaRad);

  // Clamp floating-point residuals near zero (e.g., cos(π/2) = 6.12e-17)
  if (Math.abs(cosVal) < 1e-12) cosVal = 0;
  if (Math.abs(sinVal) < 1e-12) sinVal = 0;

  const real = amplitude * cosVal;
  const imag = amplitude * sinVal;
  const magnitude = Math.sqrt(real * real + imag * imag);

  return {
    thetaRad,
    thetaDeg: normalizeDeg(radToDeg(thetaRad)),
    real,
    imag,
    magnitude,
    amplitude,
  };
}

/**
 * Cardinal angle identities for verification:
 * 0°, 90°, 180°, 270°, 360°
 */
export const CARDINAL_ANGLES = [
  {
    deg: 0,
    radFrac: '0',
    formula: 'e^{j0}',
    real: 1,
    imag: 0,
    resultStr: '1 + 0j = 1',
    note: 'Purely Real (+1)',
  },
  {
    deg: 90,
    radFrac: '\\frac{\\pi}{2}',
    formula: 'e^{j\\frac{\\pi}{2}}',
    real: 0,
    imag: 1,
    resultStr: '0 + 1j = j',
    note: 'Purely Imaginary (+j)',
  },
  {
    deg: 180,
    radFrac: '\\pi',
    formula: 'e^{j\\pi}',
    real: -1,
    imag: 0,
    resultStr: '-1 + 0j = -1',
    note: "Euler's Identity (e^{j\\pi} + 1 = 0)",
  },
  {
    deg: 270,
    radFrac: '\\frac{3\\pi}{2}',
    formula: 'e^{j\\frac{3\\pi}{2}}',
    real: 0,
    imag: -1,
    resultStr: '0 - 1j = -j',
    note: 'Purely Imaginary (-j)',
  },
  {
    deg: 360,
    radFrac: '2\\pi',
    formula: 'e^{j2\\pi}',
    real: 1,
    imag: 0,
    resultStr: '1 + 0j = 1',
    note: 'Full Cycle Periodicity',
  },
];

/**
 * Check if an angle matches one of the cardinal angles within a small tolerance
 */
export function checkCardinalMatch(angleDeg, tolerance = 0.5) {
  const norm = normalizeDeg(angleDeg);
  for (const c of CARDINAL_ANGLES) {
    if (c.deg === 360) {
      if (Math.abs(norm - 360) <= tolerance || Math.abs(norm - 0) <= tolerance) {
        return c;
      }
    } else if (Math.abs(norm - c.deg) <= tolerance) {
      return c;
    }
  }
  return null;
}

/**
 * Generate waveform points for plotting Cosine (Real) and Sine (Imaginary)
 * over an angle range [0, spanRad] (default 2π) with the given phase and frequency.
 */
export function generateWaveformPoints({
  frequency = 1,
  phaseRad = 0,
  amplitude = 1,
  spanRad = TWO_PI,
  samples = 240,
}) {
  const cosPoints = [];
  const sinPoints = [];

  for (let i = 0; i <= samples; i++) {
    const theta = (i / samples) * spanRad;
    const argument = theta * frequency + phaseRad;
    let c = amplitude * Math.cos(argument);
    let s = amplitude * Math.sin(argument);

    if (Math.abs(c) < 1e-12) c = 0;
    if (Math.abs(s) < 1e-12) s = 0;

    cosPoints.push({ theta, value: c });
    sinPoints.push({ theta, value: s });
  }

  return { cosPoints, sinPoints, spanRad };
}

/**
 * Format a complex number into standard rectangular form: "x + jy"
 */
export function formatComplex(real, imag, decimals = 3) {
  const r = real.toFixed(decimals);
  const absImag = Math.abs(imag).toFixed(decimals);
  const sign = imag >= 0 ? '+' : '-';
  return `${r} ${sign} j${absImag}`;
}
