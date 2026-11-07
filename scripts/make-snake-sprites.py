#!/usr/bin/env python3
"""Draws the snake pet sprite sheet -> public/pet/snake.png

Same look as the cat sheet: white fill, 1px black outline, transparent
background (so the colour tint in the Miscs tab works on it too).

Layout: 256x128, an 8x4 grid of 32px cells (see PETS in components/CursorPet.tsx)
  row 0: running, frame A, one cell per direction (right, down-right, down, ...)
  row 1: running, frame B (the slither wave is flipped)
  row 2: still, sit (loose coil), breathe 1, breathe 2 (full coil)

Run:  python3 scripts/make-snake-sprites.py      (needs Pillow)
"""
import math
import os
import sys

from PIL import Image

CELL = 32
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "pet", "snake.png")


# ---------- body ----------

def radius(s, length):
    """Half-width of the body at distance s from the snout."""
    if s < 2.8:  # snout -> widest part of the head
        return 1.6 + (3.4 - 1.6) * math.sin(s / 2.8 * math.pi / 2)
    if s < 5.5:  # head -> neck (clearly narrower, so you can tell head from tail)
        t = (s - 2.8) / 2.7
        return 3.4 + (1.8 - 3.4) * t
    taper_from = length * 0.5
    if s < taper_from:
        return 1.8 + 0.3 * min(1.0, (s - 5.5) / 6.0)  # belly is a touch fatter than the neck
    t = (s - taper_from) / (length - taper_from)
    return max(0.7, 2.1 * (1 - t))


def slither_path(angle, phase, length=27.0, amp=2.7, wavelength=15.0):
    """Top-down snake heading along `angle`, as samples (x, y, r, s, side)."""
    fx, fy = math.cos(angle), math.sin(angle)
    px, py = -fy, fx  # perpendicular
    # head sits half the length ahead of the cell centre so the snake is centred
    hx, hy = CELL / 2 + fx * length / 2, CELL / 2 + fy * length / 2
    pts = []
    n = int(length * 6)
    for i in range(n + 1):
        s = length * i / n
        grow = min(1.0, max(0.0, (s - 4.0) / 9.0))  # neck stays straight
        lat = amp * grow * math.sin(2 * math.pi * s / wavelength - phase)
        # keep the wave centred on the heading line
        x = hx - fx * s + px * lat
        y = hy - fy * s + py * lat
        pts.append((x, y, radius(s, length), s, lat))
    # shift so the average point is the cell centre
    mx = sum(p[0] for p in pts) / len(pts) - CELL / 2
    my = sum(p[1] for p in pts) / len(pts) - CELL / 2
    return [(x - mx, y - my, r, s, lat) for x, y, r, s, lat in pts], (fx, fy)


def spiral_path(turns, pitch=4.5, r0=3.4, tail_r=0.5, head_len=7.0, scale=1.0):
    """Coiled snake: tail in the middle, body spiralling out, head leaving the
    outside of the coil pointing down. Returns samples ordered snout -> tail."""
    body = []  # tail -> head
    theta_end = 0.0  # angle where the head leaves: right side of the coil, going down
    steps = int(turns * 360)
    for i in range(steps + 1):
        th = theta_end - (steps - i) / 360 * 2 * math.pi
        # radius grows with angle; tail end starts at r0
        k = i / steps
        rr = (r0 + pitch * turns * k) * scale
        body.append((math.cos(th) * rr, math.sin(th) * rr))
    # straight neck/head continuing downward from the coil's end
    ex, ey = body[-1]
    for j in range(1, int(head_len * 6) + 1):
        body.append((ex, ey + j / 6))
    body.reverse()  # snout first
    # arc length -> radius profile
    total = 0.0
    pts = []
    last = None
    for (x, y) in body:
        if last is not None:
            total += math.hypot(x - last[0], y - last[1])
        last = (x, y)
        pts.append([x, y, total])
    length = total
    out = []
    for x, y, s in pts:
        r = radius(s, length)
        out.append((x, y, r, s, 0.0))
    # centre: bounding box centre of the samples -> cell centre
    xs = [p[0] for p in out]
    ys = [p[1] for p in out]
    cx = (min(xs) + max(xs)) / 2
    cy = (min(ys) + max(ys)) / 2
    return [(x - cx + CELL / 2, y - cy + CELL / 2, r, s, l) for x, y, r, s, l in out], (0.0, 1.0)


# ---------- drawing ----------

