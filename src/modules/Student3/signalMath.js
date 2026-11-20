/**
 * Mathematically accurate signal processing and systems analysis library
 * Supports both Discrete-time [n] and Continuous-time (t) representations.
 * Student 3: System Analysis and Properties
 */

export const SAMPLE_START = -5;
export const SAMPLE_END = 35;
export const CONTINUOUS_STEP = 0.2;

/**
 * Generate Input Signal x[n] or x(t)
 *
 * Types:
 * - 'impulse': Unit impulse delta[n - shift] or delta(t - shift)
 * - 'step': Unit step u[n - shift] or u(t - shift)
 * - 'sine': A * sin(2*pi*f*(t - shift) + phase)
 * - 'cosine': A * cos(2*pi*f*(t - shift) + phase)
 * - 'rect': Rectangular pulse of width W starting at shift
 * - 'exp': Exponential decaying / growing signal A * exp(-alpha * (t - shift)) * u(t - shift)
 */
export function generateInputSignal(type, params, isContinuous = false) {
  const {
    amplitude = 1.0,
    shift = 0,
    frequency = 0.08,
    pulseWidth = 5,
    phase = 0,
    alpha = 0.25, // Exponential decay constant
  } = params;

  const step = isContinuous ? CONTINUOUS_STEP : 1.0;
  const signal = [];

  for (let t = SAMPLE_START; t <= SAMPLE_END + 0.001; t += step) {
    const time = Math.round(t * 100) / 100;
    let val = 0;

    switch (type) {
      case 'impulse':
        if (isContinuous) {
          // Narrow pulse of width CONTINUOUS_STEP and area equal to amplitude
          // Representing continuous Dirac delta approximation
          val = Math.abs(time - shift) < CONTINUOUS_STEP / 2 ? amplitude : 0;
        } else {
          val = time === shift ? amplitude : 0;
        }
        break;

      case 'step':
        val = time >= shift ? amplitude : 0;
        break;

      case 'sine':
        if (time >= shift) {
          val = amplitude * Math.sin(2 * Math.PI * frequency * (time - shift) + phase);
        } else {
          val = 0;
        }
        break;

      case 'cosine':
        if (time >= shift) {
          val = amplitude * Math.cos(2 * Math.PI * frequency * (time - shift) + phase);
        } else {
          val = 0;
        }
        break;

      case 'rect':
        val = time >= shift && time < shift + pulseWidth ? amplitude : 0;
        break;

      case 'exp':
        if (time >= shift) {
          val = amplitude * Math.exp(-alpha * (time - shift));
        } else {
          val = 0;
        }
        break;

      default:
        val = 0;
    }

    signal.push({ n: time, val: Math.round(val * 1000) / 1000 });
  }

  return signal;
}

/**
 * Generate Impulse Response h[n] or h(t) for the selected system
 */
export function generateImpulseResponse(systemType, params, isContinuous = false) {
  const { gain = 1.5, delay = 3, windowSize = 4 } = params;
  const step = isContinuous ? CONTINUOUS_STEP : 1.0;
  const h = [];

  for (let t = SAMPLE_START; t <= SAMPLE_END + 0.001; t += step) {
    const time = Math.round(t * 100) / 100;
    let val = 0;

    switch (systemType) {
      case 'gain':
        if (isContinuous) {
          val = Math.abs(time) < CONTINUOUS_STEP / 2 ? gain : 0;
        } else {
          val = time === 0 ? gain : 0;
        }
        break;

      case 'delay':
        if (isContinuous) {
          val = Math.abs(time - delay) < CONTINUOUS_STEP / 2 ? 1.0 : 0;
        } else {
          val = time === delay ? 1.0 : 0;
        }
        break;

      case 'moving_average':
        if (time >= 0 && time < windowSize) {
          val = 1.0 / windowSize;
        } else {
          val = 0;
        }
        break;

      default:
        val = 0;
    }

    h.push({ n: time, val: Math.round(val * 1000) / 1000 });
  }

  return h;
}

