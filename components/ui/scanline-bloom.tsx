"use client"

import * as React from "react"

/**
 * Scanline Bloom — a bouquet of lilies and roses printed in red on black
 * paper, the way a cheap risograph or a dying CRT would do it: ragged
 * horizontal scanlines that thicken with the light, a stipple dither that
 * takes over toward the bottom, paper grain, and a thin frame behind it all.
 *
 * Nothing is downloaded. The flowers are painted procedurally with Canvas 2D
 * from a seed (petals, veins, stamens, spots), uploaded as a texture, and a
 * WebGL1 fragment shader does the printing. Pass `src` to print your own
 * picture instead.
 *
 * Interaction: the pointer is a lens that magnifies, bends the scanlines
 * around itself and flips the print mode under it (lines become stipple and
 * stipple becomes lines). Moving fast tears the rows sideways like a slipped
 * signal. Click, Enter or Space reblooms: a new bouquet scans in from the top.
 *
 * Pauses while the tab is hidden. Honours prefers-reduced-motion: no sway,
 * no scan crawl, no tearing, and the intro and rebloom cut instead of sweep.
 */

export type ScanlineBloomProps = {
  /** Print your own image (luminance only). Must allow CORS. Omit for the painted bouquet. */
  src?: string
  /** Which bouquet to paint. Changing it scans the new one in. */
  seed?: number
  /** The ink. Hex (#rgb or #rrggbb). */
  ink?: string
  /** What the brightest petals push toward. */
  highlight?: string
  /** The paper. */
  background?: string
  /** "mixed" prints lines on top and stipple toward the bottom. */
  mode?: "mixed" | "lines" | "stipple"
  /** Scanline pitch in CSS px. */
  lineSpacing?: number
  /** Stipple dot size in CSS px. */
  dotSize?: number
  /** Draw the thin frame. */
  frame?: boolean
  /** Frame inset from the edge, CSS px. */
  frameInset?: number
  /** Frame colour. Defaults to the ink. */
  frameColor?: string
  /** Pointer lens radius, CSS px. 0 turns the lens off. */
  lensRadius?: number
  /** Idle row tearing, 0..1. Pointer speed adds to it. */
  glitch?: number
  /** How much the flowers breathe, 0..2. */
  sway?: number
  /** Scanline crawl, CSS px per second. */
  scanSpeed?: number
  /** Paper grain, 0..1. */
  grain?: number
  /** Corner darkening, 0..1. */
  vignette?: number
  /** Click / Enter / Space reblooms. */
  interactive?: boolean
  /** Called with the new seed after every rebloom. */
  onBloom?: (seed: number) => void
  /** Freeze the clock. The pointer still works. */
  paused?: boolean
  /** Accessible description of the picture. */
  label?: string
  /**
   * Explicit height. The canvas fills this box, so it must be a definite
   * length — "100%" only works if every ancestor also has one, which an
   * installed page usually does not.
   */
  height?: string
  className?: string
  /** Rendered above the print (captions, a nav). */
  children?: React.ReactNode
}

// #region bloom
export type Bloom = {
  kind: "leaf" | "lily" | "rose" | "bud"
  /** Position, as a fraction of width / height. Leaves: the base. */
  x: number
  y: number
  /** Size as a fraction of sqrt(width × height). Leaves: length. */
  r: number
  /** Direction, radians, screen space (y down). */
  a: number
  /** Leaves: width ratio. Lilies: tilt (y squash). */
  k: number
  /** Leaves: bend. */
  b: number
  /** Brightness, 0..1. */
  tone: number
}

