"use client";

import { useEffect, useRef } from "react";

/**
 * Soft window light falling on a dark wall, with the shadow of a leafy branch
 * swaying across it. One full-screen fragment shader draws the light, the
 * window frame, the branch, a second out-of-focus layer of leaves and the dust
 * floating in the beam. Everything is soft by design, but the picture itself
 * stays clean: no film grain, and resolution never ratchets down for good
 * (see the quality loop in createWindowLight).
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const LEAVES = 14;
const STEM_SEGMENTS = 14;
const FAR_LEAVES = 6;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uGust;
uniform vec3 uLight;
uniform vec3 uDark;
uniform float uSway;
uniform float uVel;
uniform vec2 uPar;
// Branch points and per-leaf (base.xy, tangent angle, cursor push) are worked
// out once per frame on the CPU. Doing it per pixel made the shader huge, which
// froze the page while it compiled and made every frame slow.
uniform vec2 uStem[${STEM_SEGMENTS + 1}];
uniform vec4 uLeaf[${LEAVES}];

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

// smoothstep that is also well defined when the edges are reversed
float sstep(float a, float b, float x) {
  float t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Shadow of one leaf. Egg shaped with a pointed tip, a short stalk at the base
// and a slight curl. 'soft' is the blur of the edge.
float leaf(vec2 p, vec2 base, float ang, float L, float soft, float curl) {
  vec2 q = rot(p - base, -ang);
  float reach = L + soft * 2.0;
  if (dot(q, q) > reach * reach) return 0.0;
  q.y -= curl * q.x * q.x;
  float pet = L * 0.14;
  float t = clamp((q.x - pet) / (L - pet), 0.0, 1.0);
  float w = max(0.0026, L * 0.26 * 2.62 * pow(t, 0.55) * pow(1.0 - t, 0.9));
  float d = abs(q.y) - w;
  return sstep(soft, -soft, d) * sstep(-soft, soft, q.x) * sstep(L, L - soft * 2.0, q.x);
}

// Specks of dust drifting in the beam. Each grid cell may hold one speck that
// wobbles around its spot while the whole field creeps upward.
float motes(vec2 p, float time, float cell, float rad, float seed) {
  vec2 g = (p - vec2(0.004, 0.010) * time) / cell;
  vec2 id = floor(g);
  float acc = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = id + vec2(float(i), float(j));
      float h = hash2(c + seed);
      if (h < 0.38) {
        float h2 = hash2(c * 1.37 + seed + 5.1);
        float h3 = hash2(c * 2.11 + seed + 9.7);
        vec2 pos = c + 0.2 + 0.6 * vec2(h2, h3)
                 + 0.18 * vec2(sin(time * (0.2 + h2 * 0.3) + h3 * 40.0), cos(time * (0.17 + h3 * 0.3) + h2 * 40.0));
        float d = length(g - pos) * cell;
        float tw = 0.5 + 0.5 * sin(time * (0.5 + h) + h2 * 60.0);
        acc += sstep(rad, rad * 0.15, d) * (0.25 + 0.75 * tw * tw) * (0.4 + 0.6 * h3);
      }
    }
  }
  return acc;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float time = uTime;

  // ---- Window light (tilted, slightly sheared) ----
  // The light sits on the wall, behind the branch, so it shifts a little
  // against the cursor. That is what gives the scene depth.
  vec2 pl = p + uPar;
  vec2 w = rot(pl - vec2(0.12, -0.04), 0.50);
  w.x += w.y * 0.10;
  float box = sdRoundBox(w, vec2(0.64, 0.34), 0.07);
  float direct = sstep(0.09, -0.04, box);
  // Faint glow past the edges, tight and wide. It is scattered light, not the
  // beam itself, so the window bars and the leaves never cast shadows on it.
  float outside = max(box, 0.0);
  float ambient = 0.10 * exp(-outside * 4.0) + 0.045 * exp(-outside * 1.5);
  // brighter toward the far side, dimmer toward the middle so text stays readable
  float lean = mix(0.42, 1.0, sstep(-0.25, 0.55, p.x));
  // slow cloud shadows drifting over the patch, and a very slight breathing
  float cloud = vnoise(pl * 1.3 + vec2(time * 0.03, -time * 0.02));
  lean *= (1.0 - 0.26 * sstep(0.45, 0.80, cloud)) * (0.95 + 0.05 * sin(time * 0.23));
  direct *= lean;
  ambient *= lean;

  // ---- Window frame shadow: a cross ----
  float bar1 = sstep(0.024, 0.008, abs(w.x - 0.06));
  float bar2 = sstep(0.022, 0.007, abs(w.y + 0.01));
  float frame = max(bar1, bar2);

  // ---- Branch ----
  float shade = 0.0;
  float stemD = 1e3;
  float stemT = 0.0;
  vec2 prev = uStem[0];
  for (int i = 1; i <= ${STEM_SEGMENTS}; i++) {
    vec2 cur = uStem[i];
    vec2 pa = p - prev;
    vec2 ba = cur - prev;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float dd = length(pa - ba * h);
    if (dd < stemD) {
      stemD = dd;
      stemT = (float(i - 1) + h) / ${STEM_SEGMENTS}.0;
    }
    prev = cur;
  }
  // The stem thins out and blurs toward the tip, like a branch reaching away
  // from the wall: shadows get softer the further the object is from the wall.
  float sw = 0.0052 * (1.0 - 0.6 * stemT);
  float ss = 0.0016 + 0.010 * stemT;
  shade = max(shade, sstep(sw + ss, sw - ss, stemD) * 0.62);

  for (int i = 0; i < ${LEAVES}; i++) {
    float fi = float(i);
    float t = 0.12 + 0.86 * (fi / ${(LEAVES - 1).toFixed(1)});
    vec4 lf = uLeaf[i];
    vec2 base = lf.xy;
    float tang = lf.z;
    float near = lf.w;
    bool tip = (i == ${LEAVES - 1});
    float side = tip ? 0.0 : (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
    float r = hash(fi + 3.0);
    float flutter = sin(time * (0.8 + r * 0.5) + fi * 1.7) * 0.10 * uSway * uGust
                  + sin(time * 3.1 + fi * 2.3) * 0.05 * uSway * max(uGust - 1.0, 0.0);
    float ang = tang + side * (0.95 + 0.25 * r) + flutter
              + side * near * 0.6 + near * uVel * sin(time * 13.0 + fi * 2.1) * 0.35;
    float L = (0.14 + 0.09 * hash(fi + 11.0)) * (1.1 - 0.25 * t) * (tip ? 1.3 : 1.0);
    float soft = 0.004 + 0.005 * hash(fi + 21.0) + 0.020 * t * t;
    float strength = 0.44 + 0.30 * hash(fi + 31.0) - 0.10 * t;
    float curl = (hash(fi + 41.0) - 0.5) * 0.9;
    shade = max(shade, leaf(p, base, ang, L, soft, curl) * strength);
  }

  // ---- Far layer: big, soft, pale leaves hanging in from the top edge ----
  for (int j = 0; j < ${FAR_LEAVES}; j++) {
    float fj = float(j);
    float hj = hash(fj + 61.0);
    vec2 base = vec2(-0.82 + 0.30 * fj + 0.12 * hj, 0.53 + 0.03 * hash(fj + 71.0));
    float ang = -1.5708 + (hj - 0.5) * 1.0
              + 0.07 * uSway * uGust * sin(time * (0.45 + hj * 0.3) + fj * 1.9);
    float L = 0.20 + 0.12 * hash(fj + 81.0);
    float soft = 0.030 + 0.020 * hj;
    shade = max(shade, leaf(p, base, ang, L, soft, (hj - 0.5) * 0.6) * (0.34 + 0.14 * hash(fj + 91.0)));
  }

  float k = direct * (1.0 - 0.50 * frame) * (1.0 - shade * 0.85) + ambient;

  // ---- Dust in the beam: a sharp layer and a soft out-of-focus layer ----
  float glow = clamp(direct * 1.4, 0.0, 1.0);
  if (glow > 0.05) {
    float m = motes(pl, time, 0.15, 0.0048, 0.0) * 1.0 + motes(pl, time, 0.30, 0.013, 17.0) * 0.6;
    k += m * glow * 0.75;
  }

  vec3 col = mix(uDark, uLight, clamp(k, 0.0, 1.0));
  // Invisible static dither, just to stop banding in the dark gradient
  col += (hash2(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Wind. A slow base breeze plus a stronger gust every 11 seconds or so.
function gustAt(time: number) {
  const base = 0.65 + 0.35 * Math.sin(time * 0.33);
  const ph = (time % 11) / 11;
  return base + 0.9 * Math.exp(-Math.pow((ph - 0.5) * 7, 2));
}

// Branch maths, run once per frame on the CPU instead of once per pixel.
// A quadratic bezier with a travelling sway, pushed away from the cursor.
function stemAt(
  t: number,
  time: number,
  sway: number,
  gust: number,
  mx: number,
  my: number,
  push: number,
  out: number[],
) {
  const u = 1 - t;
  let x = u * u * 0.2 + 2 * u * t * 0.62 + t * t * 0.5;
  let y = u * u * -0.52 + 2 * u * t * -0.08 + t * t * 0.55;
  x += sway * gust * 0.035 * t * Math.sin(time * 0.9 + t * 2.6);
  y += sway * gust * 0.012 * t * Math.sin(time * 0.7 + t * 3.1);
  const dx = x - mx;
  const dy = y - my;
  const f = Math.exp(-(dx * dx + dy * dy) / 0.07) * push;
  const k = (0.1 * f * t) / (Math.hypot(dx, dy) + 0.06);
  out[0] = x + dx * k;
  out[1] = y + dy * k;
}

function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export type WindowLightProps = {
  lightColor?: string;
  darkColor?: string;
  speed?: number; // 1 = normal
  sway?: number; // how far the leaves move; 0 = still
  scale?: number; // render resolution, 0.3 - 1. 1 is native (capped at 1.5x device pixels)
};

type Settings = Required<WindowLightProps>;

// Quality ladder, best first. The loop walks down it when frames come out
// slowly and back UP it once things have been fine for a while, so a single
// hitch (shader compile, tab switch, a busy moment while the page loads) can
// never leave the picture blurry for good. The lowest rung still renders at
// half resolution; below that it drops frame rate instead of getting blurrier.
const LADDER: { fps: number; q: number }[] = [
  { fps: 30, q: 1 },
  { fps: 30, q: 0.8 },
  { fps: 30, q: 0.65 },
  { fps: 30, q: 0.5 },
  { fps: 20, q: 0.5 },
];

// Pixel budget so huge or high-DPI screens don't start out too heavy
const MAX_PIXELS = 2.4e6;

export function createWindowLight(canvas: HTMLCanvasElement, o: Settings, startTime = 20): (() => void) | undefined {
  const { lightColor, darkColor, speed, sway, scale } = o;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    // Don't ask for COMPILE_STATUS here: that waits for the compile to finish.
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  // Linking a shader can take seconds on some GPUs/drivers. Where the browser
  // supports it, poll instead of asking for the result, so the page keeps
  // running (and React keeps hydrating) while the shader builds.
  const parallel = gl.getExtension("KHR_parallel_shader_compile") as { COMPLETION_STATUS_KHR: number } | null;
  let disposed = false;
  let waitRaf = 0;
  let stop: (() => void) | null = null;

  const begin = () => {
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uGust = gl.getUniformLocation(prog, "uGust");
    const uVel = gl.getUniformLocation(prog, "uVel");
    const uPar = gl.getUniformLocation(prog, "uPar");
    const uStem = gl.getUniformLocation(prog, "uStem");
    const uLeaf = gl.getUniformLocation(prog, "uLeaf");
    gl.uniform3fv(gl.getUniformLocation(prog, "uLight"), hex(lightColor));
    gl.uniform3fv(gl.getUniformLocation(prog, "uDark"), hex(darkColor));
    gl.uniform1f(gl.getUniformLocation(prog, "uSway"), sway);
    const stemData = new Float32Array((STEM_SEGMENTS + 1) * 2);
    const leafData = new Float32Array(LEAVES * 4);
    const pt = [0, 0];
    const ahead = [0, 0];

    // Software renderers (no real GPU) start at the bottom of the ladder.
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    let rung = /swiftshader|llvmpipe|software|basic render/i.test(renderer) ? LADDER.length - 1 : 0;
    const quality = () => Math.min(scale, 1) * LADDER[rung].q;

    const resize = () => {
      const cw = Math.max(1, canvas.clientWidth);
      const ch = Math.max(1, canvas.clientHeight);
      let d = Math.min(window.devicePixelRatio || 1, 1.5) * quality();
      const area = cw * ch * d * d;
      if (area > MAX_PIXELS) d *= Math.sqrt(MAX_PIXELS / area);
      const w = Math.max(2, Math.floor(cw * d));
      const h = Math.max(2, Math.floor(ch * d));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    };
    resize();

    // Cursor, in the same units as the shader (x scaled by aspect, y up)
    const m = { x: 9, y: 9, tx: 9, ty: 9, push: 0, vel: 0, over: false, px: 0, py: 0 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) {
        m.over = false;
        return;
      }
      const aspect = r.width / r.height;
      m.tx = ((e.clientX - r.left) / r.width - 0.5) * aspect;
      m.ty = 0.5 - (e.clientY - r.top) / r.height;
      if (!m.over) {
        m.x = m.tx;
        m.y = m.ty;
      }
      m.over = true;
    };
    const onLeave = () => {
      m.over = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = startTime;

    let lastDraw = 0;
    const gaps: number[] = [];
    let goodRuns = 0;
    let needGood = 4;
    let warmUntil = performance.now() + 1500; // first frames pay for shader warm-up
    let steppedUp = false;

    const render = () => {
      // Scrolled fully out of view: nothing to draw
      if (window.scrollY < canvas.clientHeight) {
        const gust = gustAt(t);
        gl.uniform1f(uTime, t);
        gl.uniform1f(uGust, gust);
        gl.uniform1f(uVel, m.vel);
        gl.uniform2f(uPar, m.px, m.py);

        for (let i = 0; i <= STEM_SEGMENTS; i++) {
          stemAt(i / STEM_SEGMENTS, t, sway, gust, m.x, m.y, m.push, pt);
          stemData[i * 2] = pt[0];
          stemData[i * 2 + 1] = pt[1];
        }
        gl.uniform2fv(uStem, stemData);
        for (let i = 0; i < LEAVES; i++) {
          const lt = 0.12 + 0.86 * (i / (LEAVES - 1));
          stemAt(lt, t, sway, gust, m.x, m.y, m.push, pt);
          stemAt(Math.min(lt + 0.02, 1), t, sway, gust, m.x, m.y, m.push, ahead);
          const dx = pt[0] - m.x;
          const dy = pt[1] - m.y;
          leafData[i * 4] = pt[0];
          leafData[i * 4 + 1] = pt[1];
          leafData[i * 4 + 2] = Math.atan2(ahead[1] - pt[1], ahead[0] - pt[0]);
          leafData[i * 4 + 3] = Math.exp(-(dx * dx + dy * dy) / 0.06) * m.push;
        }
        gl.uniform4fv(uLeaf, leafData);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };

    // Judge speed by the MEDIAN gap between drawn frames over ~30 frames, so
    // one stall can't trigger anything. Slow for a whole window: step down.
    // Fine for several windows in a row: step back up.
    const judge = () => {
      gaps.sort((a, b) => a - b);
      const med = gaps[gaps.length >> 1];
      gaps.length = 0;
      const target = 1000 / LADDER[rung].fps;
      if (med > target * 1.6) {
        goodRuns = 0;
        if (rung < LADDER.length - 1) {
          if (steppedUp) needGood = Math.min(needGood * 2, 32); // it bounced back last time: be slower to retry
          rung++;
          resize();
        }
      } else if (med < target * 1.3) {
        if (rung > 0 && ++goodRuns >= needGood) {
          goodRuns = 0;
          rung--;
          steppedUp = true;
          resize();
        }
      } else {
        goodRuns = 0;
      }
    };

    const frame = (now: number) => {
      const gap = now - lastDraw;
      const minGap = (1000 / LADDER[rung].fps) * 0.9;
      if (gap >= minGap) {
        const dt = lastDraw ? Math.min(0.05, gap / 1000) : 0.016;
        t += dt * speed;

        // ease the cursor in; speed of movement makes the leaves flutter
        const px = m.x;
        const py = m.y;
        m.x += (m.tx - m.x) * 0.18;
        m.y += (m.ty - m.y) * 0.18;
        const sp = Math.min(1, Math.hypot(m.x - px, m.y - py) / Math.max(dt, 0.001) / 1.5);
        m.vel += (sp - m.vel) * 0.1;
        m.push += ((m.over ? 1 : 0) - m.push) * 0.06;
        // the light slides a little against the cursor, and settles back when it leaves
        m.px += ((m.over ? m.tx * 0.03 : 0) - m.px) * 0.05;
        m.py += ((m.over ? m.ty * 0.03 : 0) - m.py) * 0.05;

        render();

        if (lastDraw && !reduce && now > warmUntil) {
          gaps.push(gap);
          if (gaps.length >= 30) judge();
        }
        lastDraw = now;
      }
      raf = !reduce && !document.hidden ? requestAnimationFrame(frame) : 0;
    };

    const onVis = () => {
      if (!document.hidden && !reduce && !raf) {
        lastDraw = performance.now();
        gaps.length = 0;
        warmUntil = lastDraw + 1000;
        raf = requestAnimationFrame(frame);
      }
    };
    const onResize = () => {
      resize();
      if (reduce) requestAnimationFrame(() => render());
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  };

  const waitForProgram = () => {
    if (disposed) return;
    if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) {
      waitRaf = requestAnimationFrame(waitForProgram);
      return;
    }
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(prog), gl.getShaderInfoLog(fs), gl.getShaderInfoLog(vs));
      return;
    }
    stop = begin();
  };
  waitForProgram();

  return () => {
    disposed = true;
    cancelAnimationFrame(waitRaf);
    stop?.();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}

export default function WindowLight({
  lightColor = "#f4f4f8",
  darkColor = "#000000",
  speed = 1,
  sway = 1,
  scale = 1,
}: WindowLightProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let teardown: (() => void) | undefined;
    let cancelled = false;
    let idle = 0;
    let timer = 0;

    // Don't touch WebGL until the page has loaded and the browser is idle, so
    // the background can never hold up hydration or the first paint.
    const schedule = () => {
      const run = () => {
        if (cancelled) return;
        if (canvasRef.current) teardown = createWindowLight(canvasRef.current, { lightColor, darkColor, speed, sway, scale });
      };
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(run, { timeout: 1500 });
      else timer = window.setTimeout(run, 300);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
      teardown?.();
    };
    // Settings are read once on mount; remount (change `key`) to apply new ones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="windowlight" aria-hidden="true" style={{ background: darkColor }}>
      <canvas ref={canvasRef} className="windowlight__canvas" />
      <div
        className="windowlight__fade"
        style={{ background: `linear-gradient(to top, ${darkColor} 0%, transparent 45%)` }}
      />
    </div>
  );
}