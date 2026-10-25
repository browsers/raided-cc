"use client";

import { PixelLiquidBg } from "@/components/ui/pixel-liquid-bg";

export default function PixelLiquidDemoPage() {
  return (
    <div className="relative h-svh w-full overflow-hidden">
      <PixelLiquidBg className="absolute inset-0" />
    </div>
  );
}
