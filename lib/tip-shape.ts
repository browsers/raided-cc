// Geometry for the tooltip bubble. The rounded box AND the pointer are drawn as
// ONE closed path, so the border runs around the whole outline with nothing
// across the join. No React in here, so it can be used (and tested) anywhere.

export const TAIL_W = 16; // width of the pointer where it meets the box
export const TAIL_H = 8; // how far the pointer sticks out below the box
export const BORDER = 1; // border thickness in px

/** Corner radius per tooltip shape setting (pill is clamped to half the height). */
export const TIP_RADIUS_PX = { rounded: 12, square: 2, pill: 999 } as const;

const n = (v: number) => String(Math.round(v * 100) / 100);

/**
 * Path for a box of w x h with a pointer centred under it, as the middle of
 * the border line. The whole drawing (border included) stays inside
 * w x (h + TAIL_H).
 */
export function tipPath(w: number, h: number, radius: number): string {
  if (!(w > 0) || !(h > 0)) return "";

  const i = BORDER / 2; // the line is drawn on the middle of the border
  const x0 = i;
  const y0 = i;
  const x1 = w - i;
  const y1 = h - i;
  const r = Math.max(0, Math.min(radius - i, (x1 - x0) / 2, (y1 - y0) / 2));

  const cx = w / 2;
  // keep the pointer on the flat part of the bottom edge, even for tiny pills
  const half = Math.max(2, Math.min(TAIL_W / 2, cx - x0 - r - 2));
  const tipY = h + TAIL_H - i;

  // Soften the point: stop a little short of it on each slanted edge and join
  // the two stops with a curve that has the point as its control.
  const k = 0.25;
  const sy = tipY - (tipY - y1) * k;
  const sx = half * k;

  return [
    `M${n(x0 + r)} ${n(y0)}`,
    `H${n(x1 - r)}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(x1)} ${n(y0 + r)}`,
    `V${n(y1 - r)}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(x1 - r)} ${n(y1)}`,
    `H${n(cx + half)}`,
    `L${n(cx + sx)} ${n(sy)}`,
    `Q${n(cx)} ${n(tipY)} ${n(cx - sx)} ${n(sy)}`,
    `L${n(cx - half)} ${n(y1)}`,
    `H${n(x0 + r)}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(x0)} ${n(y1 - r)}`,
    `V${n(y0 + r)}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(x0 + r)} ${n(y0)}`,
    "Z",
  ].join("");
}
