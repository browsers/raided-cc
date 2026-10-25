"use client";

import HalftoneFlow from "@/components/ui/halftone-flow";

const GHOST_PATH =
  "M160 8C92 8 48 52 42 110C38 148 42 186 26 228C22 240 30 250 42 244C66 232 88 236 100 252C110 266 126 268 138 252C148 238 162 238 172 252C184 268 202 268 214 254C226 238 248 232 272 244C284 250 292 240 288 228C272 186 276 148 272 110C266 52 222 8 160 8Z";

const GHOST_MASK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 270"><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="270"><rect width="320" height="270" fill="black"/><path d="${GHOST_PATH}" fill="white"/><ellipse cx="128" cy="120" rx="14" ry="30" fill="black"/><ellipse cx="192" cy="120" rx="14" ry="30" fill="black"/></mask></defs><rect width="320" height="270" fill="white" mask="url(#m)"/></svg>`;

const GHOST_MASK_URL = `url("data:image/svg+xml,${encodeURIComponent(GHOST_MASK_SVG)}")`;

const maskStyle = {
  maskImage: GHOST_MASK_URL,
  WebkitMaskImage: GHOST_MASK_URL,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskPosition: "center",
  WebkitMaskPosition: "center",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
} as const;

export default function HalftoneLockup() {
  return (
    <main className="grid h-svh w-full place-items-center overflow-hidden bg-black">
      <div className="flex -translate-y-[2.5vh] items-center justify-center gap-4 sm:gap-6">
        <div
          className="relative aspect-[320/270] h-[clamp(2.75rem,7vw,6.75rem)] shrink-0"
          style={maskStyle}
        >
          <HalftoneFlow className="absolute inset-0 h-full w-full" />
        </div>
        <span
          className="text-[clamp(2.5rem,6.5vw,7rem)] font-bold leading-none tracking-[-0.045em] text-white"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          raided.cc
        </span>
      </div>
    </main>
  );
}