function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The seed after this one; clicks walk this chain. */
function nextSeed(seed: number) {
  return ((Math.imul((seed ^ 0x9e3779b9) >>> 0, 0x85ebca6b) >>> 0) % 999983) + 1
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h.replace(/./g, "$&$&")
  const n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/**
 * The bouquet: leaves fanning out of a hidden heart, three or four big
 * blooms (lilies and roses), a few buds. Deterministic per seed. Tall boxes
 * get an extra bloom so the height is not left empty.
 */
function layoutBouquet(seed: number, aspect: number) {
  const rnd = mulberry32(seed)
  const jit = (v: number, amt: number) => v + (rnd() * 2 - 1) * amt
  const tall = aspect < 0.85
  const heart: [number, number] = [jit(0.5, 0.05), jit(tall ? 0.52 : 0.58, 0.04)]
  const leaves: Bloom[] = []
  const flowers: Bloom[] = []
  const buds: Bloom[] = []

  for (const dir of [-2.55, -2.1, -1.7, -1.3, -0.85, -0.35, 0.15, 0.6, 2.5, 2.95, 3.4]) {
    leaves.push({
      kind: "leaf",
      x: heart[0] + jit(0, 0.03),
      y: heart[1] + jit(0, 0.03),
      r: jit(tall ? 0.4 : 0.47, 0.08),
      a: jit(dir, 0.14),
      k: jit(0.27, 0.05),
      b: jit(0, 0.3),
      tone: jit(0.55, 0.15),
    })
  }

  const spots = tall
    ? [[0.5, 0.1, 0.32], [0.26, 0.4, 0.26], [0.74, 0.63, 0.28], [0.3, 0.88, 0.29]]
    : [[0.47, 0.12, 0.33], [0.24, 0.8, 0.29], [0.7, 0.8, 0.32]]
  spots.forEach(([x, y, r], i) => {
    const kind = rnd() < (i === 0 ? 0.75 : 0.5) ? "lily" : "rose"
    // Two or three leaves tucked behind every bloom.
    const tucked = 2 + Math.floor(rnd() * 2)
    for (let l = 0; l < tucked; l++) {
      leaves.push({
        kind: "leaf",
        x: x! + jit(0, 0.02),
        y: y! + jit(0, 0.02),
        r: r! * jit(1.45, 0.25),
        a: rnd() * Math.PI * 2,
        k: jit(0.3, 0.05),
        b: jit(0, 0.35),
        tone: jit(0.5, 0.15),
      })
    }
    flowers.push({
      kind,
      x: jit(x!, 0.05),
      y: jit(y!, 0.04),
      r: jit(r!, 0.035) * (kind === "rose" ? 0.85 : 1),
      a: rnd() * Math.PI * 2,
      k: jit(0.78, 0.14),
      b: 0,
      tone: jit(0.94, 0.05),
    })
  })
  // Always both species.
  if (!flowers.some((f) => f.kind === "rose")) flowers[1] = { ...flowers[1]!, kind: "rose", r: flowers[1]!.r * 0.85 }
  if (!flowers.some((f) => f.kind === "lily")) flowers[2] = { ...flowers[2]!, kind: "lily" }

  for (const [x, y] of [[0.19, 0.3], [0.84, 0.17], [0.9, 0.56]]) {
    const bx = jit(x!, 0.04)
    const by = jit(y!, 0.04)
    buds.push({
      kind: "bud",
      x: bx,
      y: by,
      r: jit(0.075, 0.02),
      a: Math.atan2(by - heart[1], (bx - heart[0]) * aspect) + jit(0, 0.3),
      k: 0,
      b: 0,
      tone: jit(0.8, 0.1),
    })
  }

  // Leaves at the back; lower blooms overlap higher ones.
  flowers.sort((p, q) => p.y - q.y)
  return { heart, blooms: [...leaves, ...buds, ...flowers] }
}

/** Painting size for a box: device-ish resolution, long side capped. */
function paintSize(w: number, h: number, dpr: number): [number, number] {
  const scale = Math.min(Math.min(dpr, 1.5), 1600 / Math.max(w, h, 1))
  return [Math.max(2, Math.round(w * scale)), Math.max(2, Math.round(h * scale))]
}
// #endregion

// --- Painter: Canvas 2D, grayscale, white = ink --------------------------------

const TAU = Math.PI * 2
const gray = (v: number) => {
  const c = Math.round(Math.min(1, Math.max(0, v)) * 255)
  return "rgb(" + c + "," + c + "," + c + ")"
}
const shade = (a: number) => "rgba(0,0,0," + a + ")"
const glow = (a: number) => "rgba(255,255,255," + a + ")"

function paintLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, leaf: Bloom) {
  const wid = len * leaf.k
  const bend = leaf.b
  const t = leaf.tone
  const off = (f: number) => bend * len * f * f
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(leaf.a)

  // Two halves so each can be lit separately and both follow the bend.
  const upper = new Path2D()
  upper.moveTo(0, 0)
  upper.bezierCurveTo(len * 0.22, -wid * 1.05 + off(0.22), len * 0.68, -wid * 0.8 + off(0.68), len, off(1))
  upper.quadraticCurveTo(len * 0.5, 0, 0, 0)
  const lower = new Path2D()
  lower.moveTo(0, 0)
  lower.bezierCurveTo(len * 0.22, wid * 0.95 + off(0.22), len * 0.68, wid * 0.72 + off(0.68), len, off(1))
  lower.quadraticCurveTo(len * 0.5, 0, 0, 0)
  const whole = new Path2D()
  whole.addPath(upper)
  whole.addPath(lower)

  const mid = off(0.5)
  const up = ctx.createLinearGradient(0, mid, 0, mid - wid * 0.9)
  up.addColorStop(0, gray(t * 0.42))
  up.addColorStop(0.35, gray(t * 0.78))
  up.addColorStop(1, gray(t * 0.98))
  ctx.fillStyle = up
  ctx.fill(upper)
  const low = ctx.createLinearGradient(0, mid, 0, mid + wid * 0.85)
  low.addColorStop(0, gray(t * 0.2))
  low.addColorStop(0.5, gray(t * 0.46))
  low.addColorStop(1, gray(t * 0.3))
  ctx.fillStyle = low
  ctx.fill(lower)

  ctx.save()
  ctx.clip(whole)
  // Darker where it tucks into the bouquet, a little dimmer at the tip.
  const along = ctx.createLinearGradient(0, 0, len, 0)
  along.addColorStop(0, shade(0.85))
  along.addColorStop(0.3, shade(0.15))
  along.addColorStop(0.85, shade(0))
  along.addColorStop(1, shade(0.25))
  ctx.fillStyle = along
  ctx.fillRect(-4, -len, len + 8, len * 2)
  // Lateral veins.
  ctx.lineCap = "round"
  for (let i = 1; i < 8; i++) {
    const f = i / 8.5
    const g = Math.min(1, f + 0.16)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(len * f, off(f))
      ctx.quadraticCurveTo(len * (f + 0.07), off(f + 0.07) + side * wid * 0.35, len * g, off(g) + side * wid * 0.85 * (1 - f * 0.8))
      ctx.strokeStyle = shade(0.32)
      ctx.lineWidth = Math.max(1, wid * 0.035)
      ctx.stroke()
    }
  }
  ctx.restore()

  // Midrib: a groove with a lit lip.
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(len * 0.5, 0, len * 0.97, off(0.97))
  ctx.strokeStyle = shade(0.6)
  ctx.lineWidth = Math.max(1, wid * 0.09)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(len * 0.05, -wid * 0.06)
  ctx.quadraticCurveTo(len * 0.5, -wid * 0.06, len * 0.9, off(0.9) - wid * 0.04)
  ctx.strokeStyle = glow(0.22)
  ctx.lineWidth = Math.max(1, wid * 0.03)
  ctx.stroke()

  ctx.strokeStyle = shade(0.7)
  ctx.lineWidth = Math.max(1, len * 0.006)
  ctx.stroke(whole)
  ctx.restore()
}

