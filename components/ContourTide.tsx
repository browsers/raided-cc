"use client";

/**
 * ContourTide.tsx
 *
 * 1:1 visual port of the React Bits Pro "Contour Tide" background.
 * Self-contained: requires `three` only (no @react-three/fiber).
 *
 * Usage:
 *   import ContourTide from "./ContourTide";
 *
 *   <ContourTide
 *     className="h-screen w-full"
 *     backgroundColor="#000000"
 *     density={1}
 *   >
 *     ...optional overlay content...
 *   </ContourTide>
 *
 * Give the component a height (className or style). Density 1 is ~380k
 * particles; lower it (0.5–0.7) if the device struggles.
 */

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import * as THREE from "three";

export interface ContourTideProps {
  /** [water/body colour, crest/foam colour] */
  colors?: [string, string];
  backgroundColor?: string;
  density?: number;
  particleSize?: number;
  waveHeight?: number;
  choppiness?: number;
  wavelength?: number;
  windAngle?: number;
  horizon?: number;
  fog?: number;
  glow?: number;
  foam?: number;
  speed?: number;
  interactive?: boolean;
  parallax?: number;
  swell?: number;
  swellRadius?: number;
  clickRipples?: boolean;
  seed?: number;
  paused?: boolean;
  dpr?: number;
  /** Fade the bottom edge into fadeColor. Defaults to true. */
  fade?: boolean;
  /** Height of the fade as a percentage of the component. Defaults to 40. */
  fadeHeight?: number;
  /** Color the bottom fades into. Defaults to #000000. */
  fadeColor?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

type Settings = {
  colors: [string, string];
  backgroundColor: string;
  density: number;
  particleSize: number;
  waveHeight: number;
  choppiness: number;
  wavelength: number;
  windAngle: number;
  horizon: number;
  fog: number;
  glow: number;
  foam: number;
  speed: number;
  interactive: boolean;
  parallax: number;
  swell: number;
  swellRadius: number;
  clickRipples: boolean;
  seed: number;
  paused: boolean;
  dpr: number;
};

type Ripple = { x: number; z: number; age: number };

type PointerState = {
  x: number;
  y: number;
  inside: boolean;
  presses: number;
  pressX: number;
  pressY: number;
};

const DEFAULT_COLORS: [string, string] = ["#6E6E80", "#FFFFFF"];

const baseShader = /* glsl */ `
#define WAVES 14
#define MAX_RIPPLES 4

uniform float uTime;
uniform float uNear;
uniform float uFar;
uniform float uSpread;
uniform float uSpreadBase;
uniform vec4 uWave[WAVES];
uniform vec4 uWaveMotion[WAVES];
uniform float uHeight;
uniform vec4 uCursor;
uniform float uCursorRadius;
uniform vec4 uRipple[MAX_RIPPLES];

float gridDepth(float v) {
  float inverse = 1.0 / uFar + (1.0 / uNear - 1.0 / uFar) * pow(clamp(1.0 - v, 0.0, 1.0), 1.8);
  return 1.0 / inverse;
}

vec3 surfacePoint(vec2 ground, out vec3 normal, out float fold, out float swell) {
  vec3 offset = vec3(0.0);
  normal = vec3(0.0, 1.0, 0.0);
  fold = 1.0;
  float calm = mix(0.3, 1.0, smoothstep(uNear * 0.9, uNear * 4.0, -ground.y));
  for (int i = 0; i < WAVES; i++) {
    vec4 wave = uWave[i];
    vec4 motion = uWaveMotion[i];
    float phase = wave.z * dot(wave.xy, ground) - motion.x * uTime + motion.y;
    float s = sin(phase);
    float c = cos(phase);
    float amplitude = wave.w * uHeight * calm;
    float steep = motion.z;
    offset.x += steep * amplitude * wave.x * c;
    offset.z += steep * amplitude * wave.y * c;
    offset.y += amplitude * s;
    float ka = wave.z * amplitude;
    normal.x -= wave.x * ka * c;
    normal.z -= wave.y * ka * c;
    normal.y -= steep * ka * s;
    fold -= steep * ka * s;
  }

  vec2 toCursor = ground - uCursor.xy;
  float radius2 = max(uCursorRadius * uCursorRadius, 1e-4);
  swell = uCursor.z * exp(-dot(toCursor, toCursor) / radius2);
  offset.y += swell;
  normal.x += swell * 2.0 * toCursor.x / radius2;
  normal.z += swell * 2.0 * toCursor.y / radius2;

  for (int k = 0; k < MAX_RIPPLES; k++) {
    vec4 ripple = uRipple[k];
    if (ripple.w <= 0.001) continue;
    vec2 away = ground - ripple.xy;
    float r = max(length(away), 1e-4);
    float band = r - ripple.z;
    float envelope = exp(-band * band * 3.0) * ripple.w * 0.26;
    offset.y += sin(band * 9.0) * envelope;
    float slope = (9.0 * cos(band * 9.0) - 6.0 * band * sin(band * 9.0)) * envelope;
    normal.x -= slope * away.x / r;
    normal.z -= slope * away.y / r;
  }

  return vec3(ground.x + offset.x, offset.y, ground.y + offset.z);
}
`;

const depthVertex = /* glsl */ `
${baseShader}

attribute vec2 aGrid;

void main() {
  float depth = gridDepth(aGrid.y);
  float halfWidth = uSpreadBase + depth * uSpread;
  vec2 ground = vec2(aGrid.x * halfWidth * 1.03, -depth);
  vec3 normal;
  float fold;
  float swell;
  vec3 world = surfacePoint(ground, normal, fold, swell);
  world.y -= 0.035 + depth * 0.004;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const emptyFragment = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.0);
}
`;

const pointsVertex = /* glsl */ `
${baseShader}

attribute vec2 aGrid;
attribute vec2 aJitter;

uniform float uRows;
uniform float uColumns;
uniform vec3 uSun;
uniform float uFogDistance;
uniform float uFoam;
uniform float uSize;
uniform float uFocal;
uniform float uPixelRatio;
uniform float uGlow;

varying float vBright;
varying float vTone;

void main() {
  float depth = gridDepth(aGrid.y + aJitter.y / uRows);
  float halfWidth = uSpreadBase + depth * uSpread;
  vec2 ground = vec2((aGrid.x + aJitter.x / uColumns) * halfWidth, -depth);
  float side = 1.0 - smoothstep(0.9, 1.0, abs(aGrid.x));
  vec3 normal;
  float fold;
  float swell;
  vec3 world = surfacePoint(ground, normal, fold, swell);
  vec3 offset = vec3(world.x - ground.x, world.y, world.z - ground.y);
  vec4 view = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * view;

  vec3 n = normalize(normal);
  vec3 toEye = normalize(cameraPosition - world);
  float lit = max(dot(n, uSun), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, toEye), 0.0), 5.0);
  float glint = pow(max(dot(reflect(-uSun, n), toEye), 0.0), 40.0) * (0.04 + 3.6 * fresnel);
  float crest = smoothstep(0.25, 1.0, offset.y / max(uHeight * 0.5, 0.01));
  float froth = smoothstep(0.7, 0.2, fold) * uFoam;
  float near = smoothstep(uNear * 0.95, uNear * 1.2, depth) * side;
  float distant = smoothstep(uNear * 1.1, uNear * 5.0, depth);
  float far = exp(-depth / max(uFogDistance, 0.5)) * smoothstep(uFar, uFar * 0.9, depth);

  float edgeOn = clamp(abs(dot(n, toEye)) / 0.35, 0.06, 1.0);
  float pileUp = mix(edgeOn, 1.0, smoothstep(uNear * 3.0, uNear * 14.0, depth));
  float brightness = (0.24 + 0.05 * lit + 0.9 * fresnel * distant + (glint * 2.6 + 2.4 * crest * crest * crest + froth * 2.6) * mix(0.3, 1.0, distant)) * pileUp * near * far;
  vTone = clamp(glint * 0.9 + crest * 0.6 + froth, 0.0, 1.0);

  float pixels = uSize * uFocal / max(-view.z, 0.05) * (1.0 + crest * 0.35) * uPixelRatio;
  float coverage = min(pixels, 1.0);
  vBright = brightness * coverage;
  gl_PointSize = clamp(pixels, 1.0, 6.0 * uPixelRatio) * (1.0 + uGlow * 1.6);
}
`;

const pointsFragment = /* glsl */ `
precision highp float;

uniform vec3 uTrough;
uniform vec3 uCrest;
uniform float uGlow;
uniform float uInk;
uniform float uIntensity;

varying float vBright;
varying float vTone;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float edge = 1.0 / (1.0 + uGlow * 1.6);
  float core = 1.0 - smoothstep(edge * 0.45, edge, r);
  float halo = exp(-r * r * 7.0) * uGlow * 0.28;
  float amount = (core + halo) * vBright * uIntensity;
  if (amount < 0.002) discard;
  vec3 color = mix(uTrough, uCrest, vTone);
  if (uInk > 0.5) {
    float alpha = clamp(amount * 1.6, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    float alpha = clamp(amount, 0.0, 1.0);
    gl_FragColor = vec4(color * amount, alpha);
  }
}
`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const rad = (degrees: number) => (degrees * Math.PI) / 180;

const isTransparent = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "transparent") return true;
  if (/^#[0-9a-f]{8}$/.test(normalized)) return normalized.endsWith("00");
  if (/^#[0-9a-f]{4}$/.test(normalized)) return normalized.endsWith("0");
  return (
    normalized.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/) !== null
  );
};

