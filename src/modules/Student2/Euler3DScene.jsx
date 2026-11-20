import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RotateCcw } from 'lucide-react';

/**
 * Light-canvas 3D interactive Euler visualization:
 * e^(jθ) = cos(θ) + j·sin(θ)
 */
export default function Euler3DScene({
  angleDeg = 45,
  cameraView = 'isometric',
  onCameraViewChange,
}) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const cameraTransitionRef = useRef(null);

  const dynamicRefs = useRef({
    pointCircle: null,
    radiusLine: null,
    angleArc: null,
    xBar: null,
    yBar: null,
    xDropLine: null,
    yDropLine: null,
    projLineCos: null,
    projLineSin: null,
    guideLineCosZ: null,
    guideLineSinZ: null,
    markerCos: null,
    markerSin: null,
    cosProgressiveMesh: null,
    sinProgressiveMesh: null,
  });

  const targetAngleRef = useRef(angleDeg);
  useEffect(() => {
    targetAngleRef.current = angleDeg;
  }, [angleDeg]);

  const CENTER_OF_SCENE = useRef(new THREE.Vector3(0, 0, Math.PI));

  const setCameraPreset = useCallback((preset) => {
    if (!controlsRef.current || !cameraRef.current) return;
    const center = CENTER_OF_SCENE.current;

    const targetPos = new THREE.Vector3();
    const targetUp = new THREE.Vector3(0, 1, 0);
    const targetLook = center.clone();

    switch (preset) {
      case 'circle':
        targetPos.set(0, 0, -4.8);
        targetLook.set(0, 0, 0.4);
        targetUp.set(0, 1, 0);
        break;
      case 'back':
        targetPos.set(0, 0, Math.PI * 2 + 5.0);
        targetLook.set(0, 0, Math.PI);
        targetUp.set(0, 1, 0);
        break;
      case 'cosine':
        targetPos.set(0, 6.8, Math.PI);
        targetLook.copy(center);
        targetUp.set(0, 0, -1);
        break;
      case 'bottom':
        targetPos.set(0, -6.8, Math.PI);
        targetLook.copy(center);
        targetUp.set(0, 0, 1);
        break;
      case 'sine':
        targetPos.set(6.8, 0, Math.PI);
        targetLook.copy(center);
        targetUp.set(0, 1, 0);
        break;
      case 'left':
        targetPos.set(-6.8, 0, Math.PI);
        targetLook.copy(center);
        targetUp.set(0, 1, 0);
        break;
      case 'isometric':
      default:
        targetPos.set(4.2, 3.2, -1.8);
        targetLook.copy(center);
        targetUp.set(0, 1, 0);
        break;
    }

    cameraTransitionRef.current = {
      targetPos,
      targetLook,
      targetUp,
    };
  }, []);

  useEffect(() => {
    if (cameraView && cameraView !== 'custom') {
      setCameraPreset(cameraView);
    }
  }, [cameraView, setCameraPreset]);

  const handleResetCamera = useCallback(() => {
    if (onCameraViewChange) {
      onCameraViewChange('isometric');
    }
    setCameraPreset('isometric');
  }, [onCameraViewChange, setCameraPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 380;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const spanZ = Math.PI * 2;
    camera.position.set(4.2, 3.2, -1.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, Math.PI);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minPolarAngle = 0.0001;
    controls.maxPolarAngle = Math.PI - 0.0001;
    controls.enableZoom = true;
    controls.minDistance = 0.8;
    controls.maxDistance = 35.0;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 1.1;
    controls.panSpeed = 0.9;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controls.update();
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      cameraTransitionRef.current = null;
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight1.position.set(6, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x0369a1, 0.5);
    dirLight2.position.set(-6, 6, -4);
    scene.add(dirLight2);

    const dirLightBottom = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLightBottom.position.set(0, -8, Math.PI);
    scene.add(dirLightBottom);

    const axesGroup = new THREE.Group();
    scene.add(axesGroup);

    const axisMat = new THREE.LineBasicMaterial({ color: 0x3b2923, transparent: true, opacity: 0.72 });

    axesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.5, 0, 0),
      new THREE.Vector3(1.6, 0, 0),
    ]), axisMat));

    axesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.5, 0),
      new THREE.Vector3(0, 1.6, 0),
    ]), axisMat));

    axesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -0.4),
      new THREE.Vector3(0, 0, spanZ + 0.9),
    ]), axisMat));

    const coneGeom = new THREE.ConeGeometry(0.04, 0.12, 16);
    const coneX = new THREE.Mesh(coneGeom, new THREE.MeshBasicMaterial({ color: 0x0369a1 }));
    coneX.position.set(1.6, 0, 0);
    coneX.rotation.z = -Math.PI / 2;
    axesGroup.add(coneX);

    const coneY = new THREE.Mesh(coneGeom, new THREE.MeshBasicMaterial({ color: 0xc2410c }));
    coneY.position.set(0, 1.6, 0);
    axesGroup.add(coneY);

    const coneZ = new THREE.Mesh(coneGeom, new THREE.MeshBasicMaterial({ color: 0x3b2923 }));
    coneZ.position.set(0, 0, spanZ + 0.9);
    coneZ.rotation.x = Math.PI / 2;
    axesGroup.add(coneZ);

    const tickMat = new THREE.LineBasicMaterial({ color: 0x6b5145, transparent: true, opacity: 0.65 });
    const addTick = (p1, p2) => {
      axesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), tickMat));
    };

    addTick(new THREE.Vector3(1, -0.06, 0), new THREE.Vector3(1, 0.06, 0));
    addTick(new THREE.Vector3(-1, -0.06, 0), new THREE.Vector3(-1, 0.06, 0));
    addTick(new THREE.Vector3(-0.06, 1, 0), new THREE.Vector3(0.06, 1, 0));
    addTick(new THREE.Vector3(-0.06, -1, 0), new THREE.Vector3(0.06, -1, 0));

    [Math.PI / 2, Math.PI, (3 * Math.PI) / 2, spanZ].forEach((tz) => {
      addTick(new THREE.Vector3(-0.06, 0, tz), new THREE.Vector3(0.06, 0, tz));
      addTick(new THREE.Vector3(0, -0.06, tz), new THREE.Vector3(0, 0.06, tz));
    });

    const createTextSprite = (text, color = '#3B2923', fontSize = 34) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 70;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 35);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.85, 0.23, 1);
      return sprite;
    };

    const labelX = createTextSprite('X (cos θ)', '#0369A1', 34);
    labelX.position.set(1.9, 0, 0);
    axesGroup.add(labelX);

    const labelY = createTextSprite('Y (sin θ)', '#C2410C', 34);
    labelY.position.set(0, 1.85, 0);
    axesGroup.add(labelY);

    const labelZ = createTextSprite('Z (θ)', '#3B2923', 36);
    labelZ.position.set(0, 0, spanZ + 1.15);
    axesGroup.add(labelZ);

    const CIRCLE_SEGS = 128;
    const circleCurvePoints = [];
    for (let i = 0; i <= CIRCLE_SEGS; i++) {
      const phi = (i / CIRCLE_SEGS) * Math.PI * 2;
      circleCurvePoints.push(new THREE.Vector3(Math.cos(phi), Math.sin(phi), 0));
    }
    const circleCurve = new THREE.CatmullRomCurve3(circleCurvePoints, true);
    const circleTubeGeom = new THREE.TubeGeometry(circleCurve, 128, 0.02, 8, true);
    const circleMaterial = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      emissive: 0x0369a1,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.1,
    });
    scene.add(new THREE.Mesh(circleTubeGeom, circleMaterial));

    const discGeom = new THREE.CircleGeometry(1.0, 64);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(discGeom, discMat));

    const GHOST_SAMPLES = 200;
    const cosGhostPoints = [];
    const sinGhostPoints = [];
    for (let i = 0; i <= GHOST_SAMPLES; i++) {
      const t = (i / GHOST_SAMPLES) * spanZ;
      cosGhostPoints.push(new THREE.Vector3(Math.cos(t), 0, t));
      sinGhostPoints.push(new THREE.Vector3(0, Math.sin(t), t));
    }

    const cosGhostGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cosGhostPoints), 160, 0.012, 6, false);
    const cosGhostMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(cosGhostGeom, cosGhostMat));

    const sinGhostGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sinGhostPoints), 160, 0.012, 6, false);
    const sinGhostMat = new THREE.MeshBasicMaterial({
      color: 0xc2410c,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(sinGhostGeom, sinGhostMat));

    const cosProgressiveMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      emissive: 0x0369a1,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.15,
    });
    const cosProgressiveMesh = new THREE.Mesh(new THREE.BufferGeometry(), cosProgressiveMat);
    scene.add(cosProgressiveMesh);

    const sinProgressiveMat = new THREE.MeshStandardMaterial({
      color: 0xc2410c,
      emissive: 0xc2410c,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.15,
    });
    const sinProgressiveMesh = new THREE.Mesh(new THREE.BufferGeometry(), sinProgressiveMat);
    scene.add(sinProgressiveMesh);

    const sphereGeom = new THREE.SphereGeometry(0.075, 24, 24);
    const spherePointMat = new THREE.MeshStandardMaterial({
      color: 0x9a4324,
      emissive: 0x9a4324,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.1,
    });
    const pointCircle = new THREE.Mesh(sphereGeom, spherePointMat);
    scene.add(pointCircle);

    const radiusLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]);
    const radiusLineMat = new THREE.LineBasicMaterial({ color: 0x9a4324, transparent: true, opacity: 0.95 });
    const radiusLine = new THREE.Line(radiusLineGeom, radiusLineMat);
    scene.add(radiusLine);

    const angleArcGeom = new THREE.BufferGeometry();
    const angleArcMat = new THREE.LineBasicMaterial({ color: 0x9a4324, transparent: true, opacity: 0.8 });
    const angleArc = new THREE.Line(angleArcGeom, angleArcMat);
    scene.add(angleArc);

    const markerGeom = new THREE.SphereGeometry(0.065, 20, 20);
    const markerCosMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4,
      roughness: 0.25,
    });
    const markerCos = new THREE.Mesh(markerGeom, markerCosMat);
    scene.add(markerCos);

    const markerSinMat = new THREE.MeshStandardMaterial({
      color: 0xc2410c,
      emissive: 0xc2410c,
      emissiveIntensity: 0.4,
      roughness: 0.25,
    });
    const markerSin = new THREE.Mesh(markerGeom, markerSinMat);
    scene.add(markerSin);

    const projLineCosGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const projLineCosMat = new THREE.LineDashedMaterial({
      color: 0x0369a1,
      dashSize: 0.08,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.85,
    });
    const projLineCos = new THREE.Line(projLineCosGeom, projLineCosMat);
    projLineCos.computeLineDistances();
    scene.add(projLineCos);

    const projLineSinGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const projLineSinMat = new THREE.LineDashedMaterial({
      color: 0xc2410c,
      dashSize: 0.08,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.85,
    });
    const projLineSin = new THREE.Line(projLineSinGeom, projLineSinMat);
    projLineSin.computeLineDistances();
    scene.add(projLineSin);

    const xDropGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const xDropMat = new THREE.LineDashedMaterial({
      color: 0x0369a1,
      dashSize: 0.05,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.65,
    });
    const xDropLine = new THREE.Line(xDropGeom, xDropMat);
    scene.add(xDropLine);

    const yDropGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const yDropMat = new THREE.LineDashedMaterial({
      color: 0xc2410c,
      dashSize: 0.05,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.65,
    });
    const yDropLine = new THREE.Line(yDropGeom, yDropMat);
    scene.add(yDropLine);

    const guideCosZGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const guideCosZMat = new THREE.LineBasicMaterial({ color: 0x0369a1, transparent: true, opacity: 0.45 });
    const guideLineCosZ = new THREE.Line(guideCosZGeom, guideCosZMat);
    scene.add(guideLineCosZ);

    const guideSinZGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const guideSinZMat = new THREE.LineBasicMaterial({ color: 0xc2410c, transparent: true, opacity: 0.45 });
    const guideLineSinZ = new THREE.Line(guideSinZGeom, guideSinZMat);
    scene.add(guideLineSinZ);

    const xBarGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const xBarMat = new THREE.LineBasicMaterial({ color: 0x0369a1 });
    const xBar = new THREE.Line(xBarGeom, xBarMat);
    scene.add(xBar);

    const yBarGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const yBarMat = new THREE.LineBasicMaterial({ color: 0xc2410c });
    const yBar = new THREE.Line(yBarGeom, yBarMat);
    scene.add(yBar);

    dynamicRefs.current = {
      pointCircle,
      radiusLine,
      angleArc,
      xBar,
      yBar,
      xDropLine,
      yDropLine,
      projLineCos,
      projLineSin,
      guideLineCosZ,
      guideLineSinZ,
      markerCos,
      markerSin,
      cosProgressiveMesh,
      sinProgressiveMesh,
    };

    const updateElements = (deg) => {
      const rad = (deg * Math.PI) / 180;
      const cosVal = Math.cos(rad);
      const sinVal = Math.sin(rad);
      const zPos = rad;

      const pCircle = new THREE.Vector3(cosVal, sinVal, 0);
      const pCos = new THREE.Vector3(cosVal, 0, zPos);
      const pSin = new THREE.Vector3(0, sinVal, zPos);
      const pXAxis = new THREE.Vector3(cosVal, 0, 0);
      const pYAxis = new THREE.Vector3(0, sinVal, 0);

      pointCircle.position.copy(pCircle);
      radiusLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), pCircle]);

      const arcPoints = [];
      const arcRadius = 0.32;
      const arcSteps = Math.max(3, Math.floor((deg / 360) * 36));
      for (let i = 0; i <= arcSteps; i++) {
        const phi = (i / arcSteps) * rad;
        arcPoints.push(new THREE.Vector3(Math.cos(phi) * arcRadius, Math.sin(phi) * arcRadius, 0));
      }
      angleArc.geometry.dispose();
      angleArc.geometry = new THREE.BufferGeometry().setFromPoints(arcPoints);

      markerCos.position.copy(pCos);
      markerSin.position.copy(pSin);

      projLineCos.geometry.setFromPoints([pCircle, pCos]);
      projLineCos.computeLineDistances();

      projLineSin.geometry.setFromPoints([pCircle, pSin]);
      projLineSin.computeLineDistances();

      xDropLine.geometry.setFromPoints([pCircle, pXAxis]);
      xDropLine.computeLineDistances();

      yDropLine.geometry.setFromPoints([pCircle, pYAxis]);
      yDropLine.computeLineDistances();

      guideLineCosZ.geometry.setFromPoints([pXAxis, pCos]);
      guideLineSinZ.geometry.setFromPoints([pYAxis, pSin]);

      xBar.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), pXAxis]);
      yBar.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), pYAxis]);

      if (rad > 0.03) {
        const steps = Math.max(6, Math.floor((rad / spanZ) * 140));
        const progressiveCosPts = [];
        const progressiveSinPts = [];

        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * rad;
          progressiveCosPts.push(new THREE.Vector3(Math.cos(t), 0, t));
          progressiveSinPts.push(new THREE.Vector3(0, Math.sin(t), t));
        }

        if (cosProgressiveMesh.geometry) cosProgressiveMesh.geometry.dispose();
        cosProgressiveMesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(progressiveCosPts), steps, 0.024, 8, false);
        cosProgressiveMesh.visible = true;

        if (sinProgressiveMesh.geometry) sinProgressiveMesh.geometry.dispose();
        sinProgressiveMesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(progressiveSinPts), steps, 0.024, 8, false);
        sinProgressiveMesh.visible = true;
      } else {
        cosProgressiveMesh.visible = false;
        sinProgressiveMesh.visible = false;
      }
    };

    let lastRenderedAngle = -1;
    const tick = () => {
      if (cameraTransitionRef.current) {
        const trans = cameraTransitionRef.current;
        camera.position.lerp(trans.targetPos, 0.12);
        controls.target.lerp(trans.targetLook, 0.12);
        if (trans.targetUp) camera.up.lerp(trans.targetUp, 0.12);

        if (
          camera.position.distanceTo(trans.targetPos) < 0.04 &&
          controls.target.distanceTo(trans.targetLook) < 0.04
        ) {
          camera.position.copy(trans.targetPos);
          controls.target.copy(trans.targetLook);
          if (trans.targetUp) camera.up.copy(trans.targetUp);
          cameraTransitionRef.current = null;
        }
      }

      controls.update();

      const currentAngle = targetAngleRef.current;
      if (Math.abs(currentAngle - lastRenderedAngle) > 0.001) {
        updateElements(currentAngle);
        lastRenderedAngle = currentAngle;
      }

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 380;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      circleTubeGeom.dispose();
      circleMaterial.dispose();
      discGeom.dispose();
      discMat.dispose();
      cosGhostGeom.dispose();
      cosGhostMat.dispose();
      sinGhostGeom.dispose();
      sinGhostMat.dispose();
      sphereGeom.dispose();
      spherePointMat.dispose();
      radiusLineGeom.dispose();
      radiusLineMat.dispose();
      angleArcGeom.dispose();
      angleArcMat.dispose();
      markerGeom.dispose();
      markerCosMat.dispose();
      markerSinMat.dispose();
      projLineCosGeom.dispose();
      projLineCosMat.dispose();
      projLineSinGeom.dispose();
      projLineSinMat.dispose();
      xDropGeom.dispose();
      xDropMat.dispose();
      yDropGeom.dispose();
      yDropMat.dispose();
      guideCosZGeom.dispose();
      guideCosZMat.dispose();
      guideSinZGeom.dispose();
      guideSinZMat.dispose();
      xBarGeom.dispose();
      xBarMat.dispose();
      yBarGeom.dispose();
      yBarMat.dispose();
      if (cosProgressiveMesh.geometry) cosProgressiveMesh.geometry.dispose();
      cosProgressiveMat.dispose();
      if (sinProgressiveMesh.geometry) sinProgressiveMesh.geometry.dispose();
      sinProgressiveMat.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className="w-full bg-white border border-[#E4DBD2] rounded-xl p-4 sm:p-5 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-[#3B2923]">
            3D Helical Projection: e^(jθ) = cos(θ) + j·sin(θ)
          </h3>
          <span className="text-xs font-mono text-[#6B5145] hidden sm:inline">
            Drag: Orbit · Scroll: Zoom
          </span>
        </div>
        <button
          type="button"
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F0EA] hover:bg-[#EDE4DA] border border-[#E4DBD2] text-[#3B2923] text-xs font-semibold transition-colors cursor-pointer"
          title="Reset 3D camera"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#9A4324]" />
          <span>Reset View</span>
        </button>
      </div>

      <div
        className="relative w-full h-[340px] sm:h-[400px] lg:h-[430px] rounded-lg bg-[#F5F0EA]/45 border border-[#E4DBD2] select-none overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
