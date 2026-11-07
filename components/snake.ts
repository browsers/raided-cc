// The snake pet, drawn live (no sprite sheet) so it can be any length.
//
// The head chases the cursor and the body follows the exact path the head took,
// with a sine wave pushed sideways on top, so it slithers instead of sliding.
// When it stops it winds itself into a coil, and unwinds when it moves again.
//
// Pixel-art look: white fill, 1px black outline, drawn at 1 canvas pixel per
// sprite pixel (the canvas is scaled up with image-rendering: pixelated).

const LAMBDA = 16; // wavelength of the slither, in sprite px
const AMP = 3; // how far the body swings to each side
const WAVE_SPEED = 1.2; // 1 = wave stays put on the ground; more = it also ripples tailward
const HEAD_LEN = 7; // snout to neck, used by the coil
const PITCH = 4.8; // gap between coil layers
const COIL_R0 = 3.4; // radius of the middle of the coil
const STEP = 0.5; // distance between body samples
const TRAIL_GAP = 0.6; // world px between recorded head positions
const UNCOIL_S = 0.25; // seconds to unwind
const COIL_S = 0.7; // seconds to wind up

/** Canvas size (sprite px) that always fits a snake of this length. */
export const snakeSide = (length: number) => Math.ceil(2 * (length + 9));

/** Half-width of the body at distance s from the snout. */
function radius(s: number, L: number) {
  if (s < 2.8) return 1.6 + 1.8 * Math.sin((s / 2.8) * (Math.PI / 2)); // snout -> head
  if (s < 5.5) return 3.4 + (1.8 - 3.4) * ((s - 2.8) / 2.7); // head -> neck
  const taper = Math.min(L * 0.5, 18);
  const from = L - taper;
  if (s < from) return 1.8 + 0.3 * Math.min(1, (s - 5.5) / 6); // belly
  return Math.max(0.7, 2.1 * (1 - (s - from) / taper)); // tail
}

const smooth = (t: number) => t * t * (3 - 2 * t);