function petalPath(len: number, wid: number, curl: number) {
  const p = new Path2D()
  p.moveTo(0, 0)
  p.bezierCurveTo(len * 0.25, -wid * 1.1, len * 0.66, -wid * 0.95, len, curl)
  p.bezierCurveTo(len * 0.66, wid * 0.8, len * 0.25, wid * 1.0, 0, 0)
  return p
}

function paintLily(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, lily: Bloom, rnd: () => number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(lily.a)
  ctx.scale(1, lily.k)

  for (const back of [true, false]) {
    for (let i = 0; i < 3; i++) {
      const ang = (i * TAU) / 3 + (back ? Math.PI / 3 : 0) + (rnd() - 0.5) * 0.25
      const len = R * (back ? 0.9 : 1) * (0.92 + rnd() * 0.12)
      const wid = R * (back ? 0.29 : 0.34)
      const curl = wid * (rnd() - 0.3) * 0.5
      const tone = lily.tone * (back ? 0.68 : 1)
      ctx.save()
      ctx.rotate(ang)
      const petal = petalPath(len, wid, curl)
      const g = ctx.createLinearGradient(0, 0, len, 0)
      g.addColorStop(0, gray(0.04))
      g.addColorStop(0.16, gray(tone * 0.32))
      g.addColorStop(0.5, gray(tone * 0.97))
      g.addColorStop(0.82, gray(tone * 0.86))
      g.addColorStop(1, gray(tone * 0.5))
      ctx.fillStyle = g
      ctx.fill(petal)

      ctx.save()
      ctx.clip(petal)
      // One side of the petal turned from the light.
      const side = ctx.createLinearGradient(0, -wid, 0, wid)
      side.addColorStop(0, shade(0))
      side.addColorStop(0.48, shade(0.05))
      side.addColorStop(0.55, shade(0.4))
      side.addColorStop(1, shade(0.55))
      ctx.fillStyle = side
      ctx.fillRect(0, -wid * 1.2, len, wid * 2.4)
      // Freckles near the throat.
      for (let s = 0; s < 22; s++) {
        const fx = len * (0.14 + rnd() * 0.36)
        const fy = (rnd() - 0.5) * wid * 1.1 * (fx / len + 0.3)
        ctx.beginPath()
        ctx.arc(fx, fy, R * (0.006 + rnd() * 0.01), 0, TAU)
        ctx.fillStyle = shade(0.75)
        ctx.fill()
      }
      ctx.restore()

      // Central groove and its lit ridge.
      ctx.beginPath()
      ctx.moveTo(len * 0.08, 0)
      ctx.quadraticCurveTo(len * 0.5, wid * 0.05, len * 0.86, curl * 0.8)
      ctx.strokeStyle = shade(0.55)
      ctx.lineWidth = Math.max(1, wid * 0.1)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(len * 0.12, -wid * 0.1)
      ctx.quadraticCurveTo(len * 0.5, -wid * 0.08, len * 0.8, curl * 0.8 - wid * 0.08)
      ctx.strokeStyle = glow(0.28)
      ctx.lineWidth = Math.max(1, wid * 0.04)
      ctx.stroke()

      ctx.strokeStyle = shade(0.65)
      ctx.lineWidth = Math.max(1, R * 0.01)
      ctx.stroke(petal)
      ctx.restore()
    }
  }

  // Throat.
  const throat = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.24)
  throat.addColorStop(0, shade(0.95))
  throat.addColorStop(1, shade(0))
  ctx.fillStyle = throat
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.24, 0, TAU)
  ctx.fill()

  // Stamens and the pistil, drawn in the flower's tilted plane.
  ctx.lineCap = "round"
  for (let i = 0; i < 7; i++) {
    const pistil = i === 6
    const ang = pistil ? rnd() * TAU : (i * TAU) / 6 + (rnd() - 0.5) * 0.6
    const len = R * (pistil ? 0.62 : 0.45 + rnd() * 0.15)
    const ex = Math.cos(ang) * len
    const ey = Math.sin(ang) * len
    const bow = (rnd() - 0.5) * R * 0.2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(ex * 0.5 - Math.sin(ang) * bow, ey * 0.5 + Math.cos(ang) * bow, ex, ey)
    ctx.strokeStyle = shade(0.8)
    ctx.lineWidth = Math.max(1.5, R * 0.022)
    ctx.stroke()
    ctx.strokeStyle = gray(0.72)
    ctx.lineWidth = Math.max(1, R * 0.011)
    ctx.stroke()
    ctx.save()
    ctx.translate(ex, ey)
    ctx.rotate(ang + Math.PI / 2 + (rnd() - 0.5) * 0.8)
    ctx.beginPath()
    if (pistil) ctx.arc(0, 0, R * 0.03, 0, TAU)
    else ctx.ellipse(0, 0, R * 0.06, R * 0.022, 0, 0, TAU)
    const pollen = ctx.createLinearGradient(0, -R * 0.022, 0, R * 0.022)
    pollen.addColorStop(0, gray(pistil ? 0.8 : 0.9))
    pollen.addColorStop(1, gray(0.35))
    ctx.fillStyle = pollen
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

function paintRose(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, rose: Bloom, rnd: () => number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rose.a)
  ctx.lineJoin = "round"
  const t = rose.tone

  const petal = (cx: number, cy: number, rx: number, ry: number, rot: number, reach: number, tone: number) => {
    // An ellipse with a ruffled, notched rim.
    ctx.beginPath()
    const k = 3 + Math.floor(rnd() * 3)
    const ph = rnd() * TAU
    for (let j = 0; j <= 64; j++) {
      const th = (j / 64) * TAU
      const outer = Math.max(0, Math.cos(th))
      const w = 1 + 0.05 * Math.sin(k * th + ph) * outer + 0.025 * Math.sin(11 * th + ph * 2) - 0.07 * Math.pow(outer, 24)
      const ex = Math.cos(th) * rx * w
      const ey = Math.sin(th) * ry * w
      const px = cx + ex * Math.cos(rot) - ey * Math.sin(rot)
      const py = cy + ex * Math.sin(rot) + ey * Math.cos(rot)
      if (j) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
    ctx.closePath()
    const g = ctx.createRadialGradient(0, 0, reach * 0.1, 0, 0, reach)
    g.addColorStop(0, gray(0.03))
    g.addColorStop(0.55, gray(tone * 0.45))
    g.addColorStop(0.9, gray(tone * 0.95))
    g.addColorStop(1, gray(tone))
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = shade(0.75)
    ctx.lineWidth = Math.max(1.5, R * 0.014)
    ctx.stroke()
    // A lit rim on the outer edge of each petal.
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 0.94, ry * 0.94, rot, -1.1, 1.1)
    ctx.strokeStyle = glow(0.3)
    ctx.lineWidth = Math.max(1, R * 0.01)
    ctx.stroke()
  }

  // Guard petals.
  for (let i = 0; i < 5; i++) {
    const ang = (i * TAU) / 5 + (rnd() - 0.5) * 0.4
    const d = R * 0.42
    petal(Math.cos(ang) * d, Math.sin(ang) * d, R * 0.6, R * 0.46, ang, R, t * 0.85)
  }
  // The spiral heart, each petal smaller and a golden angle on.
  const layers = 16
  for (let i = 0; i < layers; i++) {
    const f = 1 - i / layers
    const rr = R * 0.72 * Math.pow(f, 0.9)
    const ang = i * 2.39996 + rnd() * 0.2
    const d = rr * 0.28
    petal(Math.cos(ang) * d, Math.sin(ang) * d, rr * 0.78, rr * 0.6, ang, rr * 1.1, t * (0.7 + 0.3 * f))
  }
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.05, 0, TAU)
  ctx.fillStyle = shade(0.9)
  ctx.fill()
  ctx.restore()
}

