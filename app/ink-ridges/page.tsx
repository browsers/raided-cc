'use client'

import { useEffect, useState } from 'react'
import InkRidges from '@/components/ui/ink-ridges'

// Plain values only: 21st builds the preview's controls from this object.
// The moon is left to the component's default ('auto'), so dark mode shows it.
const settings = {
  layers: 4,
  seed: 7,
  horizon: 0.62,
  mist: 0.6,
  drift: 0.05,
  parallax: 0.03,
  paintIn: 2600,
  sun: true,
  sunColor: '#b5402a',
  scrollDepth: 0.35,
  glow: 0.45,
  clouds: 0.35,
  birds: 5,
  birdsEvery: 14,
  grain: 0.3,
}

export default function InkRidgesDemoPage() {
  const s = settings
  const [bump, setBump] = useState(0)
  const seed = s.seed + bump

  // The root layout keeps the page still for the site's full-bleed background.
  // This route scrolls so the landscape's scroll depth can be seen.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'auto'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div className="w-full bg-background text-foreground">
      <InkRidges
        layers={s.layers}
        seed={seed}
        horizon={s.horizon}
        mist={s.mist}
        drift={s.drift}
        parallax={s.parallax}
        paintIn={s.paintIn}
        sun={s.sun}
        sunColor={s.sunColor}
        scrollDepth={s.scrollDepth}
        glow={s.glow}
        clouds={s.clouds}
        birds={s.birds}
        birdsEvery={s.birdsEvery}
        grain={s.grain}
        label="An ink landscape of layered mountain ridges in mist, painted by code"
        className="h-[82svh] min-h-[520px] w-full bg-background"
      >
        <div className="max-w-xl p-6 md:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ink ridges · seed {seed}</p>
          <h1 className="mt-4 font-serif text-5xl font-normal leading-[0.98] tracking-[-0.02em] md:text-7xl">
            Mountains,
            <br />
            painted in place.
          </h1>
          <p className="mt-5 max-w-sm text-sm text-muted-foreground">
            Every seed paints a different range. Ink thins toward each foot, mist drifts between the ridges, now and then a flock crosses, and the sun sets as you scroll on.
          </p>
          <button
            type="button"
            id="paint-another-range"
            onClick={() => setBump((b) => b + 1)}
            className="mt-6 rounded-full border border-foreground/25 bg-background/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] backdrop-blur-sm transition-colors duration-150 hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Paint another range
          </button>
        </div>
      </InkRidges>
      <section className="mx-auto flex min-h-[120svh] max-w-3xl flex-col justify-center px-6 py-24 md:px-10">
        <h2 className="font-serif text-3xl leading-tight">A range, not a picture.</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing here is an image. Each ridge is a line of noise brushed in from the left, far ridge first; the ink thins toward its foot, and
          mist lifts out of it and drifts. The landscape draws only while something moves, takes the paper and ink from your theme, and under
          prefers-reduced-motion it is one finished, still frame.
        </p>
      </section>
    </div>
  )
}