function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0xffffff;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class Snake {
  private trail: number[] = []; // x,y pairs, oldest first, in world px
  private headX = 0;
  private headY = 0;
  private fx = 0; // heading (unit vector), used to extend a body that has no trail yet
  private fy = 1;
  private phase = 0;
  private curl = 1; // 0 = stretched out, 1 = fully coiled. Starts coiled.
  private img: ImageData | null = null;

  /** Call once per frame, after the head has moved. */
  step(
    x: number,
    y: number,
    moved: number,
    ux: number,
    uy: number,
    running: boolean,
    idleMs: number,
    dt: number,
    scale: number,
    length: number,
  ) {
    this.headX = x;
    this.headY = y;

    if (running) {
      const h = Math.hypot(this.fx * 0.75 + ux * 0.25, this.fy * 0.75 + uy * 0.25) || 1;
      this.fx = (this.fx * 0.75 + ux * 0.25) / h;
      this.fy = (this.fy * 0.75 + uy * 0.25) / h;
      this.phase += (moved / scale) * ((2 * Math.PI) / LAMBDA) * WAVE_SPEED;
    }

    const t = this.trail;
    const n = t.length;
    if (n === 0 || Math.hypot(x - t[n - 2], y - t[n - 1]) >= TRAIL_GAP) t.push(x, y);
    // Only keep as much path as the body can reach
    const keep = Math.ceil((length * scale) / TRAIL_GAP) + 40;
    if (t.length / 2 > keep + 60) t.splice(0, t.length - keep * 2);

    // Wind up after standing still for a bit, unwind quickly when it moves again
    const target = !running && idleMs >= 2000 ? 1 : 0;
    this.curl =
      target === 1
        ? Math.min(1, this.curl + dt / COIL_S)
        : Math.max(0, this.curl - dt / UNCOIL_S);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    side: number,
    scale: number,
    L: number,
    color: string,
    ts: number,
    running: boolean,
  ) {
    const c = side / 2;

    // 1. The head's recent path, in sprite px relative to the head
    const px: number[] = [0];
    const py: number[] = [0];
    const cum: number[] = [0];
    const t = this.trail;
    for (let i = t.length - 2; i >= 0; i -= 2) {
      const x = (t[i] - this.headX) / scale;
      const y = (t[i + 1] - this.headY) / scale;
      const d = Math.hypot(x - px[px.length - 1], y - py[py.length - 1]);
      if (d < 0.05) continue;
      px.push(x);
      py.push(y);
      cum.push(cum[cum.length - 1] + d);
      if (cum[cum.length - 1] >= L + 2) break;
    }
    // Not enough path yet (just started): run the body straight back behind the head
    const have = cum[cum.length - 1];
    if (have < L + 2) {
      const miss = L + 2 - have;
      px.push(px[px.length - 1] - this.fx * miss);
      py.push(py[py.length - 1] - this.fy * miss);
      cum.push(L + 2);
    }
    const at = (s: number): [number, number] => {
      let lo = 0;
      let hi = cum.length - 1;
      if (s >= cum[hi]) return [px[hi], py[hi]];
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= s) lo = mid;
        else hi = mid;
      }
      const f = (s - cum[lo]) / (cum[hi] - cum[lo] || 1);
      return [px[lo] + (px[hi] - px[lo]) * f, py[lo] + (py[hi] - py[lo]) * f];
    };

    // 2. The coiled pose (head at 0,0): spiral that leaves the coil heading down
    const pitch = PITCH * (1 + 0.02 * Math.sin(ts / 450)); // breathing
    const k = pitch / (2 * Math.PI);
    const Lb = Math.max(4, L - HEAD_LEN);
    const thEnd = (-COIL_R0 + Math.sqrt(COIL_R0 * COIL_R0 + 2 * k * Lb)) / k;
    const rEnd = COIL_R0 + k * thEnd;
    const coilAt = (s: number): [number, number] => {
      if (s < HEAD_LEN) return [0, -s]; // neck, relative to the snout
      const a = Math.max(0, Lb - (s - HEAD_LEN));
      const th = (-COIL_R0 + Math.sqrt(COIL_R0 * COIL_R0 + 2 * k * a)) / k;
      const r = COIL_R0 + k * th;
      const phi = th - thEnd;
      return [r * Math.cos(phi) - rEnd, r * Math.sin(phi) - HEAD_LEN];
    };

    // 3. Body samples = stretched pose + sideways wave, blended with the coil
    const n = Math.floor(L / STEP) + 1;
    const X = new Float32Array(n);
    const Y = new Float32Array(n);
    const R = new Float32Array(n);
    const ce = smooth(this.curl);
    for (let i = 0; i < n; i++) {
      const s = i * STEP;
      const [x, y] = at(s);
      const [ax, ay] = at(Math.max(0, s - 1.2)); // towards the head
      const [bx, by] = at(s + 1.2); // towards the tail
      let tx = ax - bx;
      let ty = ay - by;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const grow = 0.25 + 0.75 * smooth(Math.min(1, Math.max(0, (s - 2) / 10)));
      const lat = AMP * grow * Math.sin((2 * Math.PI * s) / LAMBDA - this.phase);
      const sx = x - ty * lat;
      const sy = y + tx * lat;
      const [cx, cy] = coilAt(s);
      X[i] = c + sx + (cx - sx) * ce;
      Y[i] = c + sy + (cy - sy) * ce;
      R[i] = radius(s, L);
    }

    // 4. Fill: every pixel whose centre is inside a body disc
    const fill = new Uint8Array(side * side);
    for (let i = 0; i < n; i++) {
      const r = R[i];
      const y0 = Math.max(0, Math.floor(Y[i] - r));
      const y1 = Math.min(side - 1, Math.ceil(Y[i] + r));
      const x0 = Math.max(0, Math.floor(X[i] - r));
      const x1 = Math.min(side - 1, Math.ceil(X[i] + r));
      for (let y = y0; y <= y1; y++) {
        const dy = y + 0.5 - Y[i];
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - X[i];
          if (dx * dx + dy * dy <= r * r) fill[y * side + x] = 1;
        }
      }
    }

    // 5. Paint: coloured body, black outline around it
    if (!this.img || this.img.width !== side) this.img = ctx.createImageData(side, side);
    const data = this.img.data;
    data.fill(0);
    const [cr, cg, cb] = rgb(color);
    const black = (i: number) => {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    };
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const p = y * side + x;
        const o = p * 4;
        if (fill[p]) {
          data[o] = cr;
          data[o + 1] = cg;
          data[o + 2] = cb;
          data[o + 3] = 255;
        } else if (
          (x > 0 && fill[p - 1]) ||
          (x < side - 1 && fill[p + 1]) ||
          (y > 0 && fill[p - side]) ||
          (y < side - 1 && fill[p + side])
        ) {
          black(o);
        }
      }
    }
    // A detail only lands on a body pixel, so it can't float off the snake
    const dot = (x: number, y: number) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      if (xi < 0 || yi < 0 || xi >= side || yi >= side) return;
      if (fill[yi * side + xi]) black((yi * side + xi) * 4);
    };

    // Back markings: a dot every few pixels down the spine
    let last = -99;
    for (let i = 0; i < n; i++) {
      const s = i * STEP;
      if (s < 9 || s > L - 4) continue;
      if (s - last >= 4.6) {
        last = s;
        dot(X[i], Y[i]);
      }
    }

    // Direction the head is facing, from where the neck is
    const neck = Math.min(n - 1, Math.round(3 / STEP));
    let hx = X[0] - X[neck];
    let hy = Y[0] - Y[neck];
    const hl = Math.hypot(hx, hy) || 1;
    hx /= hl;
    hy /= hl;

    // Eyes: one either side of the head
    const e = Math.min(n - 1, Math.round(3.2 / STEP));
    dot(X[e] - hy * 1.7, Y[e] + hx * 1.7);
    dot(X[e] + hy * 1.7, Y[e] - hx * 1.7);

    // Forked tongue, flicking now and then (faster while it's moving)
    const flick = running ? ts % 420 < 140 : ts % 2200 < 260;
    if (flick) {
      const sx = X[0] + hx * 1.8;
      const sy = Y[0] + hy * 1.8;
      const put = (x: number, y: number) => {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        if (xi >= 0 && yi >= 0 && xi < side && yi < side) black((yi * side + xi) * 4);
      };
      for (let j = 0; j < 3; j++) put(sx + hx * j, sy + hy * j);
      put(sx + hx * 3 - hy, sy + hy * 3 + hx);
      put(sx + hx * 3 + hy, sy + hy * 3 - hx);
    }

    ctx.putImageData(this.img, 0, 0);
  }
}
