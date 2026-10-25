"use client"

import ScanlineBloom from "@/components/ui/scanline-bloom"

// Hover to look through the lens, move fast to tear the signal, click to rebloom.
export default function ScanlineBloomDemoPage() {
  return (
    // w-full: 21st centres demos in a flex wrapper that would shrink this to 0px.
    <div className="w-full">
      <ScanlineBloom />
    </div>
  )
}
