/**
 * Continuous-Time Convolution Mathematical Engine
 * Student 4: Continuous-Time Convolution y(t) = ∫_{-∞}^{∞} x(τ) h(t - τ) dτ
 *
 * Supports:
 * 1. Analytical/parametric continuous-time signals x(t) and impulse responses h(t)
 *    matching Task 3 (Student 3) signal & system definitions plus RC exponential filters.
 * 2. Arbitrary sampled continuous-time arrays [{ t, val }] or [{ n, val }] (Task 3 format)
 *    via numerical Trapezoidal quadrature.
 */

export const T_MIN = -4;
export const T_MAX = 16;
export const DT = 0.02;

const TAU_MIN = -12;
const TAU_MAX = 26;

/**
 * Evaluate continuous-time input signal x(t) at an arbitrary instant t.
 */
export function evalInputAt(type, params, t) {
  const {
    amplitude = 1.0,
    shift = 0.0,
    pulseWidth = 3.0,
    frequency = 0.25,
    inputDecay = 0.7,
  } = params;

  switch (type) {
    case 'rect':
      return t >= shift && t <= shift + pulseWidth ? amplitude : 0;

    case 'step':
      return t >= shift ? amplitude : 0;

    case 'sine':
      return t >= shift
        ? amplitude * Math.sin(2 * Math.PI * frequency * (t - shift))
        : 0;

    case 'exp':
      return t >= shift
        ? amplitude * Math.exp(-inputDecay * (t - shift))
        : 0;

    case 'impulse':
      return 0;

    default:
      return 0;
  }
}

/**
 * Evaluate continuous-time impulse response h(t) at an arbitrary instant t.
 */
export function evalImpulseResponseAt(systemType, params, t) {
  const {
    gain = 1.0,
    windowSize = 4.0,
    decayRate = 0.6,
  } = params;

  switch (systemType) {
    case 'moving_average': {
      const w = Math.max(0.2, windowSize);
      return t >= 0 && t <= w ? gain / w : 0;
    }

    case 'exponential':
      return t >= 0 ? gain * Math.exp(-decayRate * t) : 0;

    case 'gain':
    case 'delay':
      return 0;

    default:
      return 0;
  }
}

/**
 * Generate sampled continuous-time input signal x(t) over [T_MIN, T_MAX].
 */
export function generateContinuousInput(type, params, tMin = T_MIN, tMax = T_MAX, dt = DT) {
  const { amplitude = 1.0, shift = 0.0 } = params;
  const points = [];
  const count = Math.round((tMax - tMin) / dt);

  for (let i = 0; i <= count; i++) {
    const t = Number((tMin + i * dt).toFixed(4));
    const val = evalInputAt(type, params, t);
    points.push({ t, n: t, val });
  }

  return {
    points,
    isImpulse: type === 'impulse',
    impulses: type === 'impulse' ? [{ t: shift, weight: amplitude }] : [],
  };
}

/**
 * Generate sampled continuous-time impulse response h(t) over [T_MIN, T_MAX].
 */
export function generateContinuousImpulseResponse(
  systemType,
  params,
  tMin = T_MIN,
  tMax = T_MAX,
  dt = DT
) {
  const { gain = 1.0, delay = 3.0 } = params;
  const points = [];
  const count = Math.round((tMax - tMin) / dt);

  for (let i = 0; i <= count; i++) {
    const t = Number((tMin + i * dt).toFixed(4));
    const val = evalImpulseResponseAt(systemType, params, t);
    points.push({ t, n: t, val });
  }

  const isImpulse = systemType === 'gain' || systemType === 'delay';
  const impulseTime = systemType === 'delay' ? delay : 0;

  return {
    points,
    isImpulse,
    impulses: isImpulse ? [{ t: impulseTime, weight: gain }] : [],
  };
}

/**
 * Compute continuous-time convolution y(t) = ∫_{-∞}^{∞} x(τ) h(t - τ) dτ
 * for parametric continuous-time signals using 2nd-order Midpoint Quadrature
 * over an extended integration domain [TAU_MIN, TAU_MAX] plus exact Dirac sifting.
 */
export function computeParametricConvolution(
  inputType,
  inputParams,
  systemType,
  systemParams,
  tMin = T_MIN,
  tMax = T_MAX,
  dt = DT
) {
  const xIsImpulse = inputType === 'impulse';
  const hIsImpulse = systemType === 'gain' || systemType === 'delay';

  const A = inputParams.amplitude ?? 1.0;
  const t0 = inputParams.shift ?? 0.0;
  const K = systemParams.gain ?? 1.0;
  const D = systemType === 'delay' ? (systemParams.delay ?? 3.0) : 0.0;

  const numT = Math.round((tMax - tMin) / dt) + 1;
  const points = new Array(numT);

  // Case 1: Impulse * Impulse -> Scaled & shifted Dirac impulse
  if (xIsImpulse && hIsImpulse) {
    for (let i = 0; i < numT; i++) {
      const t = Number((tMin + i * dt).toFixed(4));
      points[i] = { t, n: t, val: 0 };
    }
    return {
      points,
      isImpulse: true,
      impulses: [{ t: Number((t0 + D).toFixed(4)), weight: Number((A * K).toFixed(4)) }],
    };
  }

  // Case 2: Impulse x(t) = A δ(t - t0) -> Sifting integral ∫ A δ(τ - t0) h(t - τ) dτ = A h(t - t0)
  if (xIsImpulse) {
    for (let i = 0; i < numT; i++) {
      const t = Number((tMin + i * dt).toFixed(4));
      const val = A * evalImpulseResponseAt(systemType, systemParams, t - t0);
      points[i] = { t, n: t, val };
    }
    return { points, isImpulse: false, impulses: [] };
  }

  // Case 3: Impulse h(t) = K δ(t - D) -> Sifting integral ∫ x(τ) K δ(t - τ - D) dτ = K x(t - D)
  if (hIsImpulse) {
    for (let i = 0; i < numT; i++) {
      const t = Number((tMin + i * dt).toFixed(4));
      const val = K * evalInputAt(inputType, inputParams, t - D);
      points[i] = { t, n: t, val };
    }
    return { points, isImpulse: false, impulses: [] };
  }

  // Case 4: General Continuous-Time Convolution Integral
  // y(t_i) = ∫_{TAU_MIN}^{TAU_MAX} x(τ) h(t_i - τ) dτ
  // Evaluated via 2nd-order Midpoint Rule at τ_k = TAU_MIN + (k + 0.5) * dt
  const numTau = Math.round((TAU_MAX - TAU_MIN) / dt);
  const xArr = new Float64Array(numTau);

  let kFirst = -1;
  let kLast = -1;
  for (let k = 0; k < numTau; k++) {
    const tau = TAU_MIN + (k + 0.5) * dt;
    const xVal = evalInputAt(inputType, inputParams, tau);
    xArr[k] = xVal;
    if (xVal !== 0) {
      if (kFirst === -1) kFirst = k;
      kLast = k;
    }
  }

  // Pre-evaluate h(u) at all possible difference offsets u_{i - k} = (tMin - TAU_MIN) + (i - k - 0.5) * dt
  // Difference m = i - k ranges from -(numTau - 1) to +(numT - 1)
  const mOffset = numTau - 1;
  const hLen = numT + numTau;
  const hArr = new Float64Array(hLen);
  const baseTimeDiff = tMin - TAU_MIN;

  for (let idx = 0; idx < hLen; idx++) {
    const m = idx - mOffset;
    const u = baseTimeDiff + (m - 0.5) * dt;
    hArr[idx] = evalImpulseResponseAt(systemType, systemParams, u);
  }

  for (let i = 0; i < numT; i++) {
    const t = Number((tMin + i * dt).toFixed(4));
    let integralSum = 0;

    if (kFirst !== -1) {
      const baseIdx = i + mOffset;
      for (let k = kFirst; k <= kLast; k++) {
        const xv = xArr[k];
        if (xv !== 0) {
          integralSum += xv * hArr[baseIdx - k];
        }
      }
    }

    points[i] = { t, n: t, val: integralSum * dt };
  }

  return { points, isImpulse: false, impulses: [] };
}

/**
 * Sum two signal results (points and Dirac impulses) for linearity comparison y1(t) + y2(t).
 */
export function combineSignalResults(res1, res2) {
  const points = res1.points.map((pt, i) => ({
    t: pt.t,
    n: pt.n,
    val: pt.val + (res2.points[i]?.val ?? 0),
  }));

  const impulses = [];
  const addImpulse = (imp) => {
    const existing = impulses.find((item) => Math.abs(item.t - imp.t) < 1e-3);
    if (existing) {
      existing.weight = Number((existing.weight + imp.weight).toFixed(4));
    } else {
      impulses.push({ t: Number(imp.t.toFixed(4)), weight: Number(imp.weight.toFixed(4)) });
    }
  };
  (res1.impulses || []).forEach(addImpulse);
  (res2.impulses || []).forEach(addImpulse);

  const filteredImpulses = impulses.filter((imp) => Math.abs(imp.weight) > 1e-6);
  const hasNonZeroPoints = points.some((p) => Math.abs(p.val) > 1e-9);

  return {
    points,
    isImpulse: filteredImpulses.length > 0 && !hasNonZeroPoints,
    impulses: filteredImpulses,
  };
}

/**
 * Compute continuous-time convolution of a combined input x(t) = x1(t) + x2(t)
 * with impulse response h(t) directly from the convolution integral and Dirac sifting.
 */
