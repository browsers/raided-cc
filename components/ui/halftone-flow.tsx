"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type EffectMode = "dark" | "light";

export type HalftoneFlowProps = {
  mode?: EffectMode;
  hue?: number;
  saturation?: number;
  brightness?: number;
  className?: string;
  style?: CSSProperties;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

const VERT = `attribute vec4 aVertexPosition;
void main() {
  gl_Position = aVertexPosition;
}`;

const FRAG = `precision highp float;
uniform vec2 u_resolution;
uniform float u_time;

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;

  vec2 flow_uv = p;
  float time = u_time * 0.4;

  for (float i = 1.0; i < 4.0; i++) {
    flow_uv *= rot(time * 0.1);
    flow_uv.x += sin(flow_uv.y * 2.0 * i + time) * 0.5;
    flow_uv.y += cos(flow_uv.x * 1.5 * i - time * 0.8) * 0.5;
  }

  float intensity = sin(flow_uv.x * 2.0 + flow_uv.y * 3.0) * 0.5 + 0.5;

  vec3 col_dark = vec3(0.32);
  vec3 col_mid = vec3(0.72);
  vec3 col_bright = vec3(1.0);

  vec3 fluid_color = mix(col_dark, col_mid, smoothstep(0.2, 0.6, intensity));
  fluid_color = mix(fluid_color, col_bright, smoothstep(0.7, 1.0, intensity));

  float gridSize = 6.0;
  vec2 grid_uv = gl_FragCoord.xy / gridSize;
  vec2 cell_uv = fract(grid_uv) - 0.5;

  float dist = length(cell_uv);
  float radius = mix(0.16, 0.44, intensity);
  float dot_mask = smoothstep(radius, radius - 0.1, dist);

  vec3 final_color = mix(vec3(0.0), fluid_color, dot_mask);
  final_color += fluid_color * 0.12;

  gl_FragColor = vec4(final_color, 1.0);
}`;

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function HalftoneFlow({
  mode = "dark",
  hue = 0,
  saturation = 1,
  brightness = 1,
  className,
  style,
}: HalftoneFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const safeMode: EffectMode = mode === "light" ? "light" : "dark";
  const safeHue = clamp(hue, -180, 180);
  const safeSaturation = clamp(saturation, 0, 2);
  const safeBrightness = clamp(brightness, 0.35, 1.65);
  const filter =
    safeHue === 0 && safeSaturation === 1 && safeBrightness === 1
      ? undefined
      : `hue-rotate(${safeHue}deg) saturate(${safeSaturation}) brightness(${safeBrightness})`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vertexShader = compile(gl, gl.VERTEX_SHADER, VERT);
    const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, "u_resolution");
    const time = gl.getUniformLocation(program, "u_time");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let visible = true;
    let started = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };

    const draw = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      resize();
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, reduced.matches ? 8 : (now - started) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduced.matches) raf = requestAnimationFrame(draw);
    };

    const kick = () => {
      if (raf || !visible || document.hidden) return;
      started = performance.now() - (reduced.matches ? 8000 : 0);
      raf = requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      kick();
    });
    resizeObserver.observe(canvas);

    const intersection = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) kick();
    });
    intersection.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else {
        kick();
      }
    };
    const onMotion = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotion);

    resize();
    kick();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onMotion);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-mode={safeMode}
      aria-hidden="true"
      className={cn("block h-full w-full", className)}
      style={{
        background: "#000",
        filter,
        ...style,
      }}
    />
  );
}

export default HalftoneFlow;