function paintBud(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, bud: Bloom) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(bud.a)
  const body = new Path2D()
  body.moveTo(0, 0)
  body.bezierCurveTo(R * 0.2, -R * 0.55, R * 0.9, -R * 0.35, R * 1.5, 0)
  body.bezierCurveTo(R * 0.9, R * 0.35, R * 0.2, R * 0.55, 0, 0)
  const g = ctx.createLinearGradient(0, -R * 0.45, 0, R * 0.45)
  g.addColorStop(0, gray(bud.tone))
  g.addColorStop(0.45, gray(bud.tone * 0.7))
  g.addColorStop(1, gray(bud.tone * 0.2))
  ctx.fillStyle = g
  ctx.fill(body)
  ctx.strokeStyle = shade(0.7)
  ctx.lineWidth = Math.max(1, R * 0.04)
  ctx.stroke(body)
  // Seam and sepals.
  ctx.beginPath()
  ctx.moveTo(R * 0.1, 0)
  ctx.quadraticCurveTo(R * 0.8, -R * 0.08, R * 1.45, 0)
  ctx.strokeStyle = shade(0.5)
  ctx.stroke()
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(R * 0.3, side * R * 0.5, R * 0.75, side * R * 0.32)
    ctx.quadraticCurveTo(R * 0.3, side * R * 0.2, 0, 0)
    ctx.fillStyle = gray(0.3)
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

