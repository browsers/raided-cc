import { NextResponse } from "next/server";
import { getAuth } from "../../../lib/auth";
import { getDB } from "../../../lib/db";
import {
  cardOpacityFrom,
  parseSettings,
  sanitizeAvatar,
  sanitizePet,
  sanitizeTooltip,
} from "../../../lib/profile-settings";

export const dynamic = "force-dynamic";

// Saves card settings into profiles.settings. Send any of:
//   { opacity, avatar, tooltip, pet }
// Each value is checked and cleaned here, so the browser can't store junk.
export async function POST(req: Request) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { opacity?: unknown; avatar?: unknown; tooltip?: unknown; pet?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.opacity !== undefined) {
    const n = Number(body.opacity);
    if (!Number.isFinite(n)) {
      return NextResponse.json({ error: "Opacity must be a number." }, { status: 400 });
    }
    patch.cardOpacity = cardOpacityFrom({ cardOpacity: n });
  }
  if (body.avatar !== undefined) patch.avatar = sanitizeAvatar(body.avatar);
  if (body.tooltip !== undefined) patch.tooltip = sanitizeTooltip(body.tooltip);
  if (body.pet !== undefined) patch.pet = sanitizePet(body.pet);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  }

  const db = getDB();
  const userId = session.user.id;
  const row = await db
    .prepare("SELECT settings FROM profiles WHERE user_id = ?")
    .bind(userId)
    .first<{ settings: string | null }>();

  const next = JSON.stringify({ ...parseSettings(row?.settings), ...patch });
  await db
    .prepare(
      "INSERT INTO profiles (user_id, settings) VALUES (?, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET settings = excluded.settings, updated_at = strftime('%s','now')",
    )
    .bind(userId, next)
    .run();

  return NextResponse.json({ ok: true });
}