export function computeCombinedParametricConvolution(
  input1Type,
  input1Params,
  input2Type,
  input2Params,
  systemType,
  systemParams,
  tMin = T_MIN,
  tMax = T_MAX,
  dt = DT
) {
  const x1IsImp = input1Type === 'impulse';
  const x2IsImp = input2Type === 'impulse';
  const hIsImp = systemType === 'gain' || systemType === 'delay';

  const K = systemParams.gain ?? 1.0;
  const D = systemType === 'delay' ? (systemParams.delay ?? 3.0) : 0.0;

  const numT = Math.round((tMax - tMin) / dt) + 1;
  const vals = new Float64Array(numT);
  const impulses = [];

  const addImpulse = (t, weight) => {
    const existing = impulses.find((item) => Math.abs(item.t - t) < 1e-3);
    if (existing) {
      existing.weight = Number((existing.weight + weight).toFixed(4));
    } else {
      impulses.push({ t: Number(t.toFixed(4)), weight: Number(weight.toFixed(4)) });
    }
  };

  // Impulse input contributions via sifting
  const handleImpulseInput = (params) => {
    const A = params.amplitude ?? 1.0;
    const t0 = params.shift ?? 0.0;
    if (hIsImp) {
      addImpulse(t0 + D, A * K);
    } else {
      for (let i = 0; i < numT; i++) {
        const t = tMin + i * dt;
        vals[i] += A * evalImpulseResponseAt(systemType, systemParams, t - t0);
      }
    }
  };

  if (x1IsImp) handleImpulseInput(input1Params);
  if (x2IsImp) handleImpulseInput(input2Params);

  // Continuous input contributions
  if (!x1IsImp || !x2IsImp) {
    if (hIsImp) {
      for (let i = 0; i < numT; i++) {
        const t = tMin + i * dt;
        const x1Val = x1IsImp ? 0 : evalInputAt(input1Type, input1Params, t - D);
        const x2Val = x2IsImp ? 0 : evalInputAt(input2Type, input2Params, t - D);
        vals[i] += K * (x1Val + x2Val);
      }
    } else {
      const numTau = Math.round((TAU_MAX - TAU_MIN) / dt);
      const xCombArr = new Float64Array(numTau);
      let kFirst = -1;
      let kLast = -1;

      for (let k = 0; k < numTau; k++) {
        const tau = TAU_MIN + (k + 0.5) * dt;
        const x1Val = x1IsImp ? 0 : evalInputAt(input1Type, input1Params, tau);
        const x2Val = x2IsImp ? 0 : evalInputAt(input2Type, input2Params, tau);
        const xVal = x1Val + x2Val;
        xCombArr[k] = xVal;
        if (xVal !== 0) {
          if (kFirst === -1) kFirst = k;
          kLast = k;
        }
      }

      const mOffset = numTau - 1;
      const hLen = numT + numTau;
      const hArr = new Float64Array(hLen);
      const baseTimeDiff = tMin - TAU_MIN;

      for (let idx = 0; idx < hLen; idx++) {
        const m = idx - mOffset;
        const u = baseTimeDiff + (m - 0.5) * dt;
        hArr[idx] = evalImpulseResponseAt(systemType, systemParams, u);
      }

      for (let i = 0; i < numT; i++) {
        let integralSum = 0;
        if (kFirst !== -1) {
          const baseIdx = i + mOffset;
          for (let k = kFirst; k <= kLast; k++) {
            const xv = xCombArr[k];
            if (xv !== 0) {
              integralSum += xv * hArr[baseIdx - k];
            }
          }
        }
        vals[i] += integralSum * dt;
      }
    }
  }

  const points = new Array(numT);
  for (let i = 0; i < numT; i++) {
    const t = Number((tMin + i * dt).toFixed(4));
    points[i] = { t, n: t, val: vals[i] };
  }

  const filteredImpulses = impulses.filter((imp) => Math.abs(imp.weight) > 1e-6);
  const hasNonZeroPoints = points.some((p) => Math.abs(p.val) > 1e-9);

  return {
    points,
    isImpulse: filteredImpulses.length > 0 && !hasNonZeroPoints,
    impulses: filteredImpulses,
  };
}

/**
 * Evaluate the reference shifted output y(t - timeShift) over [tMin, tMax].
 */
export function computeShiftedOutputReference(
  inputType,
  inputParams,
  systemType,
  systemParams,
  timeShift,
  tMin = T_MIN,
  tMax = T_MAX,
  dt = DT
) {
  const unshifted = computeParametricConvolution(
    inputType,
    inputParams,
    systemType,
    systemParams,
    tMin - timeShift,
    tMax - timeShift,
    dt
  );

  return {
    points: unshifted.points.map((pt) => {
      const t = Number((pt.t + timeShift).toFixed(4));
      return { t, n: t, val: pt.val };
    }),
    isImpulse: unshifted.isImpulse,
    impulses: (unshifted.impulses || []).map((imp) => ({
      t: Number((imp.t + timeShift).toFixed(4)),
      weight: imp.weight,
    })),
  };
}

/**
 * Compute maximum absolute difference between two signal results (points and impulses).
 */
export function computeResultDifference(resA, resB) {
  let maxDiff = 0;
  const len = Math.min(resA.points.length, resB.points.length);
  for (let i = 0; i < len; i++) {
    const d = Math.abs(resA.points[i].val - resB.points[i].val);
    if (d > maxDiff) maxDiff = d;
  }

  const impA = resA.impulses || [];
  const impB = resB.impulses || [];
  for (let i = 0; i < impA.length; i++) {
    const match = impB.find((b) => Math.abs(b.t - impA[i].t) < 1e-3);
    const d = match ? Math.abs(impA[i].weight - match.weight) : Math.abs(impA[i].weight);
    if (d > maxDiff) maxDiff = d;
  }
  for (let i = 0; i < impB.length; i++) {
    const match = impA.find((a) => Math.abs(a.t - impB[i].t) < 1e-3);
    if (!match) {
      const d = Math.abs(impB[i].weight);
      if (d > maxDiff) maxDiff = d;
    }
  }

  return Number(maxDiff.toFixed(4));
}

/**
 * Standalone numerical convolution function accepting externally provided
 * signal arrays x(t) and h(t) (compatible with Task 3 / Student 3 `{ n, val }` or `{ t, val }` arrays).
 * Computes y(t) = ∫ x(τ) h(t - τ) dτ using the Trapezoidal Rule.
 */
export function computeContinuousConvolution(xSignal, hSignal, customDt) {
  if (!Array.isArray(xSignal) || !Array.isArray(hSignal) || xSignal.length < 2 || hSignal.length < 2) {
    return [];
  }

  const getTime = (pt) => (typeof pt.t === 'number' ? pt.t : pt.n);
  const dt =
    typeof customDt === 'number' && customDt > 0
      ? customDt
      : Math.abs(getTime(xSignal[1]) - getTime(xSignal[0])) || 0.2;

  const hStart = getTime(hSignal[0]);
  const hVals = Float64Array.from(hSignal, (p) => p.val || 0);
  const xTimes = Float64Array.from(xSignal, getTime);
  const xVals = Float64Array.from(xSignal, (p) => p.val || 0);

  const sampleH = (u) => {
    const pos = (u - hStart) / dt;
    const idx = Math.floor(pos);
    if (idx < 0 || idx >= hVals.length) return 0;
    const frac = pos - idx;
    if (frac < 1e-6 || idx + 1 >= hVals.length) return hVals[idx];
    return hVals[idx] * (1 - frac) + hVals[idx + 1] * frac;
  };

  const N = xSignal.length;
  const output = new Array(N);

  for (let i = 0; i < N; i++) {
    const t = xTimes[i];
    let sum = 0;
    for (let k = 0; k < N; k++) {
      const weight = k === 0 || k === N - 1 ? 0.5 : 1.0;
      const g = xVals[k] * sampleH(t - xTimes[k]);
      sum += weight * g;
    }
    const yVal = sum * dt;
    output[i] = { t, n: t, val: Number(yVal.toFixed(5)) };
  }

  return output;
}

/**
 * Compute τ-domain waveforms at a specific evaluation instant t:
 * - x(τ)
 * - Flipped & shifted impulse response h(t - τ)
 * - Integrand product g(τ) = x(τ) h(t - τ)
 * - Instantaneous convolution value y(t)
 */