function paintBouquet(canvas: HTMLCanvasElement, w: number, h: number, seed: number) {
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, w, h)
  const unit = Math.sqrt(w * h)
  const { heart, blooms } = layoutBouquet(seed, w / h)
  const rnd = mulberry32(seed ^ 0x5bd1e995)
  const hx = heart[0] * w
  const hy = heart[1] * h

  // Stems from the heart to every bloom and bud.
  ctx.lineCap = "round"
  for (const b of blooms) {
    if (b.kind === "leaf") continue
    const ex = b.x * w
    const ey = b.y * h
    ctx.beginPath()
    ctx.moveTo(hx, hy)
    ctx.quadraticCurveTo((hx + ex) / 2 + (rnd() - 0.5) * unit * 0.15, (hy + ey) / 2, ex, ey)
    ctx.strokeStyle = shade(1)
    ctx.lineWidth = unit * 0.016
    ctx.stroke()
    ctx.strokeStyle = gray(0.4)
    ctx.lineWidth = unit * 0.008
    ctx.stroke()
  }

  for (const b of blooms) {
    const x = b.x * w
    const y = b.y * h
    const size = b.r * unit
    if (b.kind === "leaf") paintLeaf(ctx, x, y, size, b)
    else if (b.kind === "bud") paintBud(ctx, x, y, size, b)
    else if (b.kind === "lily") paintLily(ctx, x, y, size, b, rnd)
    else paintRose(ctx, x, y, size, b, rnd)
  }
}

// --- WebGL -------------------------------------------------------------------

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_texA;
uniform sampler2D u_texB;
uniform vec4 u_scene;    // resolution.xy, time, dpr
uniform vec4 u_pointer;  // xy (device px, y up), presence, tear
uniform vec4 u_print;    // line spacing, mode, dot size, sway
uniform vec4 u_fx;       // lens radius, rebloom progress, intro, scan offset
uniform vec4 u_frame;    // aspect A, aspect B, frame inset, field seed
uniform vec4 u_post;     // grain, vignette
uniform vec3 u_ink;
uniform vec3 u_hot;
uniform vec3 u_bg;
uniform vec3 u_frameColor;

// Dave Hoskins hash12: even white noise with no lattice showing.
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

// Object-fit: cover.
vec2 cover(vec2 uv, float texAspect) {
  float ca = u_scene.x / u_scene.y;
  vec2 s = ca > texAspect ? vec2(1.0, texAspect / ca) : vec2(ca / texAspect, 1.0);
  return clamp((uv - 0.5) * s + 0.5, 0.0, 1.0);
}

// A scan front falling from the top: 1 above it, 0 below, ragged per row.
float scanned(float fromTop, float row, float progress) {
  float front = progress * 1.2 - 0.1;
  return step(fromTop + (hash(vec2(row, 3.7)) - 0.5) * 0.05, front);
}

