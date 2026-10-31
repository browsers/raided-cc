"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type DitherMediaProps = {
  src: string;
  mediaType?: "image" | "video";
  cellSize?: number;
  characters?: string;
  colorMode?: "original" | "monochrome";
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  contrast?: number;
  brightness?: number;
  invert?: boolean;
  fit?: "cover" | "contain";
  playing?: boolean;
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
};

const DEFAULT_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

export default function DitherMedia({
  src,
  mediaType = "image",
  cellSize = 10,
  characters = " .-=+*e2%@",
  colorMode = "original",
  textColor = "#ffffff",
  backgroundColor = "#000000",
  fontFamily = DEFAULT_FONT,
  contrast = 1,
  brightness = 1,
  invert = false,
  fit = "cover",
  playing = true,
  animate = false,
  className,
  style,
}: DitherMediaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const sampleCanvas = document.createElement("canvas");
    const sampleContext = sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!sampleContext) return;

    const ramp = Array.from(characters.length > 0 ? characters : " .:-=+*#%@");
    const size = Math.max(3, Math.round(cellSize));
    let media: HTMLImageElement | HTMLVideoElement | null = null;
    let ready = false;
    let raf = 0;
    let lastDraw = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let cols = 1;
    let rows = 1;
    let disposed = false;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cols = Math.max(1, Math.floor(width / size));
      rows = Math.max(1, Math.floor(height / size));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      sampleCanvas.width = cols;
      sampleCanvas.height = rows;
      sampleContext.imageSmoothingEnabled = true;
    };

    const mediaSize = () => {
      if (!media) return { width: 0, height: 0 };
      if (media instanceof HTMLVideoElement) {
        return { width: media.videoWidth, height: media.videoHeight };
      }
      return { width: media.naturalWidth, height: media.naturalHeight };
    };

    const drawMedia = (now: number) => {
      if (!media) return;
      const source = mediaSize();
      if (source.width <= 0 || source.height <= 0) return;

      sampleContext.clearRect(0, 0, cols, rows);
      sampleContext.fillStyle = backgroundColor;
      sampleContext.fillRect(0, 0, cols, rows);

      const sourceRatio = source.width / source.height;
      const targetRatio = cols / rows;
      let drawWidth = cols;
      let drawHeight = rows;
      let offsetX = 0;
      let offsetY = 0;

      if (fit === "cover") {
        if (sourceRatio > targetRatio) {
          drawHeight = rows;
          drawWidth = rows * sourceRatio;
          offsetX = (cols - drawWidth) / 2;
        } else {
          drawWidth = cols;
          drawHeight = cols / sourceRatio;
          offsetY = (rows - drawHeight) / 2;
        }
      } else if (sourceRatio > targetRatio) {
        drawWidth = cols;
        drawHeight = cols / sourceRatio;
        offsetY = (rows - drawHeight) / 2;
      } else {
        drawHeight = rows;
        drawWidth = rows * sourceRatio;
        offsetX = (cols - drawWidth) / 2;
      }

      if (animate && mediaType === "image" && fit === "cover") {
        const time = now * 0.00008;
        const zoom = 1.055 + Math.sin(time * 1.7) * 0.022;
        const scaledWidth = drawWidth * zoom;
        const scaledHeight = drawHeight * zoom;
        offsetX += (drawWidth - scaledWidth) / 2 + Math.sin(time) * cols * 0.012;
        offsetY += (drawHeight - scaledHeight) / 2 + Math.cos(time * 0.8) * rows * 0.009;
        drawWidth = scaledWidth;
        drawHeight = scaledHeight;
      }

      sampleContext.drawImage(media, offsetX, offsetY, drawWidth, drawHeight);
    };

    const draw = (now: number) => {
      if (!ready || disposed) return;
      drawMedia(now);

      let pixels: Uint8ClampedArray;
      try {
        pixels = sampleContext.getImageData(0, 0, cols, rows).data;
      } catch {
        return;
      }

      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, height);
      context.font = `${size}px ${fontFamily}`;
      context.textBaseline = "top";
      context.textAlign = "left";

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const index = (y * cols + x) * 4;
          const alpha = pixels[index + 3] / 255;
          if (alpha <= 0.01) continue;
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          let luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          luminance = clamp(((luminance * brightness - 0.5) * contrast + 0.5) * alpha);
          if (invert) luminance = 1 - luminance;
          const character =
            ramp[Math.min(ramp.length - 1, Math.floor(luminance * (ramp.length - 1)))];
          if (!character || character === " ") continue;
          context.fillStyle =
            colorMode === "original" ? `rgb(${r}, ${g}, ${b})` : textColor;
          context.fillText(character, x * size, y * size);
        }
      }
    };

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop);
      if (document.hidden) return;
      if (now - lastDraw < 1000 / 30) return;
      lastDraw = now;
      if (animate || mediaType === "video") {
        draw(now);
      }
    };

    const start = () => {
      if (disposed) return;
      const needsLoop =
        (animate && mediaType === "image") || (mediaType === "video" && playing);
      if (needsLoop) {
        if (!raf) raf = window.requestAnimationFrame(loop);
      } else {
        draw(performance.now());
      }
    };

    const load = () => {
      if (mediaType === "image") {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";
        image.onload = () => {
          if (disposed) return;
          media = image;
          ready = true;
          draw(performance.now());
          start();
        };
        image.src = src;
        media = image;
      } else {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "auto";
        video.src = src;
        const onReady = () => {
          if (disposed) return;
          media = video;
          ready = true;
          if (playing) {
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
          draw(performance.now());
          start();
        };
        video.addEventListener("loadeddata", onReady, { once: true });
        video.load();
        media = video;
      }
    };

    resize();
    load();

    const observer = new ResizeObserver(() => {
      resize();
      if (ready) {
        draw(performance.now());
        start();
      }
    });
    observer.observe(container);

    const onVisibility = () => {
      if (!document.hidden && ready) {
        lastDraw = 0;
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (media instanceof HTMLVideoElement) {
        media.pause();
        media.removeAttribute("src");
        media.load();
      }
      media = null;
    };
  }, [
    src,
    mediaType,
    cellSize,
    characters,
    colorMode,
    textColor,
    backgroundColor,
    fontFamily,
    contrast,
    brightness,
    invert,
    fit,
    playing,
    animate,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: backgroundColor,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Dithered media canvas"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