export function computeIntegrandSnapshot(
  inputType,
  inputParams,
  systemType,
  systemParams,
  evalT,
  tMin = T_MIN,
  tMax = T_MAX,
  dt = DT
) {
  const xIsImpulse = inputType === 'impulse';
  const hIsImpulse = systemType === 'gain' || systemType === 'delay';

  const A = inputParams.amplitude ?? 1.0;
  const t0 = inputParams.shift ?? 0.0;
  const K = systemParams.gain ?? 1.0;
  const D = systemType === 'delay' ? (systemParams.delay ?? 3.0) : 0.0;

  const count = Math.round((tMax - tMin) / dt);
  const tauData = new Array(count + 1);

  for (let i = 0; i <= count; i++) {
    const tau = Number((tMin + i * dt).toFixed(4));
    const xVal = evalInputAt(inputType, inputParams, tau);
    const hFlippedVal = evalImpulseResponseAt(systemType, systemParams, evalT - tau);
    const prodVal = xVal * hFlippedVal;

    tauData[i] = {
      tau,
      xVal,
      hFlippedVal,
      prodVal,
    };
  }

  // Evaluate exact y(evalT)
  let instantY = 0;
  let instantIsImpulse = false;

  if (xIsImpulse && hIsImpulse) {
    instantIsImpulse = Math.abs(evalT - (t0 + D)) < 0.05;
    instantY = instantIsImpulse ? A * K : 0;
  } else if (xIsImpulse) {
    instantY = A * evalImpulseResponseAt(systemType, systemParams, evalT - t0);
  } else if (hIsImpulse) {
    instantY = K * evalInputAt(inputType, inputParams, evalT - D);
  } else {
    const numTau = Math.round((TAU_MAX - TAU_MIN) / dt);
    let sum = 0;
    for (let k = 0; k < numTau; k++) {
      const tau = TAU_MIN + (k + 0.5) * dt;
      const xv = evalInputAt(inputType, inputParams, tau);
      if (xv !== 0) {
        sum += xv * evalImpulseResponseAt(systemType, systemParams, evalT - tau);
      }
    }
    instantY = sum * dt;
  }

  const xImpulses = xIsImpulse ? [{ tau: t0, weight: A }] : [];
  // h(t - τ) = K δ(t - τ - D) = K δ(τ - (t - D))
  const hFlippedImpulses = hIsImpulse
    ? [{ tau: Number((evalT - D).toFixed(4)), weight: K }]
    : [];

  return {
    tauData,
    instantY,
    instantIsImpulse,
    xImpulses,
    hFlippedImpulses,
  };
}

/**
 * Detailed, step-by-step mathematical breakdown for the current observation time t.
 * Explains:
 * Step 1: Fold h(τ) -> h(-τ)
 * Step 2: Shift to h(t - τ) at observation time t
 * Step 3: Pointwise Multiply g(τ) = x(τ) h(t - τ) over active overlap
 * Step 4: Complete Integration Step with numerical limits, substitutions, and final y(t).
 */
