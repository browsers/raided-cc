"use client";

import HalftoneFlow from "@/components/ui/halftone-flow";

const GHOST_PATH =
  "M160 8C92 8 48 52 42 110C38 148 42 186 26 228C22 240 30 250 42 244C66 232 88 236 100 252C110 266 126 268 138 252C148 238 162 238 172 252C184 268 202 268 214 254C226 238 248 232 272 244C284 250 292 240 288 228C272 186 276 148 272 110C266 52 222 8 160 8Z";

const MASK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 290"><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1100" height="290"><rect width="1100" height="290" fill="black"/><g transform="translate(140 85) scale(0.45)"><path d="${GHOST_PATH}" fill="white"/><ellipse cx="128" cy="120" rx="14" ry="30" fill="black"/><ellipse cx="192" cy="120" rx="14" ry="30" fill="black"/></g><text x="630" y="195" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="140" font-weight="700" fill="white">raided.cc</text></mask></defs><rect width="1100" height="290" fill="white" mask="url(#m)"/></svg>`;

const MASK_URL = `url("data:image/svg+xml,${encodeURIComponent(MASK_SVG)}")`;

export default function HalftoneLockup() {
  return (
    <main className="relative grid h-svh w-full place-items-center overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          maskImage: MASK_URL,
          WebkitMaskImage: MASK_URL,
          maskSize: "min(82vw, 1050px) auto",
          WebkitMaskSize: "min(82vw, 1050px) auto",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      >
        <HalftoneFlow className="h-full w-full" />
      </div>
    </main>
  );
}
