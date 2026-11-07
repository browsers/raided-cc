"use client";

import { useEffect, useRef } from "react";
import type { PetSettings } from "../lib/profile-settings";
import { Snake, snakeSide } from "./snake";

// A pixel pet that runs after the cursor and settles down when it catches up.
//
//   cat    sprite sheet /public/pet/frames.png (256x128, 32px cells)
//   snake  drawn live by ./snake.ts, so it can be any length
//
//   scope="page"  fixed to the viewport, follows the cursor anywhere
//   scope="box"   lives inside its parent (which needs position: relative and
//                 overflow: hidden) and follows the cursor over that parent.
//                 Used for the preview in the dashboard.

const SHEET_URL = "/pet/frames.png";
const CELL = 32; // the cat's canvas is one 32x32 cell; the sprite is centred in it
const BASE_SPEED = 225; // px per second at speed 100%
const STRIDE_PX = 15; // ground covered per leg swap at 100% size, so legs match the speed
const MIN_RUN_FRAME_MS = 90; // legs never flip faster than this, even at top speed
const STILL_MS = 2000; // standing still before it sits down / coils up
const SIT_MS = 200; // the single "sitting down" frame
const BREATHE_MS = 200; // breathing loop, one frame every 200ms

type Frame = { x: number; y: number; w: number; h: number };
const frame = (x: number, y: number, w = 32, h = 32): Frame => ({ x, y, w, h });

// Clockwise from "right", so index = round(angle / 45deg)
const RUN: Frame[][] = [
  [frame(95, 0, 32, 28), frame(96, 33, 32, 28)], // right
  [frame(160, 33), frame(162, 62)], // down-right
  [frame(193, 96), frame(224, 63)], // down
  [frame(160, 96), frame(128, 96)], // down-left
  [frame(129, 64, 32, 28), frame(128, 99, 32, 28)], // left
  [frame(34, 0), frame(33, 30)], // up-left
  [frame(32, 64), frame(32, 96)], // up
  [frame(0, 64), frame(0, 96)], // up-right
];
const STILL = frame(96, 96);
const SIT = frame(96, 63);
const BREATHE = [frame(64, 0), frame(64, 32)];

/** Recolours the white part of the sprite. The black outline is kept. */
function tint(img: HTMLImageElement, color: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0);
  if (color.toLowerCase() !== "#ffffff") {
    g.globalCompositeOperation = "multiply"; // white -> colour, black stays black
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "destination-in"; // put the transparent pixels back
    g.drawImage(img, 0, 0);
  }
  return c;
}