const seeded = (seed: number) => {
  let state = (0x9e3779b9 ^ Math.floor(9973 * seed)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
};

export default function ContourTide({
  colors = DEFAULT_COLORS,
  backgroundColor = "#0a0a0a",
  density = 1,
  particleSize = 1,
  waveHeight = 1,
  choppiness = 0.8,
  wavelength = 1,
  windAngle = 0,
  horizon = 0.1,
  fog = 1,
  glow = 0.35,
  foam = 1,
  speed = 1,
  interactive = true,
  parallax = 1,
  swell = 1,
  swellRadius = 0.9,
  clickRipples = true,
  seed = 0,
  paused = false,
  dpr = 1.5,
  fade = true,
  fadeHeight = 40,
  fadeColor = "#000000",
  className,
  style,
  children,
}: ContourTideProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);

  const settings: Settings = {
    colors,
    backgroundColor,
    density,
    particleSize,
    waveHeight,
    choppiness,
    wavelength,
    windAngle,
    horizon,
    fog,
    glow,
    foam,
    speed,
    interactive,
    parallax,
    swell,
    swellRadius,
    clickRipples,
    seed,
    paused,
    dpr,
  };

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Rebuild the scene only when structural settings change.
  const structuralKey = JSON.stringify({
    colors,
    backgroundColor,
    density,
    seed,
    windAngle,
    wavelength,
    choppiness,
    dpr,
  });

  useEffect(() => {
    const root = rootRef.current;
    const host = canvasHostRef.current;
    if (!root || !host) return;

    const settings = settingsRef.current;
    const transparent = isTransparent(settings.backgroundColor);
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.dpr));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.pointerEvents = "none";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
    camera.position.set(0, 1.35, 0);
    camera.rotation.order = "YXZ";

    const density = clamp(settings.density, 0.3, 2);
    const columns = Math.round(1000 * density);
    const rows = Math.round(380 * density);

    const uniforms = {
      uTime: { value: 0 },
      uNear: { value: 1.5 },
      uFar: { value: 36 },
      uSpread: { value: 0.85 },
      uSpreadBase: { value: 0.85 },
      uRows: { value: rows },
      uColumns: { value: columns },
      uWave: {
        value: Array.from({ length: 14 }, () => new THREE.Vector4()),
      },
      uWaveMotion: {
        value: Array.from({ length: 14 }, () => new THREE.Vector4()),
      },
      uHeight: { value: 1 },
      uSun: { value: new THREE.Vector3(0.06, 0.07, -1).normalize() },
      uFogDistance: { value: 22 },
      uFoam: { value: 1 },
      uSize: { value: 0.006 },
      uFocal: { value: 900 },
      uPixelRatio: { value: 1 },
      uGlow: { value: 1 },
      uCursor: { value: new THREE.Vector4(0, -8, 0, 0) },
      uCursorRadius: { value: 1.2 },
      uRipple: {
        value: Array.from({ length: 4 }, () => new THREE.Vector4()),
      },
      uTrough: { value: new THREE.Vector3() },
      uCrest: { value: new THREE.Vector3() },
      uInk: { value: 0 },
      uIntensity: { value: 1 },
    };

    const scratchColor = new THREE.Color();
    const setUniformColor = (
      target: THREE.Vector3,
      value: string | undefined,
      fallback: string,
    ) => {
      const raw = (value ?? fallback).trim();
      try {
        scratchColor.set(
          /^#[0-9a-f]{8}$/i.test(raw) ? raw.slice(0, 7) : raw,
        );
      } catch {
        scratchColor.set(fallback);
      }
      const rgb = { r: 0, g: 0, b: 0 };
      scratchColor.getRGB(rgb, THREE.SRGBColorSpace);
      target.set(rgb.r, rgb.g, rgb.b);
    };

    setUniformColor(uniforms.uTrough.value, settings.colors[0], DEFAULT_COLORS[0]);
    setUniformColor(uniforms.uCrest.value, settings.colors[1], DEFAULT_COLORS[1]);

    const backgroundColor = new THREE.Color();
    try {
      backgroundColor.set(transparent ? "#000000" : settings.backgroundColor);
    } catch {
      backgroundColor.set("#000000");
    }
    const luminance =
      0.2126 * backgroundColor.r +
      0.7152 * backgroundColor.g +
      0.0722 * backgroundColor.b;
    const ink = !transparent && luminance > 0.35;
    uniforms.uInk.value = ink ? 1 : 0;

    const buildWaves = () => {
      const random = seeded(settings.seed + 1.7);
      const wind = rad(settings.windAngle);
      const wavelength = clamp(settings.wavelength, 0.2, 5);
      const longWave = 11 * wavelength;
      const shortWave = 0.4 * wavelength;
      const choppiness = clamp(settings.choppiness, 0, 1.5);
      let total = 0;
      const amplitudes: number[] = [];

      for (let index = 0; index < 14; index += 1) {
        const step = index / 13;
        const length =
          longWave *
          Math.pow(shortWave / longWave, step) *
          (0.85 + 0.3 * random());
        const angle =
          wind + (random() - 0.5) * rad(150) * (0.45 + 0.55 * step);
        const frequency = (2 * Math.PI) / length;
        const amplitude =
          0.012 * Math.pow(length, 1.2) * (0.7 + 0.6 * random());

        amplitudes.push(amplitude);
        total += amplitude;
        uniforms.uWave.value[index].set(
          Math.sin(angle),
          Math.cos(angle),
          frequency,
          amplitude,
        );
        uniforms.uWaveMotion.value[index].set(
          0.55 * Math.sqrt(9.8 * frequency),
          random() * Math.PI * 2,
          0,
          0,
        );
      }

      for (let index = 0; index < 14; index += 1) {
        const wave = uniforms.uWave.value[index];
        wave.w = 0.8 * (amplitudes[index] / Math.max(total, 1e-5));
        uniforms.uWaveMotion.value[index].z = Math.min(
          (0.9 * choppiness) / Math.max(wave.z * wave.w * 14, 1e-4),
          4,
        );
      }
    };

    buildWaves();

    const createPointsGeometry = (
      columnCount: number,
      rowCount: number,
      seed: number,
    ) => {
      const count = columnCount * rowCount;
      const positions = new Float32Array(count * 3);
      const grid = new Float32Array(count * 2);
      const jitter = new Float32Array(count * 2);
      const random = seeded(seed + 0.5);

      for (let row = 0; row < rowCount; row += 1) {
        for (let column = 0; column < columnCount; column += 1) {
          const index = row * columnCount + column;
          grid[index * 2] = (column / (columnCount - 1)) * 2 - 1;
          grid[index * 2 + 1] = 1 - row / (rowCount - 1);
          jitter[index * 2] = (random() - 0.5) * 0.7;
          jitter[index * 2 + 1] = (random() - 0.5) * 0.7;
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("aGrid", new THREE.BufferAttribute(grid, 2));
      geometry.setAttribute("aJitter", new THREE.BufferAttribute(jitter, 2));
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      return geometry;
    };

    const createDepthGeometry = () => {
      const columnCount = 200;
      const rowCount = 150;
      const count = columnCount * rowCount;
      const positions = new Float32Array(count * 3);
      const grid = new Float32Array(count * 2);

      for (let row = 0; row < rowCount; row += 1) {
        for (let column = 0; column < columnCount; column += 1) {
          const index = row * columnCount + column;
          grid[index * 2] = (column / (columnCount - 1)) * 2 - 1;
          grid[index * 2 + 1] = row / (rowCount - 1);
        }
      }

      const indices: number[] = [];
      for (let row = 0; row < rowCount - 1; row += 1) {
        for (let column = 0; column < columnCount - 1; column += 1) {
          const a = row * columnCount + column;
          const b = a + 1;
          const c = a + columnCount;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("aGrid", new THREE.BufferAttribute(grid, 2));
      geometry.setIndex(indices);
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      return geometry;
    };

    const depthGeometry = createDepthGeometry();
    const pointsGeometry = createPointsGeometry(columns, rows, settings.seed);

    const depthMaterial = new THREE.ShaderMaterial({
      vertexShader: depthVertex,
      fragmentShader: emptyFragment,
      uniforms,
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
    });

    const pointsMaterial = new THREE.ShaderMaterial({
      vertexShader: pointsVertex,
      fragmentShader: pointsFragment,
      uniforms,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    pointsMaterial.blending = THREE.CustomBlending;
    pointsMaterial.blendEquation = THREE.AddEquation;
    pointsMaterial.blendSrc = THREE.OneFactor;
    pointsMaterial.blendDst = ink
      ? THREE.OneMinusSrcAlphaFactor
      : THREE.OneFactor;
    pointsMaterial.blendSrcAlpha = THREE.OneFactor;
    pointsMaterial.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    pointsMaterial.needsUpdate = true;

    const depthMesh = new THREE.Mesh(depthGeometry, depthMaterial);
    depthMesh.frustumCulled = false;
    depthMesh.renderOrder = 0;

    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    points.frustumCulled = false;
    points.renderOrder = 1;

    scene.add(depthMesh, points);

    const state = {
      time: 30,
      lookX: 0,
      lookY: 0,
      cursorX: 0,
      cursorZ: -8,
      cursorLift: 0,
      seeded: false,
      presses: 0,
      ripples: Array.from({ length: 4 }, () => ({
        x: 0,
        z: 0,
        age: 99,
      })) as Ripple[],
      next: 0,
    };

    const pointer: PointerState = {
      x: 0.5,
      y: 0.5,
      inside: false,
      presses: 0,
      pressX: 0.5,
      pressY: 0.5,
    };

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let reduced = reducedMotion.matches;

    const updatePointer = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      pointer.y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
      pointer.inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
    };

    const onPointerMove = (event: PointerEvent) => updatePointer(event);
    const onPointerDown = (event: PointerEvent) => {
      if (!settingsRef.current.clickRipples) return;
      updatePointer(event);
      pointer.pressX = pointer.x;
      pointer.pressY = pointer.y;
      pointer.presses += 1;
    };
    const onWindowBlur = () => {
      pointer.inside = false;
    };
    const onReducedMotionChange = () => {
      reduced = reducedMotion.matches;
    };

    // Listen on window so the hover/swell still works when the background is
    // layered behind content or has pointer-events: none.
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("blur", onWindowBlur);
    reducedMotion.addEventListener("change", onReducedMotionChange);

    const resize = () => {
      const width = root.clientWidth || window.innerWidth;
      const height = root.clientHeight || window.innerHeight;
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, settings.dpr),
      );
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();

    const update = (delta: number) => {
      const current = settingsRef.current;
      const width = root.clientWidth || window.innerWidth;
      const height = root.clientHeight || window.innerHeight;
      const moving = !current.paused && !reduced && current.speed > 0;

      if (moving) {
        state.time += delta * clamp(current.speed, 0, 4);
      }

      const aspect = width / Math.max(height, 1);
      const tanHalfFov = Math.tan(rad(50) / 2);
      const horizonAngle = Math.atan(
        (1 - 2 * clamp(current.horizon, 0.02, 0.45)) * tanHalfFov,
      );
      const isInteractive =
        current.interactive && !reduced && pointer.inside;
      const lookTargetX = isInteractive ? (pointer.x - 0.5) * 2 : 0;
      const lookTargetY = isInteractive ? (pointer.y - 0.5) * 2 : 0;
      const lookEase = 1 - Math.exp(-(2.2 * delta));

      state.lookX += (lookTargetX - state.lookX) * lookEase;
      state.lookY += (lookTargetY - state.lookY) * lookEase;

      const parallax = clamp(current.parallax, 0, 3);
      camera.fov = 50;
      camera.near = 0.05;
      camera.far = 200;
      camera.aspect = aspect;
      camera.position.set(
        0.12 * state.lookX * parallax,
        1.35 + 0.04 * Math.sin(0.35 * state.time),
        0,
      );
      camera.rotation.set(
        -horizonAngle + 0.025 * state.lookY * parallax,
        -(0.045 * state.lookX) * parallax,
        0.006 * Math.sin(0.27 * state.time),
        "YXZ",
      );
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      let liftTarget = 0;
      if (isInteractive) {
        pointerNdc.set(2 * pointer.x - 1, 2 * pointer.y - 1);
        raycaster.setFromCamera(pointerNdc, camera);
        const hit = raycaster.ray.intersectPlane(groundPlane, hitPoint);
        if (hit && hit.z < -0.5 && hit.z > -21.6) {
          if (!state.seeded) {
            state.cursorX = hit.x;
            state.cursorZ = hit.z;
            state.seeded = true;
          }
          const cursorEase = 1 - Math.exp(-(5 * delta));
          state.cursorX += (hit.x - state.cursorX) * cursorEase;
          state.cursorZ += (hit.z - state.cursorZ) * cursorEase;
          liftTarget = 1;
        }
      }

      state.cursorLift +=
        (liftTarget - state.cursorLift) *
        (1 - Math.exp(-delta * (liftTarget > state.cursorLift ? 3 : 1.6)));
      if (state.cursorLift < 0.002 && !liftTarget) state.seeded = false;

      if (pointer.presses !== state.presses) {
        const presses = Math.min(pointer.presses - state.presses, 4);
        state.presses = pointer.presses;
        if (current.clickRipples && !reduced) {
          pointerNdc.set(2 * pointer.pressX - 1, 2 * pointer.pressY - 1);
          raycaster.setFromCamera(pointerNdc, camera);
          const hit = raycaster.ray.intersectPlane(groundPlane, hitPoint);
          if (hit && hit.z < -0.5) {
            for (let index = 0; index < presses; index += 1) {
              const ripple = state.ripples[state.next];
              ripple.x = hit.x;
              ripple.z = hit.z;
              ripple.age = 0;
              state.next = (state.next + 1) % 4;
            }
          }
        }
      }

      let hasRipple = false;
      for (let index = 0; index < 4; index += 1) {
        const ripple = state.ripples[index];
        if (ripple.age < 6) ripple.age += delta;
        const amplitude =
          ripple.age < 6 ? Math.exp(-(0.75 * ripple.age)) : 0;
        if (amplitude > 0.002) hasRipple = true;
        uniforms.uRipple.value[index].set(
          ripple.x,
          ripple.z,
          2.2 * ripple.age,
          amplitude,
        );
      }

      const near =
        (1.35 /
          Math.tan(
            horizonAngle + rad(50) / 2 + 0.025 * parallax + 0.03,
          )) *
        0.8;
      const pixelRatio = renderer.getPixelRatio();

      uniforms.uTime.value = state.time;
      uniforms.uNear.value = near;
      uniforms.uFar.value = 36;

      const spread = aspect * tanHalfFov * 1.2;
      uniforms.uSpread.value =
        Math.cos(horizonAngle) * spread + Math.tan(0.06 * parallax);
      uniforms.uSpreadBase.value =
        1.35 * Math.sin(horizonAngle) * spread + 0.14 * parallax + 0.35;
      uniforms.uRows.value = rows;
      uniforms.uColumns.value = columns;
      uniforms.uHeight.value = clamp(current.waveHeight, 0, 3);
      uniforms.uFogDistance.value = 140 / clamp(current.fog, 0.1, 4);
      uniforms.uFoam.value = clamp(current.foam, 0, 3);
      uniforms.uSize.value =
        0.0028 * clamp(current.particleSize, 0.2, 4);
      uniforms.uFocal.value = height / 2 / tanHalfFov;
      uniforms.uPixelRatio.value = pixelRatio;
      uniforms.uGlow.value = clamp(current.glow, 0, 2);
      uniforms.uCursor.value.set(
        state.cursorX,
        state.cursorZ,
        state.cursorLift * clamp(current.swell, 0, 3) * 0.14,
        0,
      );
      uniforms.uCursorRadius.value = clamp(current.swellRadius, 0.1, 5);

      return hasRipple;
    };

    let lastFrame = performance.now();
    let frameHandle = 0;
    const frame = (now: number) => {
      const delta = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.05);
      lastFrame = now;
      update(delta);
      renderer.render(scene, camera);
      frameHandle = requestAnimationFrame(frame);
    };
    frameHandle = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameHandle);
      resizeObserver.disconnect();
      reducedMotion.removeEventListener("change", onReducedMotionChange);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("blur", onWindowBlur);
      pointsGeometry.dispose();
      depthGeometry.dispose();
      pointsMaterial.dispose();
      depthMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [structuralKey]);

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        isolation: "isolate",
        backgroundColor: isTransparent(backgroundColor)
          ? "transparent"
          : backgroundColor,
        ...style,
      }}
    >
      <div
        ref={canvasHostRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {fade ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: `${clamp(fadeHeight, 0, 100)}%`,
            zIndex: 0,
            pointerEvents: "none",
            background: `linear-gradient(to bottom, transparent 0%, ${fadeColor} 100%)`,
          }}
        />
      ) : null}
      {children ? (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