export function computeStepByStepExplanation(
  inputType,
  inputParams,
  systemType,
  systemParams,
  evalTime
) {
  const A = inputParams.amplitude ?? 1.0;
  const t0 = inputParams.shift ?? 0.0;
  const Wx = inputParams.pulseWidth ?? 3.0;
  const f = inputParams.frequency ?? 0.25;

  const K = systemParams.gain ?? 1.0;
  const Wh = systemParams.windowSize ?? 4.0;
  const alpha = systemParams.decayRate ?? 0.6;
  const D = systemType === 'delay' ? (systemParams.delay ?? 3.0) : 0.0;

  const t = Number(evalTime.toFixed(2));
  const xIsImpulse = inputType === 'impulse';
  const hIsImpulse = systemType === 'gain' || systemType === 'delay';

  // --- Step 1: Fold ---
  let foldLatex = '';
  let foldDesc = '';
  switch (systemType) {
    case 'moving_average': {
      const hHeight = (K / Wh).toFixed(3);
      foldLatex = `h(-\\tau) = ${hHeight}\\,\\big[u(-\\tau) - u(-\\tau - ${Wh.toFixed(1)})\\big]`;
      foldDesc = `Time-reverse impulse response h(τ) about τ = 0. The kernel now extends towards the left over [−${Wh.toFixed(1)}, 0].`;
      break;
    }
    case 'exponential':
      foldLatex = `h(-\\tau) = ${K.toFixed(2)}\\,e^{${alpha.toFixed(2)}\\tau}\\,u(-\\tau)`;
      foldDesc = `Time-reverse h(τ) about τ = 0. The exponential decays towards the left for τ ≤ 0.`;
      break;
    case 'delay':
      foldLatex = `h(-\\tau) = ${K.toFixed(2)}\\,\\delta(-\\tau - ${D.toFixed(1)}) = ${K.toFixed(2)}\\,\\delta(\\tau + ${D.toFixed(1)})`;
      foldDesc = `Time-reverse Dirac impulse response. The impulse reflects to τ = −${D.toFixed(1)} s.`;
      break;
    case 'gain':
      foldLatex = `h(-\\tau) = ${K.toFixed(2)}\\,\\delta(-\\tau) = ${K.toFixed(2)}\\,\\delta(\\tau)`;
      foldDesc = `Time-reverse Dirac impulse at the origin. Symmetric under time reversal.`;
      break;
    default:
      foldLatex = `h(-\\tau)`;
      foldDesc = `Reflect h(τ) across the vertical axis τ = 0.`;
  }

  // --- Step 2: Shift by Observation Time t ---
  let shiftLatex = '';
  let shiftSupport = '';
  let shiftDesc = '';
  switch (systemType) {
    case 'moving_average': {
      const leftEdge = Number((t - Wh).toFixed(2));
      shiftLatex = `h(${t.toFixed(1)} - \\tau) = ${(K / Wh).toFixed(3)}, \\quad \\tau \\in [${leftEdge.toFixed(2)},\\, ${t.toFixed(2)}]`;
      shiftSupport = `[${leftEdge.toFixed(2)} s, ${t.toFixed(2)} s]`;
      shiftDesc = `Translate folded kernel by t = ${t.toFixed(1)} s. The kernel ends at τ = ${t.toFixed(2)} s and begins at τ = ${leftEdge.toFixed(2)} s.`;
      break;
    }
    case 'exponential':
      shiftLatex = `h(${t.toFixed(1)} - \\tau) = ${K.toFixed(2)}\\,e^{-${alpha.toFixed(2)}(${t.toFixed(1)} - \\tau)}\\,u(${t.toFixed(1)} - \\tau)`;
      shiftSupport = `(−∞, ${t.toFixed(2)} s]`;
      shiftDesc = `Translate folded exponential kernel so its peak K = ${K.toFixed(2)} is positioned at τ = ${t.toFixed(2)} s, decaying leftward.`;
      break;
    case 'delay': {
      const impTau = Number((t - D).toFixed(2));
      shiftLatex = `h(${t.toFixed(1)} - \\tau) = ${K.toFixed(2)}\\,\\delta\\big(\\tau - (${t.toFixed(1)} - ${D.toFixed(1)})\\big) = ${K.toFixed(2)}\\,\\delta(\\tau - ${impTau.toFixed(2)})`;
      shiftSupport = `τ = ${impTau.toFixed(2)} s`;
      shiftDesc = `Shift Dirac impulse kernel to τ = t − D = ${t.toFixed(1)} − ${D.toFixed(1)} = ${impTau.toFixed(2)} s.`;
      break;
    }
    case 'gain':
      shiftLatex = `h(${t.toFixed(1)} - \\tau) = ${K.toFixed(2)}\\,\\delta(\\tau - ${t.toFixed(1)})`;
      shiftSupport = `τ = ${t.toFixed(2)} s`;
      shiftDesc = `Shift Dirac impulse to observation instant τ = t = ${t.toFixed(1)} s.`;
      break;
    default:
      shiftLatex = `h(t - \\tau)`;
      shiftSupport = `Active at t = ${t.toFixed(1)} s`;
      shiftDesc = `Translate folded kernel by observation time t.`;
  }

  // --- Step 3: Multiply Overlap ---
  let hasOverlap = false;
  let overlapA = 0;
  let overlapB = 0;
  let overlapWidth = 0;
  let overlapSpanText = 'No Overlap';
  let multiplyLatex = '';
  let multiplyDesc = '';

  // Determine active support of x(τ)
  let xStart = t0;
  let xEnd = inputType === 'rect' ? t0 + Wx : 20;

  // Determine active support of h(t - τ)
  let hStart = systemType === 'moving_average' ? t - Wh : -20;
  let hEnd = t;

  if (xIsImpulse) {
    hasOverlap = true;
    overlapA = t0;
    overlapB = t0;
    overlapSpanText = `τ = ${t0.toFixed(2)} s`;
    multiplyLatex = `g(\\tau) = ${A.toFixed(2)}\\,\\delta(\\tau - ${t0.toFixed(2)}) \\cdot h(${t.toFixed(1)} - \\tau)`;
    multiplyDesc = `Input is a concentrated Dirac delta at τ = ${t0.toFixed(2)} s, sampling the kernel.`;
  } else if (hIsImpulse) {
    const tauImp = t - D;
    const inRange = tauImp >= xStart && (inputType === 'rect' ? tauImp <= xEnd : true);
    hasOverlap = inRange;
    overlapA = tauImp;
    overlapB = tauImp;
    overlapSpanText = inRange ? `τ = ${tauImp.toFixed(2)} s` : 'No Overlap';
    multiplyLatex = `g(\\tau) = x(\\tau) \\cdot ${K.toFixed(2)}\\,\\delta\\big(\\tau - ${tauImp.toFixed(2)}\\big)`;
    multiplyDesc = inRange
      ? `System impulse located at τ = ${tauImp.toFixed(2)} s coincides with active input.`
      : `System impulse at τ = ${tauImp.toFixed(2)} s is outside active input support.`;
  } else {
    overlapA = Number(Math.max(xStart, hStart).toFixed(3));
    overlapB = Number(Math.min(xEnd, hEnd).toFixed(3));
    hasOverlap = overlapB > overlapA + 1e-4;
    overlapWidth = hasOverlap ? Number((overlapB - overlapA).toFixed(3)) : 0;

    if (hasOverlap) {
      overlapSpanText = `[${overlapA.toFixed(2)} s, ${overlapB.toFixed(2)} s]`;
      if (inputType === 'rect' && systemType === 'moving_average') {
        const hVal = (K / Wh).toFixed(3);
        const prod = (A * (K / Wh)).toFixed(3);
        multiplyLatex = `g(\\tau) = x(\\tau) h(${t.toFixed(1)} - \\tau) = ${A.toFixed(2)} \\times ${hVal} = ${prod}`;
      } else if (inputType === 'step' && systemType === 'moving_average') {
        const hVal = (K / Wh).toFixed(3);
        const prod = (A * (K / Wh)).toFixed(3);
        multiplyLatex = `g(\\tau) = ${A.toFixed(2)} \\times ${hVal} = ${prod}, \\quad \\tau \\in [${overlapA.toFixed(2)},\\, ${overlapB.toFixed(2)}]`;
      } else if (systemType === 'exponential') {
        multiplyLatex = `g(\\tau) = x(\\tau) \\cdot ${K.toFixed(2)} e^{-${alpha.toFixed(2)}(${t.toFixed(1)} - \\tau)}, \\quad \\tau \\in [${overlapA.toFixed(2)},\\, ${overlapB.toFixed(2)}]`;
      } else {
        multiplyLatex = `g(\\tau) = x(\\tau) \\cdot h(${t.toFixed(1)} - \\tau), \\quad \\tau \\in [${overlapA.toFixed(2)},\\, ${overlapB.toFixed(2)}]`;
      }
      multiplyDesc = `Active overlap interval is ${overlapSpanText} (duration Δτ = ${overlapWidth.toFixed(2)} s).`;
    } else {
      overlapSpanText = 'No Overlap (Disjoint)';
      multiplyLatex = `g(\\tau) = x(\\tau) \\cdot h(${t.toFixed(1)} - \\tau) = 0`;
      multiplyDesc = `Signals do not overlap at t = ${t.toFixed(1)} s. The pointwise product is zero everywhere.`;
    }
  }

  // Evaluate exact theoretical closed-form value at observation instant t
  const theoretical = evalTheoreticalConvolutionAt(
    inputType,
    inputParams,
    systemType,
    systemParams,
    t
  );

  // --- Step 4: Integrate Step & Numerical / Theoretical Calculation ---
  let integralFormulaLatex = '';
  let calculationLatex = '';
  let finalValueNum = 0;
  let statusText = theoretical.regime;

  if (!hasOverlap) {
    integralFormulaLatex = `y(${t.toFixed(1)}) = \\int_{-\\infty}^{\\infty} x(\\tau) h(${t.toFixed(1)} - \\tau)\\,d\\tau = 0`;
    calculationLatex = `y(${t.toFixed(1)}) = 0.000`;
    finalValueNum = 0;
  } else if (xIsImpulse && hIsImpulse) {
    const isAtImpulse = Math.abs(t - (t0 + D)) < 0.05;
    finalValueNum = isAtImpulse ? A * K : 0;
    integralFormulaLatex = `y(${t.toFixed(1)}) = \\int_{-\\infty}^{\\infty} ${A.toFixed(1)}\\delta(\\tau - ${t0.toFixed(1)}) \\cdot ${K.toFixed(1)}\\delta(${t.toFixed(1)} - \\tau - ${D.toFixed(1)})\\,d\\tau`;
    calculationLatex = isAtImpulse
      ? `y(${t.toFixed(1)}) = ${A.toFixed(2)} \\times ${K.toFixed(2)}\\,\\delta(0) \\implies \\text{Impulse area } ${(A * K).toFixed(3)}`
      : `y(${t.toFixed(1)}) = 0.000 \\quad (t \\neq ${(t0 + D).toFixed(1)})`;
  } else if (xIsImpulse) {
    const hAtT = evalImpulseResponseAt(systemType, systemParams, t - t0);
    finalValueNum = Number((A * hAtT).toFixed(4));
    integralFormulaLatex = `y(${t.toFixed(1)}) = \\int_{-\\infty}^{\\infty} ${A.toFixed(1)}\\delta(\\tau - ${t0.toFixed(1)})\\,h(${t.toFixed(1)} - \\tau)\\,d\\tau = ${A.toFixed(1)} \\cdot h(${t.toFixed(1)} - ${t0.toFixed(1)})`;
    calculationLatex = `y(${t.toFixed(1)}) = ${A.toFixed(2)} \\times ${hAtT.toFixed(3)} = ${finalValueNum.toFixed(3)}`;
  } else if (hIsImpulse) {
    const xAtT = evalInputAt(inputType, inputParams, t - D);
    finalValueNum = Number((K * xAtT).toFixed(4));
    integralFormulaLatex = `y(${t.toFixed(1)}) = \\int_{-\\infty}^{\\infty} x(\\tau)\\,${K.toFixed(1)}\\delta\\big(${t.toFixed(1)} - ${D.toFixed(1)} - \\tau\\big)\\,d\\tau = ${K.toFixed(1)} \\cdot x(${t.toFixed(1)} - ${D.toFixed(1)})`;
    calculationLatex = `y(${t.toFixed(1)}) = ${K.toFixed(2)} \\times ${xAtT.toFixed(3)} = ${finalValueNum.toFixed(3)}`;
  } else if (inputType === 'rect' && systemType === 'moving_average') {
    const hHeight = K / Wh;
    const prodVal = A * hHeight;
    finalValueNum = Number((prodVal * overlapWidth).toFixed(4));
    integralFormulaLatex = `y(${t.toFixed(1)}) = \\int_{${overlapA.toFixed(2)}}^{${overlapB.toFixed(2)}} ${A.toFixed(2)} \\times ${hHeight.toFixed(3)}\\,d\\tau`;
    calculationLatex = `y(${t.toFixed(1)}) = (${A.toFixed(2)} \\times ${hHeight.toFixed(3)}) \\times (${overlapB.toFixed(2)} - ${overlapA.toFixed(2)}) = ${prodVal.toFixed(3)} \\times ${overlapWidth.toFixed(2)} = ${finalValueNum.toFixed(3)}`;
  } else if (inputType === 'step' && systemType === 'moving_average') {
    const hHeight = K / Wh;
    const prodVal = A * hHeight;
    finalValueNum = Number((prodVal * overlapWidth).toFixed(4));
    integralFormulaLatex = `y(${t.toFixed(1)}) = \\int_{${overlapA.toFixed(2)}}^{${overlapB.toFixed(2)}} ${A.toFixed(2)} \\times ${hHeight.toFixed(3)}\\,d\\tau`;
    calculationLatex = `y(${t.toFixed(1)}) = ${prodVal.toFixed(3)} \\times (${overlapB.toFixed(2)} - ${overlapA.toFixed(2)}) = ${finalValueNum.toFixed(3)}`;
  } else if ((inputType === 'rect' || inputType === 'step') && systemType === 'exponential') {
    const expA = Math.exp(-alpha * (t - overlapA));
    const expB = Math.exp(-alpha * (t - overlapB));
    const exactInt = ((A * K) / alpha) * (expB - expA);
    finalValueNum = Number(exactInt.toFixed(4));
    integralFormulaLatex = `y(${t.toFixed(1)}) = \\int_{${overlapA.toFixed(2)}}^{${overlapB.toFixed(2)}} ${A.toFixed(2)} \\times ${K.toFixed(2)} e^{-${alpha.toFixed(2)}(${t.toFixed(1)} - \\tau)}\\,d\\tau`;
    calculationLatex = `y(${t.toFixed(1)}) = \\frac{${(A * K).toFixed(2)}}{${alpha.toFixed(2)}}\\Big[e^{-${alpha.toFixed(2)}(${(t - overlapB).toFixed(2)})} - e^{-${alpha.toFixed(2)}(${(t - overlapA).toFixed(2)})}\\Big] = ${finalValueNum.toFixed(3)}`;
  } else if (inputType === 'sine' && systemType === 'moving_average') {
    const omega = 2 * Math.PI * f;
    const a = overlapA;
    const b = overlapB;
    const val = (A * K / (omega * Wh)) * (Math.cos(omega * (a - t0)) - Math.cos(omega * (b - t0)));
    finalValueNum = Number(val.toFixed(4));
    integralFormulaLatex = `y(${t.toFixed(1)}) = \\int_{${overlapA.toFixed(2)}}^{${overlapB.toFixed(2)}} ${A.toFixed(2)} \\sin\\!\\big(2\\pi (${f.toFixed(2)}) (\\tau - ${t0.toFixed(1)})\\big) \\times ${(K / Wh).toFixed(3)}\\,d\\tau`;
    calculationLatex = `y(${t.toFixed(1)}) = \\frac{${(A * K).toFixed(2)}}{${(omega * Wh).toFixed(2)}}\\Big[\\cos(${omega.toFixed(2)}(\\tau - ${t0.toFixed(1)}))\\Big]_{${b.toFixed(2)}}^{${a.toFixed(2)}} = ${finalValueNum.toFixed(3)}`;
  } else if (inputType === 'sine' && systemType === 'exponential') {
    const omega = 2 * Math.PI * f;
    const denom = alpha * alpha + omega * omega;
    const dt0 = t - t0;
    const val = (A * K / denom) * (alpha * Math.sin(omega * dt0) - omega * Math.cos(omega * dt0) + omega * Math.exp(-alpha * dt0));
    finalValueNum = Number(val.toFixed(4));
    integralFormulaLatex = `y(${t.toFixed(1)}) = \\int_{${t0.toFixed(2)}}^{${t.toFixed(2)}} ${A.toFixed(2)} \\sin(\\omega (\\tau - ${t0.toFixed(1)})) \\cdot ${K.toFixed(2)} e^{-${alpha.toFixed(2)}(${t.toFixed(1)} - \\tau)}\\,d\\tau`;
    calculationLatex = `y(${t.toFixed(1)}) = y_{\\text{steady}}(${t.toFixed(1)}) + y_{\\text{transient}}(${t.toFixed(1)}) = ${finalValueNum.toFixed(3)}`;
  } else {
    // Numerical integration via Midpoint quadrature over active bounds
    const numSteps = Math.max(10, Math.round((overlapB - overlapA) / DT));
    const stepDt = (overlapB - overlapA) / numSteps;
    let sum = 0;
    for (let k = 0; k < numSteps; k++) {
      const tauK = overlapA + (k + 0.5) * stepDt;
      sum += evalInputAt(inputType, inputParams, tauK) * evalImpulseResponseAt(systemType, systemParams, t - tauK);
    }
    finalValueNum = Number((sum * stepDt).toFixed(4));
    integralFormulaLatex = `y(${t.toFixed(1)}) = \\int_{${overlapA.toFixed(2)}}^{${overlapB.toFixed(2)}} x(\\tau)\\,h(${t.toFixed(1)} - \\tau)\\,d\\tau`;
    calculationLatex = `y(${t.toFixed(1)}) \\approx \\sum_{k=1}^{${numSteps}} x(\\tau_k)\\,h(${t.toFixed(1)} - \\tau_k)\\,\\Delta\\tau = ${finalValueNum.toFixed(3)}`;
  }

  const theoreticalVal = Number(theoretical.value.toFixed(4));
  const diffFromTheory = Math.abs(finalValueNum - theoreticalVal);
  const isExactMatch = diffFromTheory < 0.002;

  return {
    evalTime: t,
    statusText,
    hasOverlap,
    overlapA,
    overlapB,
    overlapWidth,
    overlapSpanText,
    finalValue: finalValueNum,
    theoreticalValue: theoreticalVal,
    diffFromTheory: Number(diffFromTheory.toFixed(4)),
    isExactMatch,
    isImpulse: xIsImpulse && hIsImpulse,
    steps: {
      fold: {
        title: '01. Fold (Time Reversal)',
        latex: foldLatex,
        desc: foldDesc,
      },
      shift: {
        title: '02. Shift by Time t',
        latex: shiftLatex,
        support: shiftSupport,
        desc: shiftDesc,
      },
      multiply: {
        title: '03. Pointwise Multiply',
        latex: multiplyLatex,
        span: overlapSpanText,
        width: overlapWidth,
        desc: multiplyDesc,
      },
      integrate: {
        title: '04. Integrate (Convolution Integral)',
        formulaLatex: integralFormulaLatex,
        calculationLatex,
        finalValue: finalValueNum,
        theoreticalValue: theoreticalVal,
        diffFromTheory: Number(diffFromTheory.toFixed(4)),
        isExactMatch,
        desc: `Integrate the signed area under product g(τ) over active overlap to evaluate output y(${t.toFixed(1)}).`,
      },
    },
  };
}