void main() {
  vec2 res = u_scene.xy;
  float time = u_scene.z;
  float dpr = u_scene.w;
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / res;
  float fromTop = 1.0 - uv.y;

  float sp = max(u_print.x, 1.5) * dpr;
  vec2 pd = (frag - u_pointer.xy) / dpr;
  float R = max(u_fx.x, 1.0);
  float lens = u_pointer.z * exp(-dot(pd, pd) / (R * R)) * step(1.0, u_fx.x);

  // Rows arch over the lens, and the whole sheet crawls.
  float ly = frag.y + u_fx.w * dpr + lens * sp * 1.8;
  float row = floor(ly / sp);
  float band = floor(frag.y / (sp * 3.0));

  // Sample point: breathing sway, lens magnification, torn rows.
  vec2 s = uv;
  s += u_print.w * 0.004 * vec2(
    sin(uv.y * 7.0 + time * 0.8) + 0.5 * sin(uv.y * 17.0 - time * 1.3),
    0.6 * sin(uv.x * 5.0 + time * 0.6));
  s -= (frag - u_pointer.xy) / res * lens * 0.4;
  float tick = floor(time * 9.0);
  float tear = u_pointer.w;
  float torn = step(1.0 - tear * 0.45, hash(vec2(band, tick)));
  s.x += (hash(vec2(band + 11.0, tick)) - 0.5) * tear * 0.09 * torn;

  float tone = texture2D(u_texA, cover(s, u_frame.x)).r;
  float swapping = step(u_fx.y, 0.999);
  if (swapping > 0.5) {
    float toneB = texture2D(u_texB, cover(s, u_frame.y)).r;
    tone = mix(tone, toneB, scanned(fromTop, row, u_fx.y));
  }
  tone *= scanned(fromTop, row, u_fx.z);
  tone = clamp((tone - 0.03) * 1.12, 0.0, 1.0);
  tone = min(1.0, tone + lens * 0.14 * step(0.02, tone));

  // Print mode per region: 0 lines, 1 stipple. Mixed mode stipples the bottom
  // through a noisy border; the lens flips whatever is under it.
  float field = noise(uv * vec2(2.2, 2.8) + u_frame.w * 1.37);
  float m = smoothstep(0.5, 0.18, uv.y + (field - 0.5) * 0.55);
  m = clamp(m * min(u_print.y, 1.0) + max(u_print.y - 1.0, 0.0), 0.0, 1.0);
  m = mix(m, 1.0 - m, lens);

  // Scanlines: thickness follows the tone, edges chewed by noise.
  float across = abs(fract(ly / sp) - 0.5) * 2.0;
  float rag = (noise(vec2(frag.x / (dpr * 2.5), row * 1.7)) - 0.5) * 0.45;
  float th = clamp(pow(tone, 0.8) * 1.05 + rag * tone, 0.0, 1.0);
  float aa = 1.4 / sp;
  float lines = 1.0 - smoothstep(th - aa, th + aa, across);
  float dotPx = max(1.0, floor(u_print.z * dpr + 0.5));
  vec2 cell = floor(frag / dotPx);
  lines *= step(0.1, hash(cell + 7.3)) * step(0.015, tone);

  // Stipple: a white-noise dither. It boils under the lens.
  float boil = floor(time * 10.0) * step(0.25, lens);
  float stipple = step(hash(cell + boil * vec2(17.0, 31.0)), pow(tone, 1.3) * 1.04);

  float lit = hash(cell + 91.0) < m ? stipple : lines;

  // Paper: grain, a faint ghost of the picture, the frame behind the ink.
  float grain = u_post.x;
  vec3 paper = u_bg * (1.0 - grain * 0.35 + grain * 0.7 * hash(cell + 5.0));
  paper += u_bg * (noise(frag / (dpr * 40.0)) - 0.5) * grain * 0.6;
  paper += u_ink * tone * 0.1;
  if (u_frame.z > 0.0) {
    vec2 edge = min(frag, res - frag) / dpr;
    float d = abs(min(edge.x, edge.y) - u_frame.z);
    float inside = step(u_frame.z - 1.0, min(edge.x, edge.y));
    paper = mix(paper, u_frameColor, (1.0 - smoothstep(0.5, 1.3, d)) * inside * 0.9);
  }

  vec3 ink = mix(u_ink * 0.5, u_ink, smoothstep(0.08, 0.55, tone));
  ink = mix(ink, u_hot, smoothstep(0.7, 1.0, tone) * 0.75 + lens * 0.15);
  vec3 col = mix(paper, ink, lit);

  // The scan fronts glow as they pass.
  float introFront = u_fx.z * 1.2 - 0.1;
  float swapFront = u_fx.y * 1.2 - 0.1;
  col += u_hot * 0.55 * lines * exp(-abs(fromTop - introFront) * 60.0) * step(u_fx.z, 0.999);
  col += u_hot * 0.55 * lines * exp(-abs(fromTop - swapFront) * 60.0) * swapping;

  // The loupe's edge: a dashed ring that turns slowly.
  float ringD = abs(length(pd) - R * 0.9);
  float dash = step(0.5, fract(atan(pd.y, pd.x) * 3.8197 + time * 0.15));
  float ring = u_pointer.z * (1.0 - smoothstep(0.4, 1.2, ringD)) * dash * step(1.0, u_fx.x);
  col = mix(col, u_hot, ring * 0.75);

  float vd = length(uv - 0.5) * 1.41421356;
  col *= 1.0 - u_post.y * smoothstep(0.4, 1.05, vd);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compile(gl: WebGLRenderingContext, vert: string, frag: string) {
  const program = gl.createProgram()
  if (!program) return null
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vert],
    [gl.FRAGMENT_SHADER, frag],
  ] as const) {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      gl.deleteProgram(program)
      return null
    }
    gl.attachShader(program, shader)
    // Flagged for deletion; freed with the program.
    gl.deleteShader(shader)
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return reduced
}

const INTRO_MS = 1700
const REBLOOM_MS = 1300
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)