def draw(pts, heading, tongue=False, eyes=True, markings=True, spacing=4.6):
    """Rasterise into a 32x32 RGBA image: white body, black outline and details."""
    fx, fy = heading
    px, py = -fy, fx
    inside = [[False] * CELL for _ in range(CELL)]
    for y in range(CELL):
        for x in range(CELL):
            cx, cy = x + 0.5, y + 0.5
            for (bx, by, r, _s, _l) in pts:
                if (cx - bx) ** 2 + (cy - by) ** 2 <= r * r:
                    inside[y][x] = True
                    break

    img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    px_ = img.load()
    WHITE, BLACK = (255, 255, 255, 255), (0, 0, 0, 255)

    def inb(x, y):
        return 0 <= x < CELL and 0 <= y < CELL

    # outline = pixels next to the body (4-neighbour, like the cat)
    for y in range(CELL):
        for x in range(CELL):
            if inside[y][x]:
                px_[x, y] = WHITE
    for y in range(CELL):
        for x in range(CELL):
            if inside[y][x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if inb(nx, ny) and inside[ny][nx]:
                    px_[x, y] = BLACK
                    break

    def put(x, y, c=BLACK):
        xi, yi = int(math.floor(x)), int(math.floor(y))
        if inb(xi, yi) and px_[xi, yi][3]:
            px_[xi, yi] = c

    head = pts[0]
    hx, hy = head[0], head[1]

    # back markings: a black dot every few pixels down the spine
    if markings:
        last_s = None
        for (bx, by, r, s, _l) in pts:
            if s < 8.5 or s > pts[-1][3] - 3.0:
                continue
            if last_s is None or s - last_s >= spacing:
                last_s = s
                put(bx, by)

    # eyes: two dots on the head, either side of the heading
    if eyes:
        ex, ey = hx - fx * 3.4, hy - fy * 3.4  # head is `s` behind the snout; eyes ~3px back
        # pts[0] is the snout, so go *backwards* along the body to the eyes
        ex, ey = pts[0][0] - fx * 0, pts[0][1] - fy * 0
        # find the sample ~3px along the body for a better eye position on curved coils
        for (bx, by, r, s, _l) in pts:
            if s >= 3.2:
                ex, ey = bx, by
                break
        put(ex + px * 1.7, ey + py * 1.7)
        put(ex - px * 1.7, ey - py * 1.7)

    # forked tongue, poking out ahead of the snout
    if tongue:
        tx, ty = hx + fx * 1.8, hy + fy * 1.8
        for k in range(3):
            xx, yy = int(math.floor(tx + fx * k)), int(math.floor(ty + fy * k))
            if inb(xx, yy):
                px_[xx, yy] = BLACK
        fx_, fy_ = tx + fx * 3, ty + fy * 3
        for sgn in (-1, 1):
            xx, yy = int(math.floor(fx_ + px * sgn)), int(math.floor(fy_ + py * sgn))
            if inb(xx, yy):
                px_[xx, yy] = BLACK
    return img


def main():
    sheet = Image.new("RGBA", (CELL * 8, CELL * 4), (0, 0, 0, 0))

    def paste(img, col, row):
        sheet.alpha_composite(img, (col * CELL, row * CELL))

    # running: 8 directions x 2 frames (wave flipped), tongue flicks on frame B
    for d in range(8):
        ang = d * math.pi / 4
        for f in range(2):
            pts, hd = slither_path(ang, phase=f * math.pi)
            paste(draw(pts, hd, tongue=(f == 1), eyes=True), d, f)

    # still: stopped, head down, body barely curved
    pts, hd = slither_path(math.pi / 2, phase=math.pi / 2, amp=1.2)
    paste(draw(pts, hd, tongue=False), 0, 2)
    # sit: loose coil settling
    pts, hd = spiral_path(turns=1.1, pitch=4.6, head_len=8.0)
    paste(draw(pts, hd, tongue=False, spacing=5.5), 1, 2)
    # breathe: full coil, expands a hair on frame 2, tongue flick
    pts, hd = spiral_path(turns=1.9, pitch=4.4, head_len=6.0, scale=1.0)
    paste(draw(pts, hd, tongue=False, spacing=5.5), 2, 2)
    pts, hd = spiral_path(turns=1.9, pitch=4.5, head_len=6.0, scale=1.015)
    paste(draw(pts, hd, tongue=True, spacing=5.5), 3, 2)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    sheet.save(OUT)
    print("wrote", os.path.abspath(OUT), sheet.size)


if __name__ == "__main__":
    sys.exit(main())