/**
 * Exact Theoretical / Closed-Form Evaluator for continuous-time convolution at time t.
 * Supports all 16 input/system combinations.
 */
export function evalTheoreticalConvolutionAt(
  inputType,
  inputParams,
  systemType,
  systemParams,
  t
) {
  const A = inputParams.amplitude ?? 1.0;
  const t0 = inputParams.shift ?? 0.0;
  const Wx = inputParams.pulseWidth ?? 3.0;
  const f = inputParams.frequency ?? 0.25;
  const omega = 2 * Math.PI * f;

  const K = systemParams.gain ?? 1.0;
  const Wh = systemParams.windowSize ?? 4.0;
  const alpha = systemParams.decayRate ?? 0.6;
  const D = systemType === 'delay' ? (systemParams.delay ?? 3.0) : 0.0;

  // Case 1: Impulse * Impulse
  if (inputType === 'impulse' && (systemType === 'gain' || systemType === 'delay')) {
    const impTime = t0 + D;
    const isAt = Math.abs(t - impTime) < 0.05;
    return {
      value: isAt ? A * K : 0,
      isImpulse: true,
      impulseTime: impTime,
      impulseWeight: A * K,
      regime: isAt ? 'Dirac Impulse Coincidence' : 'Zero (Off Impulse Instant)',
      formulaLatex: `y(t) = ${A.toFixed(2)} \\times ${K.toFixed(2)} \\, \\delta(t - ${impTime.toFixed(1)})`,
      interpretation: isAt
        ? `Dirac impulses coincide at t = ${impTime.toFixed(1)}s, producing an output impulse of area ${(A * K).toFixed(2)}.`
        : `Off the impulse instant, the output is identically zero.`,
    };
  }

  // Case 2: Impulse Input
  if (inputType === 'impulse') {
    if (systemType === 'moving_average') {
      const isInside = t >= t0 && t <= t0 + Wh;
      const val = isInside ? (A * K) / Wh : 0;
      return {
        value: val,
        isImpulse: false,
        regime: t < t0 ? 'Causal Rest (Before Impulse)' : isInside ? 'Active Moving Average Window' : 'Post-Window Rest',
        formulaLatex: `y(t) = \\frac{${(A * K).toFixed(2)}}{${Wh.toFixed(1)}} \\big[u(t - ${t0.toFixed(1)}) - u(t - ${(t0 + Wh).toFixed(1)})\\big]`,
        interpretation: `Dirac sifting directly reconstructs the rectangular impulse response h(t - ${t0.toFixed(1)}) scaled by amplitude A = ${A.toFixed(2)}.`,
      };
    }
    if (systemType === 'exponential') {
      const val = t >= t0 ? A * K * Math.exp(-alpha * (t - t0)) : 0;
      return {
        value: val,
        isImpulse: false,
        regime: t < t0 ? 'Causal Rest' : 'Exponential Relaxation',
        formulaLatex: `y(t) = ${(A * K).toFixed(2)} \\, e^{-${alpha.toFixed(2)}(t - ${t0.toFixed(1)})} u(t - ${t0.toFixed(1)})`,
        interpretation: `Dirac impulse at t = ${t0.toFixed(1)}s instantly excites the filter, followed by autonomous exponential decay.`,
      };
    }
  }

  // Case 3: Memoryless Gain or Pure Delay
  if (systemType === 'gain' || systemType === 'delay') {
    const tauInput = t - D;
    let xVal = 0;
    if (inputType === 'rect') xVal = (tauInput >= t0 && tauInput <= t0 + Wx) ? A : 0;
    else if (inputType === 'step') xVal = tauInput >= t0 ? A : 0;
    else if (inputType === 'sine') xVal = tauInput >= t0 ? A * Math.sin(omega * (tauInput - t0)) : 0;
    const regime = systemType === 'gain' ? 'Instantaneous Scaled Output' : 'Pure Distortionless Delayed Output';
    return {
      value: K * xVal,
      isImpulse: false,
      regime,
      formulaLatex: systemType === 'gain' ? `y(t) = ${K.toFixed(2)} \\, x(t)` : `y(t) = ${K.toFixed(2)} \\, x(t - ${D.toFixed(1)})`,
      interpretation: systemType === 'gain'
        ? `Output is an instantaneous replica of the input scaled by system gain K = ${K.toFixed(2)}.`
        : `Output is identical in shape to the input but delayed by D = ${D.toFixed(1)}s and scaled by K = ${K.toFixed(2)}.`,
    };
  }

  // Case 4: Rect + Moving Average (Trapezoid / Triangle)
  if (inputType === 'rect' && systemType === 'moving_average') {
    const Wmin = Math.min(Wx, Wh);
    const Wmax = Math.max(Wx, Wh);
    const H = (A * K) / Wh;
    const t1 = t0;
    const t2 = t0 + Wmin;
    const t3 = t0 + Wmax;
    const t4 = t0 + Wx + Wh;

    if (t < t1) {
      return {
        value: 0,
        regime: 'Causal Rest (Before Interaction)',
        formulaLatex: `y(t) = 0`,
        interpretation: `The folded kernel h(t - τ) has not yet encountered the leading edge of the rectangular pulse at τ = ${t0.toFixed(1)}s.`,
      };
    }
    if (t <= t2) {
      const val = H * (t - t1);
      return {
        value: val,
        regime: 'Ramp-Up (Entering Window)',
        formulaLatex: `y(t) = ${H.toFixed(3)}(t - ${t1.toFixed(1)})`,
        interpretation: `Input pulse is entering the moving average window. Output accumulates linearly with slope ${H.toFixed(3)}.`,
      };
    }
    if (t <= t3) {
      const val = H * Wmin;
      return {
        value: val,
        regime: 'Steady-State Plateau (Full Overlap)',
        formulaLatex: `y(t) = ${val.toFixed(3)}`,
        interpretation: `The narrower signal is completely immersed inside the wider window, producing a constant peak plateau.`,
      };
    }
    if (t <= t4) {
      const val = H * (t4 - t);
      return {
        value: val,
        regime: 'Ramp-Down (Exiting Window)',
        formulaLatex: `y(t) = ${H.toFixed(3)}(${t4.toFixed(1)} - t)`,
        interpretation: `Input pulse is leaving the window. Overlap shrinks linearly down to zero at t = ${t4.toFixed(1)}s.`,
      };
    }
    return {
      value: 0,
      regime: 'Post-Interaction Rest (Zero)',
      formulaLatex: `y(t) = 0`,
      interpretation: `The signals are completely disjoint. Total active duration was ${Wx.toFixed(1)} + ${Wh.toFixed(1)} = ${(Wx + Wh).toFixed(1)}s.`,
    };
  }

  // Case 5: Step + Moving Average
  if (inputType === 'step' && systemType === 'moving_average') {
    const H = (A * K) / Wh;
    if (t < t0) {
      return {
        value: 0,
        regime: 'Pre-Arrival (Zero)',
        formulaLatex: `y(t) = 0`,
        interpretation: `Observation time precedes the unit step arrival instant t0 = ${t0.toFixed(1)}s.`,
      };
    }
    if (t <= t0 + Wh) {
      const val = H * (t - t0);
      return {
        value: val,
        regime: 'Linear Integration Ramp',
        formulaLatex: `y(t) = ${H.toFixed(3)}(t - ${t0.toFixed(1)})`,
        interpretation: `Unit step is continuously filling the window. Output ramps steadily towards asymptotic limit ${(A * K).toFixed(2)}.`,
      };
    }
    const val = A * K;
    return {
      value: val,
      regime: 'Steady-State Saturated Response',
      formulaLatex: `y(t) = ${(A * K).toFixed(2)}`,
      interpretation: `The moving average window is completely saturated with constant input A = ${A.toFixed(1)}, yielding constant output ${(A * K).toFixed(2)}.`,
    };
  }

  // Case 6: Rect + Exponential Filter (RC Charging & Discharging)
  if (inputType === 'rect' && systemType === 'exponential') {
    const scale = (A * K) / alpha;
    if (t < t0) {
      return {
        value: 0,
        regime: 'Causal Rest',
        formulaLatex: `y(t) = 0`,
        interpretation: `System has not yet received input. Energy storage is in zero-state rest.`,
      };
    }
    if (t <= t0 + Wx) {
      const val = scale * (1 - Math.exp(-alpha * (t - t0)));
      return {
        value: val,
        regime: 'Charging Phase (Pulse Active)',
        formulaLatex: `y(t) = ${scale.toFixed(3)}\\big(1 - e^{-${alpha.toFixed(2)}(t - ${t0.toFixed(1)})}\\big)`,
        interpretation: `Input pulse is driving the system. Output charges asymptotically towards ${scale.toFixed(3)} with time constant τ = ${(1 / alpha).toFixed(2)}s.`,
      };
    }
    const val = scale * (Math.exp(-alpha * (t - (t0 + Wx))) - Math.exp(-alpha * (t - t0)));
    return {
      value: val,
      regime: 'Discharging Phase (Free Relaxation)',
      formulaLatex: `y(t) = ${val.toFixed(3)} \\, e^{-${alpha.toFixed(2)}(t - ${(t0 + Wx).toFixed(1)})}`,
      interpretation: `Input pulse turned off at t = ${(t0 + Wx).toFixed(1)}s. System discharges its stored energy exponentially towards zero.`,
    };
  }

  // Case 7: Step + Exponential Filter (Classic 1st-Order Step Response)
  if (inputType === 'step' && systemType === 'exponential') {
    const scale = (A * K) / alpha;
    if (t < t0) {
      return {
        value: 0,
        regime: 'Pre-Arrival (Zero)',
        formulaLatex: `y(t) = 0`,
        interpretation: `Before step excitation arrival at t = ${t0.toFixed(1)}s.`,
      };
    }
    const val = scale * (1 - Math.exp(-alpha * (t - t0)));
    return {
      value: val,
      regime: 'Asymptotic Step Response',
      formulaLatex: `y(t) = ${scale.toFixed(3)}\\big(1 - e^{-${alpha.toFixed(2)}(t - ${t0.toFixed(1)})}\\big)`,
      interpretation: `First-order low-pass step response approaching steady-state asymptote y(∞) = ${scale.toFixed(3)}.`,
    };
  }

  // Case 8: Sine + Moving Average
  if (inputType === 'sine' && systemType === 'moving_average') {
    if (t < t0) {
      return {
        value: 0,
        regime: 'Pre-Arrival',
        formulaLatex: `y(t) = 0`,
        interpretation: `Observation time precedes the start of the sinusoid.`,
      };
    }
    const a = Math.max(t0, t - Wh);
    const b = t;
    const val = (A * K / (omega * Wh)) * (Math.cos(omega * (a - t0)) - Math.cos(omega * (b - t0)));
    const isTransient = t <= t0 + Wh;
    return {
      value: val,
      regime: isTransient ? 'Sinusoidal Turn-On Transient' : 'Filtered Sinusoid (Steady State)',
      formulaLatex: `y(t) = \\frac{${(A * K).toFixed(2)}}{${(omega * Wh).toFixed(2)}} \\big[\\cos(${omega.toFixed(2)}(a - ${t0.toFixed(1)})) - \\cos(${omega.toFixed(2)}(b - ${t0.toFixed(1)}))\\big]`,
      interpretation: isTransient
        ? `Sinusoid is filling the sliding window, exhibiting initial turn-on transient behavior.`
        : `Steady-state filtered sinusoid. Window acts as a sinc filter attenuating frequency ${f.toFixed(2)} Hz.`,
    };
  }

  // Case 9: Sine + Exponential Filter
  if (inputType === 'sine' && systemType === 'exponential') {
    if (t < t0) {
      return {
        value: 0,
        regime: 'Pre-Arrival',
        formulaLatex: `y(t) = 0`,
        interpretation: `Observation time precedes the start of the sinusoid.`,
      };
    }
    const denom = alpha * alpha + omega * omega;
    const dt0 = t - t0;
    const val = (A * K / denom) * (alpha * Math.sin(omega * dt0) - omega * Math.cos(omega * dt0) + omega * Math.exp(-alpha * dt0));
    return {
      value: val,
      regime: 'Filtered Sinusoid (Transient + Steady State)',
      formulaLatex: `y(t) = y_{\\text{ss}}(t) + y_{\\text{trans}}(t)`,
      interpretation: `Low-pass filtered sinusoidal response: contains an exponentially decaying transient and a steady-state sinusoid with phase lag.`,
    };
  }

  return {
    value: 0,
    regime: 'Zero Output',
    formulaLatex: `y(t) = 0`,
    interpretation: `Signals do not overlap at this instant.`,
  };
}