export default function ScanlineBloom({
  src,
  seed = 7,
  ink = "#e3161f",
  highlight = "#ff6a4f",
  background = "#0b0909",
  mode = "mixed",
  lineSpacing = 5,
  dotSize = 1.6,
  frame = true,
  frameInset = 18,
  frameColor,
  lensRadius = 150,
  glitch = 0.3,
  sway = 1,
  scanSpeed = 5,
  grain = 0.5,
  vignette = 0.35,
  interactive = true,
  onBloom,
  paused = false,
  label = "Red lilies and roses printed in scanlines on black paper",
  height = "100svh",
  className = "",
  children,
}: ScanlineBloomProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()
  const [generation, setGeneration] = React.useState(0)
  const [failed, setFailed] = React.useState(false)

  // The render loop reads props through a ref, so tweaking one never restarts
  // WebGL.
  const settings = {
    ink,
    highlight,
    background,
    frameColor: frameColor ?? ink,
    mode,
    lineSpacing,
    dotSize,
    frame,
    frameInset,
    lensRadius,
    glitch,
    sway,
    scanSpeed,
    grain,
    vignette,
    seed,
    paused,
  }
  const settingsRef = React.useRef(settings)
  settingsRef.current = settings
  const onBloomRef = React.useRef(onBloom)
  onBloomRef.current = onBloom
  const kickRef = React.useRef(() => {})
  const bloomRef = React.useRef<(to?: number) => void>(() => {})

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false })
    if (!gl) {
      setFailed(true)
      return
    }
    const program = compile(gl, VERT, FRAG)
    if (!program) {
      setFailed(true)
      return
    }

    // One triangle that covers the viewport; cheaper than a quad's diagonal.
    const triangleBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.useProgram(program)

    const u = (name: string) => gl.getUniformLocation(program, name)
    const loc = {
      texA: u("u_texA"),
      texB: u("u_texB"),
      scene: u("u_scene"),
      pointer: u("u_pointer"),
      print: u("u_print"),
      fx: u("u_fx"),
      frame: u("u_frame"),
      post: u("u_post"),
      ink: u("u_ink"),
      hot: u("u_hot"),
      bg: u("u_bg"),
      frameColor: u("u_frameColor"),
    }
    gl.uniform1i(loc.texA, 0)
    gl.uniform1i(loc.texB, 1)

    const makeTexture = () => {
      const tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
      return tex
    }
    // A shows; B is the bouquet scanning in over it.
    let texA = makeTexture()
    let texB = makeTexture()
    let aspectA = 1
    let aspectB = 1
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    const upload = (tex: WebGLTexture | null, source: TexImageSource) => {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    }

    const painter = document.createElement("canvas")
    let image: HTMLImageElement | null = null
    let paintedW = 0
    let paintedH = 0
    let current = settingsRef.current.seed

    const paintInto = (tex: WebGLTexture | null, bouquetSeed: number) => {
      if (image) {
        upload(tex, image)
        return image.naturalWidth / Math.max(1, image.naturalHeight)
      }
      const dpr = window.devicePixelRatio || 1
      const [w, h] = paintSize(canvas.clientWidth || 1, canvas.clientHeight || 1, dpr)
      paintBouquet(painter, w, h, bouquetSeed)
      paintedW = w
      paintedH = h
      upload(tex, painter)
      return w / h
    }

    const pointer = { x: 0, y: 0, inside: false, speed: 0, lastX: 0, lastY: 0, lastT: 0 }
    let presence = 0
    let tear = 0
    let time = 0
    let scan = 0
    let last = 0
    let raf = 0
    let introStart = -1
    let swapStart = -1
    let swapTo = current

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    // Repaint the painted bouquet when the box changes shape or grows a lot;
    // the layout is aspect-aware, so a stretched old painting would look off.
    let repaintTimer = 0
    const maybeRepaint = () => {
      if (image || !paintedW) return
      const [w, h] = paintSize(canvas.clientWidth || 1, canvas.clientHeight || 1, window.devicePixelRatio || 1)
      const aspectDrift = Math.abs(w / h - paintedW / paintedH) / (paintedW / paintedH)
      if (aspectDrift < 0.04 && w <= paintedW * 1.25) return
      window.clearTimeout(repaintTimer)
      repaintTimer = window.setTimeout(() => {
        aspectA = paintInto(texA, current)
        kick()
      }, 160)
    }

    const draw = (now: number) => {
      raf = 0
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016
      last = now
      resize()

      const s = settingsRef.current
      const moving = !reduced && !s.paused
      if (moving) {
        time += dt
        scan = (scan + dt * s.scanSpeed) % (Math.max(s.lineSpacing, 1) * 240)
      }

      if (introStart < 0) introStart = now
      const intro = reduced ? 1 : Math.min(1, (now - introStart) / INTRO_MS)
      let swap = 1
      if (swapStart >= 0) {
        swap = reduced ? 1 : Math.min(1, (now - swapStart) / REBLOOM_MS)
        if (swap >= 1) {
          // B has fully scanned in: it becomes A.
          const t = texA
          texA = texB
          texB = t
          aspectA = aspectB
          current = swapTo
          swapStart = -1
          onBloomRef.current?.(current)
        }
      }

      presence += ((pointer.inside ? 1 : 0) - presence) * (reduced ? 1 : 1 - Math.exp(-dt / 0.18))
      pointer.speed *= Math.exp(-dt / 0.12)
      const tearTarget = reduced ? 0 : Math.min(1, s.glitch * 0.25 + pointer.speed / 2600)
      tear += (tearTarget - tear) * (1 - Math.exp(-dt / 0.08))

      const dpr = canvas.width / Math.max(1, canvas.clientWidth)
      const modeCode = s.mode === "lines" ? 0 : s.mode === "stipple" ? 2 : 1

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texA)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, texB)
      gl.uniform4f(loc.scene, canvas.width, canvas.height, time, dpr)
      gl.uniform4f(loc.pointer, pointer.x * dpr, (canvas.clientHeight - pointer.y) * dpr, presence, tear)
      gl.uniform4f(loc.print, s.lineSpacing, modeCode, s.dotSize, reduced ? 0 : s.sway)
      gl.uniform4f(loc.fx, s.lensRadius, ease(swap), ease(intro), scan)
      gl.uniform4f(loc.frame, aspectA, aspectB, s.frame ? s.frameInset : 0, s.seed % 97)
      gl.uniform4f(loc.post, s.grain, s.vignette, 0, 0)
      gl.uniform3fv(loc.ink, hexToRgb(s.ink))
      gl.uniform3fv(loc.hot, hexToRgb(s.highlight))
      gl.uniform3fv(loc.bg, hexToRgb(s.background))
      gl.uniform3fv(loc.frameColor, hexToRgb(s.frameColor))
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      const settling =
        intro < 1 || swapStart >= 0 || Math.abs((pointer.inside ? 1 : 0) - presence) > 0.002 || Math.abs(tear - tearTarget) > 0.002
      if ((moving || settling) && !document.hidden) raf = requestAnimationFrame(draw)
    }

    const kick = () => {
      if (!raf && !document.hidden) raf = requestAnimationFrame(draw)
    }

    // Scan a new bouquet in over the current one.
    const bloom = (to?: number) => {
      if (swapStart >= 0) return
      swapTo = to ?? nextSeed(current)
      aspectB = paintInto(texB, swapTo)
      swapStart = performance.now()
      kick()
    }

    aspectA = paintInto(texA, current)
    kick()
    kickRef.current = kick
    bloomRef.current = bloom

    if (src) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.decoding = "async"
      img.onload = () => {
        image = img
        try {
          aspectA = paintInto(texA, current)
          introStart = -1
        } catch {
          // A tainted (non-CORS) image cannot be uploaded; keep the bouquet.
          image = null
        }
        kick()
      }
      img.src = src
    }

    const observer = new ResizeObserver(() => {
      maybeRepaint()
      kick()
    })
    observer.observe(canvas)

    // Children sit above the canvas and would swallow its pointer events, so
    // track the pointer on the window and map it in.
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      pointer.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      pointer.x = e.clientX - r.left
      pointer.y = e.clientY - r.top
      const now = e.timeStamp || performance.now()
      if (pointer.lastT && now > pointer.lastT) {
        const v = Math.hypot(e.clientX - pointer.lastX, e.clientY - pointer.lastY) / ((now - pointer.lastT) / 1000)
        if (pointer.inside) pointer.speed = Math.max(pointer.speed, Math.min(v, 6000))
      }
      pointer.lastX = e.clientX
      pointer.lastY = e.clientY
      pointer.lastT = now
      kick()
    }
    const onLeave = () => {
      pointer.inside = false
      kick()
    }
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else {
        last = 0
        kick()
      }
    }
    // A lost context leaves a permanently black canvas unless the whole setup
    // runs again, so ask for the restore and rebuild on the next generation.
    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onRestored = () => setGeneration((g) => g + 1)

    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    document.addEventListener("visibilitychange", onVisibility)
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    return () => {
      kickRef.current = () => {}
      bloomRef.current = () => {}
      cancelAnimationFrame(raf)
      window.clearTimeout(repaintTimer)
      observer.disconnect()
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      document.removeEventListener("visibilitychange", onVisibility)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      gl.deleteTexture(texA)
      gl.deleteTexture(texB)
      gl.deleteBuffer(triangleBuffer)
      gl.deleteProgram(program)
    }
    // settingsRef carries every other prop; only these need a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, generation, src])

  // A new seed prop scans its bouquet in; the first render already painted it.
  const seenSeed = React.useRef(seed)
  React.useEffect(() => {
    if (seenSeed.current === seed) return
    seenSeed.current = seed
    bloomRef.current(seed)
  }, [seed])

  // A re-render may have changed props while the loop is idle (paused, reduced
  // motion); kick() is a no-op when a frame is already queued.
  React.useEffect(() => kickRef.current())

  const onClick = (e: React.MouseEvent) => {
    if (!interactive) return
    // Links and buttons among the children keep their own clicks.
    const target = e.target as HTMLElement
    if (target.closest("a, button, input, select, textarea, label, [data-no-bloom]")) return
    bloomRef.current()
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive || (e.key !== "Enter" && e.key !== " ")) return
    e.preventDefault()
    bloomRef.current()
  }

  return (
    <section
      className={"relative w-full overflow-hidden " + (interactive ? "cursor-crosshair " : "") + className}
      style={{ height, background }}
      onClick={onClick}
    >
      {failed ? (
        // No WebGL: scanlines in CSS over a soft red bloom, and the frame.
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(0deg, " + background + " 0 3px, transparent 3px 5px), " +
              "radial-gradient(ellipse at 45% 45%, " + ink + " 0%, " + background + " 62%)",
            boxShadow: frame ? "inset 0 0 0 " + frameInset + "px " + background + ", inset 0 0 0 " + (frameInset + 1.5) + "px " + (frameColor ?? ink) : undefined,
          }}
        />
      ) : (
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block h-full w-full" />
      )}

      <div
        role={interactive ? "button" : "img"}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? label + ". Press Enter to rebloom." : label}
        onKeyDown={onKeyDown}
        className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset"
        style={{ ["--tw-ring-color" as string]: ink }}
      />

      {children && <div className="pointer-events-none absolute inset-0 z-10 [&>*]:pointer-events-auto">{children}</div>}
    </section>
  )
}