export default function CursorPet({
  settings,
  scope = "page",
}: {
  settings: PetSettings;
  scope?: "page" | "box";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The animation loop reads settings from here, so changing a slider updates
  // the pet live without restarting anything.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;

    const host = scope === "box" ? canvas.parentElement : null;
    if (scope === "box" && !host) return;

    // Touch screens have no cursor to chase. A media query like (hover: none) is
    // unreliable (touch laptops, tablet mode and devtools emulation report it even
    // with a mouse attached), so on the page the pet stays hidden until a real
    // mouse or pen actually moves. Touch never reveals it.
    let shown = scope === "box";
    if (!shown) canvas.style.display = "none";

    const size = () => ({
      w: host ? host.clientWidth : window.innerWidth,
      h: host ? host.clientHeight : window.innerHeight,
    });

    const start = size();
    const pos = { x: start.w / 2, y: start.h / 2 };
    const target = { x: start.w / 2, y: start.h / 2 };
    let hovering = false; // box scope: is the pointer over the box right now?

    const onMove = (e: PointerEvent) => {
      if (!shown) {
        if (e.pointerType === "touch") return;
        shown = true;
        canvas.style.display = "";
      }
      hovering = true;
      if (host) {
        const r = host.getBoundingClientRect();
        target.x = e.clientX - r.left;
        target.y = e.clientY - r.top;
      } else {
        target.x = e.clientX;
        target.y = e.clientY;
      }
    };
    const onLeave = () => {
      hovering = false;
    };

    const source: EventTarget = host ?? window;
    source.addEventListener("pointermove", onMove as EventListener);
    if (host) host.addEventListener("pointerleave", onLeave);

    // The cat's sprite sheet, loaded once; `sheet` is the tinted copy we draw from
    let sheet: HTMLCanvasElement | null = null;
    let builtColor = "";
    const catImg = new Image();
    catImg.src = SHEET_URL;

    const snake = new Snake();

    let dir = 0;
    let runFrame = 0;
    let lastRunSwap = 0;
    let travel = 0; // px run since the last leg swap
    let idleSince = 0; // 0 = currently running
    let lastKey = "";
    let lastPx = 0;
    let lastOpacity = -1;
    let last = 0;
    let raf = 0;

    // Canvas size (CSS px) and opacity, only touched when they change
    const applyLook = (px: number, opacity: number) => {
      if (px !== lastPx) {
        canvas.style.width = `${px}px`;
        canvas.style.height = `${px}px`;
        lastPx = px;
      }
      if (opacity !== lastOpacity) {
        canvas.style.opacity = String(opacity / 100);
        lastOpacity = opacity;
      }
      canvas.style.transform = `translate3d(${pos.x - px / 2}px, ${pos.y - px / 2}px, 0)`;
    };

    // Switching pets changes the canvas size; resizing also wipes its state
    const setSide = (side: number) => {
      if (canvas.width === side) return;
      canvas.width = side;
      canvas.height = side;
      ctx.imageSmoothingEnabled = false;
      lastKey = "";
      lastPx = 0;
    };

    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      if (!shown) return; // nothing to draw until a mouse shows up
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      const s = settingsRef.current;
      const isSnake = s.type === "snake";

      // In the preview, wander back to the middle when the pointer leaves
      if (host && !hovering) {
        target.x = host.clientWidth / 2;
        target.y = host.clientHeight / 2;
      }

      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);
      const running = dist > s.distance + 0.5;

      let moved = 0;
      if (running) {
        const step = Math.min(BASE_SPEED * (s.speed / 100) * dt, dist - s.distance);
        pos.x += (dx / dist) * step;
        pos.y += (dy / dist) * step;
        travel += step;
        moved = step;
        dir = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
        idleSince = 0;
      } else if (!idleSince) {
        idleSince = ts;
      }

      // ---- Snake: redrawn every frame ----
      if (isSnake) {
        const side = snakeSide(s.length);
        setSide(side);
        const scale = s.size / 100;
        snake.step(
          pos.x,
          pos.y,
          moved,
          running ? dx / dist : 0,
          running ? dy / dist : 0,
          running,
          running ? 0 : ts - idleSince,
          dt,
          scale,
          s.length,
        );
        snake.draw(ctx, side, scale, s.length, s.color, ts, running);
        applyLook(side * scale, s.opacity);
        return;
      }

      // ---- Cat: pick a frame from the sprite sheet ----
      setSide(CELL);

      // (Re)build the tinted sheet when the colour changes
      if (catImg.complete && catImg.naturalWidth > 0 && builtColor !== s.color) {
        sheet = tint(catImg, s.color);
        builtColor = s.color;
        lastKey = "";
      }
      if (!sheet) return;

      let f: Frame;
      let key: string;
      if (running) {
        // Swap legs once per stride, so a slow cat has slow legs
        if (travel >= STRIDE_PX * (s.size / 100) && ts - lastRunSwap >= MIN_RUN_FRAME_MS) {
          runFrame ^= 1;
          lastRunSwap = ts;
          travel = 0;
        }
        f = RUN[dir][runFrame];
        key = `r${dir}${runFrame}`;
      } else {
        const t = ts - idleSince;
        if (t < STILL_MS) f = STILL;
        else if (t < STILL_MS + SIT_MS) f = SIT;
        else f = BREATHE[Math.floor((t - STILL_MS - SIT_MS) / BREATHE_MS) % 2];
        key = `i${f.x},${f.y}`;
      }

      // Only touch the canvas when the frame actually changed
      if (key !== lastKey) {
        lastKey = key;
        ctx.clearRect(0, 0, CELL, CELL);
        ctx.drawImage(
          sheet,
          f.x, f.y, f.w, f.h,
          Math.round((CELL - f.w) / 2), Math.round((CELL - f.h) / 2), f.w, f.h,
        );
      }

      applyLook(CELL * (s.size / 100), s.opacity);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      source.removeEventListener("pointermove", onMove as EventListener);
      if (host) host.removeEventListener("pointerleave", onLeave);
    };
  }, [scope]);

  return (
    <canvas
      ref={canvasRef}
      width={CELL}
      height={CELL}
      aria-hidden="true"
      style={{
        position: scope === "page" ? "fixed" : "absolute",
        left: 0,
        top: 0,
        zIndex: 50,
        pointerEvents: "none",
        imageRendering: "pixelated",
        willChange: "transform",
      }}
    />
  );
}