/**
 * Generate a comprehensive physical & engineering interpretation of the resulting output signal.
 * Explains filter behavior, waveform dynamics, mathematical closed-form formula, and verified convolution properties.
 */
export function getOutputSignalInterpretation(inputType, inputParams, systemType, systemParams) {
  const A = inputParams.amplitude ?? 1.0;
  const t0 = inputParams.shift ?? 0.0;
  const Wx = inputParams.pulseWidth ?? 3.0;
  const f = inputParams.frequency ?? 0.25;

  const K = systemParams.gain ?? 1.0;
  const Wh = systemParams.windowSize ?? 4.0;
  const alpha = systemParams.decayRate ?? 0.6;
  const D = systemType === 'delay' ? (systemParams.delay ?? 3.0) : 0.0;

  let title = '';
  let systemRole = '';
  let waveformExplanation = '';
  let closedFormFormulaLatex = '';
  let keyProperties = [];

  // Theoretical areas under signals for Area Property: Area(y) = Area(x) * Area(h)
  let areaX = 0;
  let areaH = 0;
  let areaYTheory = 0;

  if (inputType === 'rect') areaX = A * Wx;
  else if (inputType === 'impulse') areaX = A;
  else areaX = NaN; // step has infinite area; sine over interval varies

  if (systemType === 'moving_average') areaH = K;
  else if (systemType === 'exponential') areaH = K / alpha;
  else if (systemType === 'gain' || systemType === 'delay') areaH = K;

  if (!isNaN(areaX) && !isNaN(areaH)) {
    areaYTheory = areaX * areaH;
  }

  if (inputType === 'rect' && systemType === 'moving_average') {
    const Wmin = Math.min(Wx, Wh);
    const Wmax = Math.max(Wx, Wh);
    const H = (A * K) / Wh;
    const tStart = t0;
    const tEnd = t0 + Wx + Wh;
    const peakVal = H * Wmin;

    title = 'Rectangular Pulse convolved with Moving Average Filter';
    systemRole = 'Sliding-Window Finite Impulse Response (FIR) Integrator / Smoothing Filter';
    waveformExplanation =
      `Convolving two rectangular pulses of durations Wx = ${Wx.toFixed(1)}s and Wh = ${Wh.toFixed(1)}s produces a piecewise-linear ${Wx === Wh ? 'symmetric triangular' : 'trapezoidal'} output waveform. ` +
      `The linear ramp represents the pulse sliding into the window; the plateau represents full immersion; and the falling ramp represents exiting. ` +
      `The output duration exactly equals the sum of input and filter durations: ${(Wx + Wh).toFixed(1)}s.`;

    closedFormFormulaLatex =
      `y(t) = \\begin{cases} ` +
      `0, & t < ${tStart.toFixed(1)} \\\\[4pt]` +
      `${H.toFixed(3)}(t - ${tStart.toFixed(1)}), & ${tStart.toFixed(1)} \\le t < ${(t0 + Wmin).toFixed(1)} \\\\[4pt]` +
      `${peakVal.toFixed(3)}, & ${(t0 + Wmin).toFixed(1)} \\le t < ${(t0 + Wmax).toFixed(1)} \\\\[4pt]` +
      `${H.toFixed(3)}(${tEnd.toFixed(1)} - t), & ${(t0 + Wmax).toFixed(1)} \\le t < ${tEnd.toFixed(1)} \\\\[4pt]` +
      `0, & t \\ge ${tEnd.toFixed(1)}` +
      `\\end{cases}`;

    keyProperties = [
      { label: 'Waveform Geometry', value: Wx === Wh ? 'Symmetric Triangle' : 'Trapezoid with Plateau' },
      { label: 'Active Support', value: `[${tStart.toFixed(1)} s, ${tEnd.toFixed(1)} s] (Total ${(Wx + Wh).toFixed(1)} s)` },
      { label: 'Theoretical Peak', value: `${peakVal.toFixed(3)} V at t ∈ [${(t0 + Wmin).toFixed(1)}s, ${(t0 + Wmax).toFixed(1)}s]` },
      { label: 'Area Property', value: `∫y(t)dt = Area(x) × Area(h) = ${areaX.toFixed(2)} × ${areaH.toFixed(2)} = ${areaYTheory.toFixed(3)} V·s` },
    ];
  } else if (inputType === 'rect' && systemType === 'exponential') {
    const scale = (A * K) / alpha;
    const peakVal = scale * (1 - Math.exp(-alpha * Wx));
    const tau = 1 / alpha;

    title = 'Rectangular Pulse convolved with First-Order Exponential Decay';
    systemRole = 'Continuous-Time Single-Pole RC Low-Pass Filter / Integrator';
    waveformExplanation =
      `Models capacitor charging and discharging in an RC circuit driven by a voltage pulse. ` +
      `During the active pulse (${t0.toFixed(1)}s to ${(t0 + Wx).toFixed(1)}s), the output charges exponentially along 1 - e^{-α(t - t0)} towards asymptotic level ${scale.toFixed(3)} V. ` +
      `At t = ${(t0 + Wx).toFixed(1)}s, the input pulse turns off, and the accumulated energy discharges freely through the system resistor as an exponential tail.`;

    closedFormFormulaLatex =
      `y(t) = \\begin{cases} ` +
      `0, & t < ${t0.toFixed(1)} \\\\[4pt]` +
      `${scale.toFixed(3)}\\big(1 - e^{-${alpha.toFixed(2)}(t - ${t0.toFixed(1)})}\\big), & ${t0.toFixed(1)} \\le t < ${(t0 + Wx).toFixed(1)} \\\\[4pt]` +
      `${scale.toFixed(3)}\\big(e^{${(alpha * Wx).toFixed(2)}} - 1\\big) e^{-${alpha.toFixed(2)}(t - ${t0.toFixed(1)})}, & t \\ge ${(t0 + Wx).toFixed(1)}` +
      `\\end{cases}`;

    keyProperties = [
      { label: 'Filter Time Constant', value: `τ = 1/α = ${tau.toFixed(2)} s (63.2% rise time)` },
      { label: 'Asymptotic Ceiling', value: `y(∞) = AK/α = ${scale.toFixed(3)} V` },
      { label: 'Peak Reached', value: `${peakVal.toFixed(3)} V at end of pulse t = ${(t0 + Wx).toFixed(1)} s` },
      { label: 'Area Property', value: `∫y(t)dt = Area(x) × Area(h) = ${areaX.toFixed(2)} × ${areaH.toFixed(2)} = ${areaYTheory.toFixed(3)} V·s` },
    ];
  } else if (inputType === 'step' && systemType === 'moving_average') {
    const H = (A * K) / Wh;
    const yInf = A * K;

    title = 'Unit Step convolved with Moving Average Filter';
    systemRole = 'Sliding Finite-Window Integrator / Accumulator';
    waveformExplanation =
      `The unit step applies sustained constant input A = ${A.toFixed(1)} V starting at t = ${t0.toFixed(1)}s. ` +
      `As the step progressively fills the moving average window, the output rises with constant linear slope ${H.toFixed(3)} V/s. ` +
      `Once the window is completely filled (t ≥ ${(t0 + Wh).toFixed(1)}s), the output saturates at constant steady-state level y(t) = A·K = ${yInf.toFixed(2)} V.`;

    closedFormFormulaLatex =
      `y(t) = \\begin{cases} ` +
      `0, & t < ${t0.toFixed(1)} \\\\[4pt]` +
      `${H.toFixed(3)}(t - ${t0.toFixed(1)}), & ${t0.toFixed(1)} \\le t < ${(t0 + Wh).toFixed(1)} \\\\[4pt]` +
      `${yInf.toFixed(2)}, & t \\ge ${(t0 + Wh).toFixed(1)}` +
      `\\end{cases}`;

    keyProperties = [
      { label: 'Rise Duration', value: `Wh = ${Wh.toFixed(1)} s (linear ramp duration)` },
      { label: 'Accumulation Slope', value: `${H.toFixed(3)} V/s` },
      { label: 'Steady-State Output', value: `y_ss = A·K = ${yInf.toFixed(2)} V` },
      { label: 'System Memory', value: `Finite memory of ${Wh.toFixed(1)} s` },
    ];
  } else if (inputType === 'step' && systemType === 'exponential') {
    const scale = (A * K) / alpha;
    const tau = 1 / alpha;

    title = 'Unit Step convolved with First-Order Exponential Decay';
    systemRole = 'Classic First-Order LTI Step Response (RC Low-Pass Filter)';
    waveformExplanation =
      `Represents the textbook step response of an RC circuit or thermal cooling system. ` +
      `Starting from zero at t = ${t0.toFixed(1)}s, the output rises monotonically towards the steady-state asymptote y_ss = AK/α = ${scale.toFixed(3)} V. ` +
      `It reaches 63.2% of its final value in one time constant τ = ${tau.toFixed(2)}s, and over 95% in 3τ = ${(3 * tau).toFixed(2)}s.`;

    closedFormFormulaLatex =
      `y(t) = \\begin{cases} ` +
      `0, & t < ${t0.toFixed(1)} \\\\[4pt]` +
      `${scale.toFixed(3)}\\big(1 - e^{-${alpha.toFixed(2)}(t - ${t0.toFixed(1)})}\\big), & t \\ge ${t0.toFixed(1)}` +
      `\\end{cases}`;

    keyProperties = [
      { label: 'Time Constant (τ)', value: `τ = 1/α = ${tau.toFixed(2)} s` },
      { label: 'Rise Time (10% to 90%)', value: `tr ≈ 2.2 τ = ${(2.2 * tau).toFixed(2)} s` },
      { label: 'Steady-State Level', value: `y(∞) = AK/α = ${scale.toFixed(3)} V` },
      { label: 'DC System Gain', value: `H(0) = K/α = ${(K / alpha).toFixed(3)}` },
    ];
  } else if (inputType === 'sine' && systemType === 'moving_average') {
    const omega = 2 * Math.PI * f;
    const sincFactor = Math.abs(Math.sin(omega * Wh / 2) / (omega * Wh / 2));
    const ssAmp = A * K * sincFactor;

    title = 'Sine Wave convolved with Moving Average Filter';
    systemRole = 'Linear Phase FIR Low-Pass / Comb Filter';
    waveformExplanation =
      `A moving average filter operates as a sinc low-pass filter with frequency response H(f) = K·sinc(f·Wh)·e^{-jπ f Wh}. ` +
      `In steady state (t ≥ ${(t0 + Wh).toFixed(1)}s), the sine wave emerges with steady-state amplitude ${ssAmp.toFixed(3)} V and time delay Wh/2 = ${(Wh / 2).toFixed(2)}s. ` +
      `If Wh is an integer multiple of the period 1/f = ${(1 / f).toFixed(2)}s, complete destructive cancellation occurs (notch filter null).`;

    closedFormFormulaLatex =
      `y(t) = \\begin{cases} ` +
      `0, & t < ${t0.toFixed(1)} \\\\[4pt]` +
      `\\frac{AK}{\\omega W_h}\\big[1 - \\cos(\\omega(t - ${t0.toFixed(1)}))\\big], & ${t0.toFixed(1)} \\le t < ${(t0 + Wh).toFixed(1)} \\\\[4pt]` +
      `AK \\, \\mathrm{sinc}(f W_h) \\, \\sin\\!\\big(\\omega(t - ${t0.toFixed(1)} - \\frac{W_h}{2})\\big), & t \\ge ${(t0 + Wh).toFixed(1)}` +
      `\\end{cases}`;

    keyProperties = [
      { label: 'Input Frequency & Period', value: `f = ${f.toFixed(2)} Hz, T = ${(1 / f).toFixed(2)} s` },
      { label: 'Sinc Attenuation Factor', value: `|sinc(f·Wh)| = ${sincFactor.toFixed(3)}` },
      { label: 'Steady-State Amplitude', value: `${ssAmp.toFixed(3)} V (Phase lag: ${(Wh / 2).toFixed(2)} s)` },
      { label: 'First Filter Null Frequency', value: `f_null = 1/Wh = ${(1 / Wh).toFixed(3)} Hz` },
    ];
  } else if (inputType === 'sine' && systemType === 'exponential') {
    const omega = 2 * Math.PI * f;
    const denom = Math.sqrt(alpha * alpha + omega * omega);
    const ssAmp = (A * K) / denom;
    const phaseLagDeg = (Math.atan2(omega, alpha) * 180 / Math.PI).toFixed(1);

    title = 'Sine Wave convolved with First-Order Exponential Filter';
    systemRole = 'Continuous-Time Single-Pole Low-Pass Filter';
    waveformExplanation =
      `The output consists of a decaying transient term e^{-α(t - t0)} plus a steady-state sinusoidal response. ` +
      `The low-pass filter attenuates the input amplitude by factor 1/√(1 + (2πf/α)²) and introduces a phase lag of ${phaseLagDeg}°.`;

    closedFormFormulaLatex =
      `y(t) = \\frac{AK}{\\sqrt{\\alpha^2 + \\omega^2}} \\sin\\!\\big(\\omega(t - ${t0.toFixed(1)}) - \\phi\\big) + \\frac{AK\\omega}{\\alpha^2 + \\omega^2} e^{-\\alpha(t - ${t0.toFixed(1)})}`;

    keyProperties = [
      { label: 'Cutoff Frequency (-3dB)', value: `fc = α/(2π) = ${(alpha / (2 * Math.PI)).toFixed(3)} Hz` },
      { label: 'Steady-State Amplitude', value: `${ssAmp.toFixed(3)} V` },
      { label: 'Phase Shift', value: `-${phaseLagDeg}° (Phase Lag)` },
      { label: 'Transient Duration', value: `≈ 3τ = ${(3 / alpha).toFixed(2)} s` },
    ];
  } else if (systemType === 'gain') {
    title = 'Signal passed through Ideal Linear Gain';
    systemRole = 'Memoryless Proportional Scaling Operator';
    waveformExplanation =
      `An impulse response h(t) = K·δ(t) acts as the continuous convolution identity operator scaled by K = ${K.toFixed(2)}. ` +
      `The output waveform is an instantaneous, distortion-free replica of the input signal x(t) with zero time delay and zero phase distortion.`;

    closedFormFormulaLatex = `y(t) = ${K.toFixed(2)} \\cdot x(t)`;

    keyProperties = [
      { label: 'System Memory', value: 'Zero memory (Instantaneous)' },
      { label: 'Time Delay', value: '0.00 s (No group delay)' },
      { label: 'Amplitude Scaling', value: `${K.toFixed(2)}×` },
      { label: 'Waveform Fidelity', value: '100% distortion-free replica' },
    ];
  } else if (systemType === 'delay') {
    title = 'Signal passed through Ideal Pure Time Delay';
    systemRole = 'Distortionless Propagation Channel / Transmission Line';
    waveformExplanation =
      `Convolution with h(t) = K·δ(t - D) shifts the entire input signal along the time axis by delay D = ${D.toFixed(1)}s. ` +
      `The shape, duration, and frequency spectrum of the input signal are preserved with 100% fidelity, scaled by gain K = ${K.toFixed(2)}.`;

    closedFormFormulaLatex = `y(t) = ${K.toFixed(2)} \\cdot x(t - ${D.toFixed(1)})`;

    keyProperties = [
      { label: 'Propagation Delay', value: `D = ${D.toFixed(1)} s` },
      { label: 'Amplitude Factor', value: `${K.toFixed(2)}×` },
      { label: 'Distortion', value: 'Zero linear or phase distortion' },
      { label: 'Frequency Response', value: `|H(f)| = ${K.toFixed(2)}, linear phase -2πfD` },
    ];
  } else if (inputType === 'impulse') {
    title = 'Dirac Impulse convolved with Linear Time-Invariant System';
    systemRole = 'Direct System Characterization (Impulse Response Sifting)';
    waveformExplanation =
      `By the fundamental sifting property of continuous-time LTI systems, convolving an input Dirac impulse x(t) = A·δ(t - t0) with a system directly reveals the system impulse response h(t - t0) scaled by amplitude A = ${A.toFixed(2)}. ` +
      `This demonstrates why the impulse response h(t) completely determines the behavior of any linear time-invariant system.`;

    closedFormFormulaLatex = `y(t) = ${A.toFixed(2)} \\cdot h(t - ${t0.toFixed(1)})`;

    keyProperties = [
      { label: 'Sifting Property', value: '∫ A·δ(τ - t0) h(t - τ) dτ = A·h(t - t0)' },
      { label: 'Input Impulse Location', value: `t = ${t0.toFixed(1)} s (Weight: ${A.toFixed(2)})` },
      { label: 'Reconstructed Kernel', value: systemType === 'moving_average' ? 'Rectangular Window' : systemType === 'exponential' ? 'Exponential Decay' : 'Dirac Delta' },
      { label: 'LTI Principle', value: 'Impulse response completely characterizes the LTI system' },
    ];
  } else {
    title = 'Continuous-Time Convolution Output';
    systemRole = 'Linear Time-Invariant Filtering';
    waveformExplanation =
      `The output waveform y(t) represents the running continuous superposition of system responses to all infinitesimal components of input x(t).`;
    closedFormFormulaLatex = `y(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) \\, d\\tau`;
    keyProperties = [
      { label: 'Operation', value: 'Continuous-Time Convolution Integral' },
      { label: 'LTI Linearity', value: 'Superposition & Time Invariance' },
    ];
  }

  return {
    title,
    systemRole,
    waveformExplanation,
    closedFormFormulaLatex,
    keyProperties,
    areaX,
    areaH,
    areaYTheory,
  };
}

