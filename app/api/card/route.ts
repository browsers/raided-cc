import { NextResponse } from "next/server";
import { getAuth } from "../../../lib/auth";
import { getDB } from "../../../lib/db";
import { cardOpacityFrom, parseSettings } from "../../../lib/profile-settings";

export const dynamic = "force-dynamic";

// Saves card settings (for now just opacity) into profiles.settings.
export async function POST(req: Request) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { opacity?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const raw = Number(body.opacity);
  if (!Number.isFinite(raw)) {
    return NextResponse.json({ error: "Opacity must be a number." }, { status: 400 });
  }
  const opacity = cardOpacityFrom({ cardOpacity: raw });

  const db = getDB();
  const userId = session.user.id;
  const row = await db
    .prepare("SELECT settings FROM profiles WHERE user_id = ?")
    .bind(userId)
    .first<{ settings: string | null }>();

  const next = JSON.stringify({ ...parseSettings(row?.settings), cardOpacity: opacity });
  await db
    .prepare(
      "INSERT INTO profiles (user_id, settings) VALUES (?, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET settings = excluded.settings, updated_at = strftime('%s','now')",
    )
    .bind(userId, next)
    .run();

  return NextResponse.json({ ok: true, opacity });
}