/**
 * Compute System Output Signal y[n] or y(t)
 * Discrete: Exact linear convolution y[n] = sum_k x[k] h[n - k]
 * Continuous: Numerical Riemann sum approximation y(t) approx sum_k x(tau_k) h(t - tau_k) Delta tau
 */
export function computeOutputSignal(xSignal, hSignal, systemType, params, isContinuous = false) {
  const { gain = 1.5, delay = 3, windowSize = 4 } = params;
  const xMap = new Map(xSignal.map((pt) => [pt.n, pt.val]));

  if (isContinuous) {
    const step = CONTINUOUS_STEP;
    const output = [];

    for (let t = SAMPLE_START; t <= SAMPLE_END + 0.001; t += step) {
      const time = Math.round(t * 100) / 100;
      let val = 0;

      switch (systemType) {
        case 'gain':
          val = (xMap.get(time) || 0) * gain;
          break;

        case 'delay': {
          const shiftedTime = Math.round((time - delay) * 100) / 100;
          val = xMap.get(shiftedTime) || 0;
          break;
        }

        case 'moving_average': {
          // Continuous causal moving average: y(t) = (1/T) * integral_0^T x(t - tau) d_tau
          // Evaluated via numerical trapezoid/midpoint summation with step
          let sum = 0;
          let count = 0;
          for (let tau = 0; tau < windowSize; tau += step) {
            const sampleTime = Math.round((time - tau) * 100) / 100;
            sum += xMap.get(sampleTime) || 0;
            count++;
          }
          val = count > 0 ? sum / count : 0;
          break;
        }

        default:
          val = 0;
      }

      output.push({ n: time, val: Math.round(val * 1000) / 1000 });
    }

    return output;
  }

  // Discrete-time exact convolution: y[n] = sum_k x[k] * h[n - k]
  const hMap = new Map(hSignal.map((pt) => [pt.n, pt.val]));
  const output = [];

  for (let n = SAMPLE_START; n <= SAMPLE_END; n++) {
    let sum = 0;
    // Sum over generous bounds covering signal support
    for (let k = SAMPLE_START - 20; k <= SAMPLE_END + 20; k++) {
      const xVal = xMap.get(k) || 0;
      const hVal = hMap.get(n - k) || 0;
      if (xVal !== 0 && hVal !== 0) {
        sum += xVal * hVal;
      }
    }
    output.push({ n, val: Math.round(sum * 1000) / 1000 });
  }

  return output;
}

/**
 * Compute detailed step-by-step convolution breakdown for a specific sample index n.
 * Returns each multiplication term, index, and partial sum.
 */
export function getDiscreteConvolutionStep(nTarget, xSignal, hSignal) {
  const xMap = new Map(xSignal.map((pt) => [pt.n, pt.val]));
  const hMap = new Map(hSignal.map((pt) => [pt.n, pt.val]));

  const terms = [];
  let totalSum = 0;

  // Find all k where either x[k] != 0 or h[n - k] != 0, limited to relevant range
  for (let k = SAMPLE_START; k <= SAMPLE_END; k++) {
    const xVal = xMap.get(k) || 0;
    const hArg = nTarget - k;
    const hVal = hMap.get(hArg) || 0;
    const product = xVal * hVal;

    if (xVal !== 0 || hVal !== 0) {
      terms.push({
        k,
        xVal,
        hArg,
        hVal,
        product: Math.round(product * 1000) / 1000,
        isActive: product !== 0,
      });
      totalSum += product;
    }
  }

  // If no terms found, check if there's any point in support
  if (terms.length === 0) {
    terms.push({
      k: nTarget,
      xVal: xMap.get(nTarget) || 0,
      hArg: 0,
      hVal: hMap.get(0) || 0,
      product: 0,
      isActive: false,
    });
  }

  return {
    n: nTarget,
    terms,
    totalSum: Math.round(totalSum * 1000) / 1000,
  };
}