/**
 * Compute summary metrics for the convolution output y(t).
 */
export function computeConvolutionSummary(yResult, dt = DT) {
  if (yResult.isImpulse && yResult.impulses.length > 0) {
    const imp = yResult.impulses[0];
    return {
      peakValue: imp.weight,
      peakTime: imp.t,
      area: imp.weight,
      energy: Infinity,
      isImpulse: true,
    };
  }

  let peakValue = 0;
  let peakAbs = -1;
  let peakTime = 0;
  let area = 0;
  let energy = 0;

  const pts = yResult.points;
  for (let i = 0; i < pts.length; i++) {
    const v = pts[i].val;
    const absV = Math.abs(v);
    if (absV > peakAbs) {
      peakAbs = absV;
      peakValue = v;
      peakTime = pts[i].t;
    }
    const w = i === 0 || i === pts.length - 1 ? 0.5 : 1.0;
    area += w * v * dt;
    energy += w * v * v * dt;
  }

  return {
    peakValue,
    peakTime,
    area,
    energy,
    isImpulse: false,
  };
}

/**
 * Build KaTeX formulas for the currently selected input signal x(t) and impulse response h(t).
 */
export function buildSignalFormulas(inputType, inputParams, systemType, systemParams) {
  const A = (inputParams.amplitude ?? 1.0).toFixed(1);
  const t0Num = inputParams.shift ?? 0;
  const t0 = Math.abs(t0Num) < 1e-6 ? 't' : t0Num > 0 ? `(t - ${t0Num.toFixed(1)})` : `(t + ${Math.abs(t0Num).toFixed(1)})`;
  const uShift = Math.abs(t0Num) < 1e-6 ? 'u(t)' : t0Num > 0 ? `u(t - ${t0Num.toFixed(1)})` : `u(t + ${Math.abs(t0Num).toFixed(1)})`;

  let xLatex = '';
  switch (inputType) {
    case 'rect': {
      const endNum = t0Num + (inputParams.pulseWidth ?? 3.0);
      const uEnd = Math.abs(endNum) < 1e-6 ? 'u(t)' : endNum > 0 ? `u(t - ${endNum.toFixed(1)})` : `u(t + ${Math.abs(endNum).toFixed(1)})`;
      xLatex = `x(t) = ${A}\\,\\big[${uShift} - ${uEnd}\\big]`;
      break;
    }
    case 'step':
      xLatex = `x(t) = ${A}\\,${uShift}`;
      break;
    case 'sine': {
      const f = (inputParams.frequency ?? 0.25).toFixed(2);
      xLatex = `x(t) = ${A}\\sin\\!\\big(2\\pi (${f})\\,${t0}\\big)\\,${uShift}`;
      break;
    }
    case 'exp': {
      const ax = (inputParams.inputDecay ?? 0.7).toFixed(1);
      xLatex = `x(t) = ${A}\\,e^{-${ax}\\,${t0}}\\,${uShift}`;
      break;
    }
    case 'impulse': {
      const dArg = Math.abs(t0Num) < 1e-6 ? 't' : t0Num > 0 ? `t - ${t0Num.toFixed(1)}` : `t + ${Math.abs(t0Num).toFixed(1)}`;
      xLatex = `x(t) = ${A}\\,\\delta(${dArg})`;
      break;
    }
    default:
      xLatex = 'x(t)';
  }

  const K = (systemParams.gain ?? 1.0).toFixed(2).replace(/\.?0+$/, (m) => (m === '.00' ? '.0' : m));
  let hLatex = '';
  switch (systemType) {
    case 'moving_average': {
      const W = (systemParams.windowSize ?? 4.0).toFixed(1);
      const height = ((systemParams.gain ?? 1.0) / (systemParams.windowSize ?? 4.0)).toFixed(2);
      hLatex = `h(t) = \\frac{${K}}{${W}}\\,\\big[u(t) - u(t - ${W})\\big] = ${height}\\,\\big[u(t) - u(t - ${W})\\big]`;
      break;
    }
    case 'exponential': {
      const alpha = (systemParams.decayRate ?? 0.6).toFixed(2);
      hLatex = `h(t) = ${K}\\,e^{-${alpha}t}\\,u(t)`;
      break;
    }
    case 'gain':
      hLatex = `h(t) = ${K}\\,\\delta(t)`;
      break;
    case 'delay': {
      const D = systemParams.delay ?? 3.0;
      const dArg = Math.abs(D) < 1e-6 ? 't' : D > 0 ? `t - ${D.toFixed(1)}` : `t + ${Math.abs(D).toFixed(1)}`;
      hLatex = `h(t) = ${K}\\,\\delta(${dArg})`;
      break;
    }
    default:
      hLatex = 'h(t)';
  }

  return { xLatex, hLatex };
}
