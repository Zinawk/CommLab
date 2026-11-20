import React, { useEffect, useMemo, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Interactive botanical + wave background animation.
 * Features a centered flower inside the circular frame whose visual focus
 * is its swirling interior curves (counter-rotating Fibonacci spirals, nested
 * harmonic rose curves, and a golden-angle phyllotaxis core) in faded,
 * muted botanical shades, surrounded by smooth rotating wave projections.
 */
function EulerBackgroundAnimation({ pointerTargetRef }) {
  const phasorLineRef = useRef(null);
  const phasorDotRef = useRef(null);
  const cosBarRef = useRef(null);
  const sinBarRef = useRef(null);
  const projToCosRef = useRef(null);
  const projToSinRef = useRef(null);
  const angleArcRef = useRef(null);
  const sineWaveRef = useRef(null);
  const cosineWaveRef = useRef(null);
  const sineLinkRef = useRef(null);
  const cosLinkRef = useRef(null);
  const flowerInnerGroupRef = useRef(null);
  const flowerMidCurvesRef = useRef(null);

  const cx = 490;
  const cy = 212;
  const R = 112;
  const waveStartX = 635;
  const waveEndX = 948;
  const cosWaveStartY = 342;
  const cosWaveEndY = 442;

  const {
    outerCorollaPath,
    spiralArms,
    midRoseCurveA,
    midRoseCurveB,
    innerRoseCurve,
    phyllotaxisSeeds,
  } = useMemo(() => {
    // Subtle outer corolla silhouette (kept understated so interior curves dominate)
    const corollaPts = [];
    const corollaSteps = 180;
    for (let i = 0; i <= corollaSteps; i++) {
      const phi = (i / corollaSteps) * Math.PI * 2;
      const r = 88 + 10 * Math.cos(8 * phi);
      const x = r * Math.cos(phi);
      const y = r * Math.sin(phi);
      corollaPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Interwoven counter-rotating logarithmic spiral curves filling the interior
    const arms = [];
    const armCount = 18;
    const armSteps = 22;
    for (let a = 0; a < armCount; a++) {
      const baseAngle = (a / armCount) * Math.PI * 2;
      const cwPts = [];
      const ccwPts = [];
      for (let step = 0; step <= armSteps; step++) {
        const u = step / armSteps;
        const r = 8 + u * 84;
        const twist = 0.95 * Math.pow(u, 1.15);

        const angCw = baseAngle + twist;
        cwPts.push(
          `${step === 0 ? 'M' : 'L'} ${(r * Math.cos(angCw)).toFixed(1)} ${(r * Math.sin(angCw)).toFixed(1)}`
        );

        const angCcw = baseAngle - twist;
        ccwPts.push(
          `${step === 0 ? 'M' : 'L'} ${(r * Math.cos(angCcw)).toFixed(1)} ${(r * Math.sin(angCcw)).toFixed(1)}`
        );
      }
      arms.push({
        id: `cw-${a}`,
        d: cwPts.join(' '),
        stroke: a % 2 === 0 ? '#8E9E88' : '#B59B82',
        opacity: a % 2 === 0 ? 0.58 : 0.45,
      });
      arms.push({
        id: `ccw-${a}`,
        d: ccwPts.join(' '),
        stroke: a % 2 === 0 ? '#A5B49F' : '#C5B8A5',
        opacity: a % 2 === 0 ? 0.52 : 0.42,
      });
    }

    // Harmonic rose curve helper: r(phi) = base + amp * |cos(petals * phi)|
    const buildRoseCurve = (petals, baseR, ampR, phaseOffset = 0, power = 1) => {
      const pts = [];
      const steps = 240;
      for (let i = 0; i <= steps; i++) {
        const phi = (i / steps) * Math.PI * 2;
        const wave = Math.pow(Math.abs(Math.cos((petals * phi) / 2 + phaseOffset)), power);
        const r = baseR + ampR * wave;
        const x = r * Math.cos(phi);
        const y = r * Math.sin(phi);
        pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      return `${pts.join(' ')} Z`;
    };

    // Golden-angle phyllotaxis seed vortex in the inner heart
    const goldenAngle = (Math.PI * (3 - Math.sqrt(5)));
    const seeds = [];
    for (let n = 0; n < 48; n++) {
      const angle = n * goldenAngle;
      const radius = 3.8 * Math.sqrt(n);
      seeds.push({
        cx: (radius * Math.cos(angle)).toFixed(1),
        cy: (radius * Math.sin(angle)).toFixed(1),
        r: n < 12 ? 1.5 : n < 30 ? 1.85 : 2.1,
        fill: n % 3 === 0 ? '#8B9A83' : n % 3 === 1 ? '#B8A68F' : '#CBD5C6',
      });
    }

    return {
      outerCorollaPath: `${corollaPts.join(' ')} Z`,
      spiralArms: arms,
      midRoseCurveA: buildRoseCurve(8, 18, 56, 0, 1.35),
      midRoseCurveB: buildRoseCurve(8, 14, 46, Math.PI / 4, 1.45),
      innerRoseCurve: buildRoseCurve(6, 10, 28, 0, 1.25),
      phyllotaxisSeeds: seeds,
    };
  }, []);

  useEffect(() => {
    const pointerSmooth = { x: 0, y: 0 };

    const buildSinePath = (theta, rippleBoost) => {
      const pts = [];
      const samples = 72;
      const amp = R * (0.94 + rippleBoost * 0.08);
      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const x = waveStartX + u * (waveEndX - waveStartX);
        const y = cy - amp * Math.sin(theta - u * Math.PI * 2.4);
        pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      return pts.join(' ');
    };

    const buildCosinePath = (theta, rippleBoost) => {
      const pts = [];
      const samples = 44;
      const amp = R * (0.94 + rippleBoost * 0.08);
      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const y = cosWaveStartY + u * (cosWaveEndY - cosWaveStartY);
        const x = cx + amp * Math.cos(theta - u * Math.PI * 1.4);
        pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      return pts.join(' ');
    };

    const applyFrame = (theta, elapsedSec, px, py) => {
      const cosVal = Math.cos(theta);
      const sinVal = Math.sin(theta);
      const tipX = cx + R * cosVal;
      const tipY = cy - R * sinVal;

      if (phasorLineRef.current) {
        phasorLineRef.current.setAttribute('x2', tipX.toFixed(1));
        phasorLineRef.current.setAttribute('y2', tipY.toFixed(1));
      }
      if (phasorDotRef.current) {
        phasorDotRef.current.setAttribute('cx', tipX.toFixed(1));
        phasorDotRef.current.setAttribute('cy', tipY.toFixed(1));
      }
      if (cosBarRef.current) {
        cosBarRef.current.setAttribute('x2', tipX.toFixed(1));
      }
      if (sinBarRef.current) {
        sinBarRef.current.setAttribute('y2', tipY.toFixed(1));
      }
      if (projToCosRef.current) {
        projToCosRef.current.setAttribute('x1', tipX.toFixed(1));
        projToCosRef.current.setAttribute('y1', tipY.toFixed(1));
        projToCosRef.current.setAttribute('x2', tipX.toFixed(1));
        projToCosRef.current.setAttribute('y2', cy.toFixed(1));
      }
      if (projToSinRef.current) {
        projToSinRef.current.setAttribute('x1', tipX.toFixed(1));
        projToSinRef.current.setAttribute('y1', tipY.toFixed(1));
        projToSinRef.current.setAttribute('x2', cx.toFixed(1));
        projToSinRef.current.setAttribute('y2', tipY.toFixed(1));
      }
      if (sineLinkRef.current) {
        sineLinkRef.current.setAttribute('x1', tipX.toFixed(1));
        sineLinkRef.current.setAttribute('y1', tipY.toFixed(1));
        sineLinkRef.current.setAttribute('x2', waveStartX.toFixed(1));
        sineLinkRef.current.setAttribute('y2', tipY.toFixed(1));
      }
      if (cosLinkRef.current) {
        cosLinkRef.current.setAttribute('x1', tipX.toFixed(1));
        cosLinkRef.current.setAttribute('y1', cy.toFixed(1));
        cosLinkRef.current.setAttribute('x2', tipX.toFixed(1));
        cosLinkRef.current.setAttribute('y2', cosWaveStartY.toFixed(1));
      }
      if (angleArcRef.current) {
        const arcR = 26;
        const normTheta = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const ax = cx + arcR * Math.cos(normTheta);
        const ay = cy - arcR * Math.sin(normTheta);
        const largeArc = normTheta > Math.PI ? 1 : 0;
        angleArcRef.current.setAttribute(
          'd',
          `M ${(cx + arcR).toFixed(1)} ${cy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${ax.toFixed(1)} ${ay.toFixed(1)}`
        );
      }

      // Gently breathe & rotate interior flower curves in response to time and cursor
      const bloomScale = 1 + 0.025 * Math.sin(elapsedSec * 0.9) + py * 0.04;
      const slowTwistDeg = elapsedSec * 5 + px * 16;
      const counterTwistDeg = -elapsedSec * 3.5 - px * 10;

      if (flowerInnerGroupRef.current) {
        flowerInnerGroupRef.current.setAttribute(
          'transform',
          `rotate(${slowTwistDeg.toFixed(2)}) scale(${bloomScale.toFixed(4)})`
        );
      }
      if (flowerMidCurvesRef.current) {
        flowerMidCurvesRef.current.setAttribute(
          'transform',
          `rotate(${counterTwistDeg.toFixed(2)})`
        );
      }

      if (sineWaveRef.current) {
        sineWaveRef.current.setAttribute('d', buildSinePath(theta, py));
      }
      if (cosineWaveRef.current) {
        cosineWaveRef.current.setAttribute('d', buildCosinePath(theta, px));
      }
    };

    const mediaQuery =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    if (mediaQuery && mediaQuery.matches) {
      applyFrame(0.74, 0, 0, 0);
      return undefined;
    }

    let rafId = null;
    let startMs = null;

    const tick = (now) => {
      if (startMs === null) startMs = now;
      const elapsedSec = (now - startMs) / 1000;

      const target = pointerTargetRef.current;
      pointerSmooth.x += (target.x - pointerSmooth.x) * 0.06;
      pointerSmooth.y += (target.y - pointerSmooth.y) * 0.06;

      const theta = 0.65 + elapsedSec * 0.68 + pointerSmooth.x * 0.35;
      applyFrame(theta, elapsedSec, pointerSmooth.x, pointerSmooth.y);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [pointerTargetRef]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-end"
    >
      <svg
        viewBox="0 0 960 450"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full opacity-[0.38] select-none"
      >
        <defs>
          <radialGradient id="bgEulerAura" cx="52%" cy="46%" r="48%">
            <stop offset="0%" stopColor="#F5F0EA" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#F5F0EA" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="corollaWashGrad" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#EDF1EA" stopOpacity="0.95" />
            <stop offset="62%" stopColor="#F5EFE6" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0.4" />
          </radialGradient>

          <radialGradient id="innerCurveGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D7DFD2" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#E9E2D6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r="230" fill="url(#bgEulerAura)" />

        {/* Subtle axes extending around the circular frame */}
        <line
          x1={cx - R - 26}
          y1={cy}
          x2={cx + R + 26}
          y2={cy}
          stroke="#8C7265"
          strokeOpacity="0.24"
          strokeWidth="1.15"
        />
        <line
          x1={cx}
          y1={cy - R - 26}
          x2={cx}
          y2={cy + R + 26}
          stroke="#8C7265"
          strokeOpacity="0.24"
          strokeWidth="1.15"
        />

        {/* Circular background frame */}
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="#FAF7F2"
          fillOpacity="0.68"
          stroke="#9A8C7A"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />

        {/* Centered flower emphasizing rich interior curves inside the circle */}
        <g transform={`translate(${cx}, ${cy})`}>
          {/* Very soft outer blossom contour so the inner curves remain the centerpiece */}
          <path
            d={outerCorollaPath}
            fill="url(#corollaWashGrad)"
            stroke="#CFC4B4"
            strokeOpacity="0.55"
            strokeWidth="1"
          />

          <circle cx="0" cy="0" r="82" fill="url(#innerCurveGlow)" />

          {/* Counter-rotating logarithmic Fibonacci spiral curve lattice */}
          <g ref={flowerMidCurvesRef}>
            {spiralArms.map((arm) => (
              <path
                key={arm.id}
                d={arm.d}
                fill="none"
                stroke={arm.stroke}
                strokeOpacity={arm.opacity}
                strokeWidth="1.15"
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* Nested harmonic rose-curve interior layers (interactive & breathing) */}
          <g ref={flowerInnerGroupRef}>
            <path
              d={midRoseCurveA}
              fill="#F6F1E9"
              fillOpacity="0.32"
              stroke="#8A9B83"
              strokeOpacity="0.72"
              strokeWidth="1.35"
              strokeLinejoin="round"
            />
            <path
              d={midRoseCurveB}
              fill="#E8EDE5"
              fillOpacity="0.34"
              stroke="#AE8D74"
              strokeOpacity="0.68"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
            <path
              d={innerRoseCurve}
              fill="#FAF7F2"
              fillOpacity="0.5"
              stroke="#7A8D74"
              strokeOpacity="0.8"
              strokeWidth="1.35"
              strokeLinejoin="round"
            />

            {/* Delicate curved radial inner veins */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <path
                key={`vein-${deg}`}
                d="M 0 0 Q 16 -22, 0 -54"
                transform={`rotate(${deg})`}
                fill="none"
                stroke="#9BA894"
                strokeOpacity="0.45"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
            ))}

            {/* Golden-angle phyllotaxis inner spiral heart */}
            <circle
              cx="0"
              cy="0"
              r="28"
              fill="#F5F0EA"
              fillOpacity="0.6"
              stroke="#C5B8A5"
              strokeOpacity="0.45"
              strokeWidth="0.85"
            />
            {phyllotaxisSeeds.map((seed, idx) => (
              <circle
                key={idx}
                cx={seed.cx}
                cy={seed.cy}
                r={seed.r}
                fill={seed.fill}
                fillOpacity="0.82"
              />
            ))}
            <circle cx="0" cy="0" r="4.5" fill="#FAF7F2" stroke="#8E9E88" strokeWidth="1" />
          </g>
        </g>

        {/* Subtle angle sweep arc */}
        <path
          ref={angleArcRef}
          d={`M ${cx + 26} ${cy} A 26 26 0 0 0 ${cx + 18} ${cy - 18}`}
          fill="none"
          stroke="#6B5145"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />

        {/* Projections onto horizontal & vertical axes */}
        <line
          ref={projToCosRef}
          x1={cx + 76}
          y1={cy - 76}
          x2={cx + 76}
          y2={cy}
          stroke="#9A4324"
          strokeOpacity="0.48"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />
        <line
          ref={projToSinRef}
          x1={cx + 76}
          y1={cy - 76}
          x2={cx}
          y2={cy - 76}
          stroke="#2E6B52"
          strokeOpacity="0.48"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />

        {/* Subtle axis projection highlights */}
        <line
          ref={cosBarRef}
          x1={cx}
          y1={cy}
          x2={cx + 76}
          y2={cy}
          stroke="#9A4324"
          strokeOpacity="0.48"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <line
          ref={sinBarRef}
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - 76}
          stroke="#2E6B52"
          strokeOpacity="0.48"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Linkage lines from rotating radial pointer tip to sine & cosine waves */}
        <line
          ref={sineLinkRef}
          x1={cx + 76}
          y1={cy - 76}
          x2={waveStartX}
          y2={cy - 76}
          stroke="#2E6B52"
          strokeOpacity="0.52"
          strokeWidth="1.3"
          strokeDasharray="4 4"
        />
        <line
          ref={cosLinkRef}
          x1={cx + 76}
          y1={cy}
          x2={cx + 76}
          y2={cosWaveStartY}
          stroke="#9A4324"
          strokeOpacity="0.52"
          strokeWidth="1.3"
          strokeDasharray="4 4"
        />

        {/* Rotating radial pointer */}
        <line
          ref={phasorLineRef}
          x1={cx}
          y1={cy}
          x2={cx + 76}
          y2={cy - 76}
          stroke="#6B5145"
          strokeOpacity="0.5"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle ref={phasorDotRef} cx={cx + 76} cy={cy - 76} r="4.8" fill="#9A4324" fillOpacity="0.72" />

        {/* Projected living sine waveform */}
        <line
          x1={waveStartX}
          y1={cy}
          x2={waveEndX}
          y2={cy}
          stroke="#D4C8BC"
          strokeWidth="1.15"
        />
        <path
          ref={sineWaveRef}
          d={`M ${waveStartX} ${cy} L ${waveEndX} ${cy}`}
          fill="none"
          stroke="#2E6B52"
          strokeOpacity="0.82"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Projected living cosine waveform */}
        <line
          x1={cx}
          y1={cosWaveStartY}
          x2={cx}
          y2={cosWaveEndY}
          stroke="#D4C8BC"
          strokeWidth="1.15"
        />
        <path
          ref={cosineWaveRef}
          d={`M ${cx} ${cosWaveStartY} L ${cx} ${cosWaveEndY}`}
          fill="none"
          stroke="#9A4324"
          strokeOpacity="0.78"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>

      {/* Left-side soft white scrim protecting typography legibility without washing out the centered flower */}
      <div className="absolute inset-y-0 left-0 w-full md:w-[46%] bg-gradient-to-r from-white/95 via-white/60 to-transparent" />
    </div>
  );
}

export default function LandingOverview({ onSelectModule }) {
  const pointerTargetRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointerTargetRef.current = {
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
    };
  };

  const handleMouseLeave = () => {
    pointerTargetRef.current = { x: 0, y: 0 };
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex-1 flex items-center py-6 lg:py-4">
      <section
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full overflow-hidden rounded-2xl border border-[#E4DBD2] bg-white px-6 py-14 sm:px-10 sm:py-20 lg:px-12 lg:py-24"
      >
        <EulerBackgroundAnimation pointerTargetRef={pointerTargetRef} />

        <div className="relative z-10 max-w-2xl space-y-5">
          <p className="text-xs font-mono tracking-wider text-[#9A4324] font-semibold">
            Interactive Engineering Simulation Platform
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-bold tracking-tight text-[#3B2923] leading-[1.1] text-balance">
            Signals and Systems Simulator
          </h1>
          <p className="text-base sm:text-lg text-[#6B5145] leading-relaxed max-w-xl">
            Explore the mathematics behind signals, systems, and communication through
            interactive visualizations and hands-on simulations.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onSelectModule(1)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#9A4324] hover:bg-[#7D341A] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Explore Module 1</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectModule(2)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#F5F0EA] hover:bg-[#EDE4DA] text-[#3B2923] border border-[#E4DBD2] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Explore Module 2</span>
              <ArrowRight className="w-4 h-4 text-[#9A4324]" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