/**
 * System Properties Analyzer
 * Rigorously evaluates Linearity, Time Invariance, Causality, and BIBO Stability
 * based on actual mathematical definitions and parameter values.
 */
export function analyzeSystemProperties(systemType, params, isContinuous = false) {
  const { gain = 1.5, delay = 3, windowSize = 4 } = params;
  const varSym = isContinuous ? 't' : 'n';

  switch (systemType) {
    case 'gain': {
      const isLinear = true;
      const isTimeInvariant = true;
      const isCausal = true;
      const isBibo = Math.abs(gain) < Infinity;

      return {
        systemName: `Gain System: y[${varSym}] = ${gain.toFixed(1)} · x[${varSym}]`,
        systemEquation: isContinuous
          ? `y(t) = ${gain.toFixed(1)} \\, x(t)`
          : `y[n] = ${gain.toFixed(1)} \\, x[n]`,
        impulseEquation: isContinuous
          ? `h(t) = ${gain.toFixed(1)} \\, \\delta(t)`
          : `h[n] = ${gain.toFixed(1)} \\, \\delta[n]`,
        linearity: {
          passed: isLinear,
          name: 'Linearity',
          explanation:
            'The system satisfies both additivity and homogeneity (superposition principle). Scaling or adding inputs scales or adds the outputs identically.',
          test: 'T\\{a_1 x_1 + a_2 x_2\\} = K(a_1 x_1 + a_2 x_2) = a_1 (K x_1) + a_2 (K x_2) = a_1 T\\{x_1\\} + a_2 T\\{x_2\\}',
          example: `If x_1[${varSym}] produces y_1 = ${gain}x_1, and x_2 produces y_2 = ${gain}x_2, then 2x_1 + 3x_2 produces 2(${gain}x_1) + 3(${gain}x_2) = 2y_1 + 3y_2.`,
          reason: `Multiplication by constant K = ${gain.toFixed(1)} is a purely linear operation.`,
        },
        timeInvariance: {
          passed: isTimeInvariant,
          name: 'Time Invariance',
          explanation:
            'The system parameters are independent of time. Shifting the input by any amount causes an exact, identical time shift in the output.',
          test: `x[${varSym} - k] \\longrightarrow y_{shifted}[${varSym}] = K x[${varSym} - k] = y[${varSym} - k]`,
          example: `Shifting input by 3 steps produces y[${varSym} - 3] = ${gain.toFixed(1)} x[${varSym} - 3].`,
          reason: `The scaling factor K = ${gain.toFixed(1)} is static and does not depend on time variable ${varSym}.`,
        },
        causality: {
          passed: isCausal,
          name: 'Causality',
          explanation:
            `The output at any instant depends only on the input at that exact same instant. It never requires future values.`,
          test: `h[${varSym}] = 0 \\text{ for all } ${varSym} < 0 \\quad \\Longleftrightarrow \\quad y[${varSym}] \\text{ depends only on } x[k] \\text{ for } k \\le ${varSym}`,
          example: `To compute y[5], the system requires only x[5]. No future knowledge of x[6], x[7], ... is needed.`,
          reason: `Instantaneous memoryless mapping: y[${varSym}] = ${gain.toFixed(1)} x[${varSym}].`,
        },
        stability: {
          passed: isBibo,
          name: 'BIBO Stability',
          explanation:
            'Any bounded input (|x| <= B_x < infinity) results in a bounded output (|y| <= B_y < infinity).',
          test: `\\sum_{${varSym}=-\\infty}^{\\infty} |h[${varSym}]| = |K| = ${Math.abs(gain).toFixed(2)} < \\infty`,
          example: `If input is bounded by |x| <= 1.0, the output is strictly bounded by |y| <= |${gain.toFixed(1)}| * 1.0 = ${Math.abs(gain).toFixed(1)}.`,
          reason: `The impulse response is absolutely summable (contains a single impulse of finite weight ${gain.toFixed(1)}).`,
        },
        assumptions: [
          'Initial rest condition is assumed (system at rest before signal arrives).',
          `Gain factor K = ${gain.toFixed(1)} remains constant and finite throughout time.`,
        ],
      };
    }

    case 'delay': {
      const isLinear = true;
      const isTimeInvariant = true;
      const isCausal = delay >= 0;
      const isBibo = true;

      const signStr = delay >= 0 ? `- ${delay}` : `+ ${Math.abs(delay)}`;

      return {
        systemName: `Delay / Advance System: y[${varSym}] = x[${varSym} ${signStr}]`,
        systemEquation: isContinuous
          ? `y(t) = x(t ${signStr})`
          : `y[n] = x[n ${signStr}]`,
        impulseEquation: isContinuous
          ? `h(t) = \\delta(t ${signStr})`
          : `h[n] = \\delta[n ${signStr}]`,
        linearity: {
          passed: isLinear,
          name: 'Linearity',
          explanation:
            'Superposition holds: shifting a linear combination of signals is identical to the linear combination of shifted signals.',
          test: `T\\{a_1 x_1 + a_2 x_2\\} = a_1 x_1[${varSym} ${signStr}] + a_2 x_2[${varSym} ${signStr}] = a_1 y_1[${varSym}] + a_2 y_2[${varSym}]`,
          example: `If x_1[${varSym}] shifted is y_1 and x_2[${varSym}] shifted is y_2, then (a x_1 + b x_2) shifted equals a y_1 + b y_2.`,
          reason: 'Time-shifting is a linear mapping operation.',
        },
        timeInvariance: {
          passed: isTimeInvariant,
          name: 'Time Invariance',
          explanation:
            'A time delay of the input signal yields an identical delay in the output signal.',
          test: `x[${varSym} - k] \\longrightarrow y_{new}[${varSym}] = x[(${varSym} - k) ${signStr}] = y[${varSym} - k]`,
          example: `Delaying input by 2 yields y[${varSym} - 2] = x[(${varSym} - 2) ${signStr}].`,
          reason: `The shift amount D = ${delay} is fixed and independent of current time ${varSym}.`,
        },
        causality: {
          passed: isCausal,
          name: 'Causality',
          explanation: isCausal
            ? `Causal: The delay parameter D = ${delay} is >= 0, meaning output y[${varSym}] depends only on the present or past input sample x[${varSym} - ${delay}].`
            : `NON-CAUSAL (Anticipative): The delay parameter D = ${delay} is negative, meaning the system anticipates future inputs (time advance)!`,
          test: isCausal
            ? `h[${varSym}] = \\delta[${varSym} - ${delay}] = 0 \\text{ for all } ${varSym} < 0 \\implies \\text{Causal}`
            : `h[${varSym}] = \\delta[${varSym} - (${delay})] = 1 \\text{ at } ${varSym} = ${delay} < 0 \\implies \\text{NON-CAUSAL}`,
          example: isCausal
            ? `At ${varSym} = 0, y[0] = x[${0 - delay}] (sample from ${delay} steps in the past).`
            : `At ${varSym} = 0, y[0] = x[${0 - delay}] (requires future input ${Math.abs(delay)} steps ahead!).`,
          reason: isCausal
            ? `Delay D = ${delay} >= 0 satisfies condition h[${varSym}] = 0 for ${varSym} < 0.`
            : `Negative delay D = ${delay} creates an advance system requiring future knowledge, violating physical causality.`,
        },
        stability: {
          passed: isBibo,
          name: 'BIBO Stability',
          explanation:
            'Pure time-shifting does not change signal amplitude; bounded inputs remain bounded by the exact same bound.',
          test: `\\sum_{${varSym}=-\\infty}^{\\infty} |h[${varSym}]| = |1.0| = 1 < \\infty`,
          example: `If |x[${varSym}]| <= 2.5 for all ${varSym}, then |y[${varSym}]| = |x[${varSym} ${signStr}]| <= 2.5 for all ${varSym}.`,
          reason: 'Impulse response has total energy/magnitude sum equal to 1.0 (absolutely summable).',
        },
        assumptions: [
          'Initial rest condition holds for negative infinite time.',
          `Delay amount D = ${delay} is a fixed constant.`,
        ],
      };
    }

    case 'moving_average': {
      const isLinear = true;
      const isTimeInvariant = true;
      const isCausal = true; // Causal FIR moving average
      const isBibo = true;

      return {
        systemName: `${windowSize}-Point Moving Average System`,
        systemEquation: isContinuous
          ? `y(t) = \\frac{1}{${windowSize}} \\int_{0}^{${windowSize}} x(t - \\tau) \\, d\\tau`
          : `y[n] = \\frac{1}{${windowSize}} \\sum_{k=0}^{${windowSize - 1}} x[n - k]`,
        impulseEquation: isContinuous
          ? `h(t) = \\begin{cases} \\frac{1}{${windowSize}}, & 0 \\le t < ${windowSize} \\\\ 0, & \\text{otherwise} \\end{cases}`
          : `h[n] = \\begin{cases} \\frac{1}{${windowSize}}, & 0 \\le n \\le ${windowSize - 1} \\\\ 0, & \\text{otherwise} \\end{cases}`,
        linearity: {
          passed: isLinear,
          name: 'Linearity',
          explanation:
            'Summation and division by M are linear operations. Superposition holds exactly.',
          test: `T\\{a_1 x_1 + a_2 x_2\\} = \\frac{1}{M}\\sum (a_1 x_1[n-k] + a_2 x_2[n-k]) = a_1 y_1[n] + a_2 y_2[n]`,
          example: `Average of (2x_1 + 3x_2) equals 2*(average of x_1) + 3*(average of x_2).`,
          reason: 'Finite linear combination of past input samples.',
        },
        timeInvariance: {
          passed: isTimeInvariant,
          name: 'Time Invariance',
          explanation:
            'A shift in input by k shifts all averaged terms by k, resulting in an identical output shift.',
          test: `x[n - k_0] \\longrightarrow \\frac{1}{M}\\sum_{k=0}^{M-1} x[(n - k_0) - k] = y[n - k_0]`,
          example: `If input is delayed by 4 samples, the smoothed moving average is delayed by exactly 4 samples.`,
          reason: `Coefficients are constant (1/${windowSize}) for all time steps.`,
        },
        causality: {
          passed: isCausal,
          name: 'Causality',
          explanation:
            `The filter only uses present and past samples: x[n], x[n-1], ..., x[n-${windowSize - 1}]. No future samples are referenced.`,
          test: `h[n] = 0 \\text{ for all } n < 0 \\implies \\text{Causal FIR System}`,
          example: `To compute y[10] with M = ${windowSize}, the system needs x[10], x[9], ..., x[${10 - windowSize + 1}]. All indices <= 10.`,
          reason: `Index range in summation k goes from 0 to ${windowSize - 1}, so n - k <= n.`,
        },
        stability: {
          passed: isBibo,
          name: 'BIBO Stability',
          explanation:
            'A finite impulse response (FIR) system with bounded coefficients is unconditionally BIBO stable.',
          test: `\\sum_{n=-\\infty}^{\\infty} |h[n]| = \\sum_{k=0}^{${windowSize - 1}} \\frac{1}{${windowSize}} = ${windowSize} \\times \\frac{1}{${windowSize}} = 1.0 < \\infty`,
          example: `If input is bounded by |x[n]| <= 10, then |y[n]| <= (1/${windowSize}) * (${windowSize} * 10) = 10.`,
          reason: `Sum of absolute impulse response values equals 1.0, which is finite.`,
        },
        assumptions: [
          `Causal FIR configuration: window encompasses indices k in [0, ${windowSize - 1}].`,
          'Zero initial state for negative time samples.',
        ],
      };
    }

    default:
      return null;
  }
}
