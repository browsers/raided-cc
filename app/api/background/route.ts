import { NextResponse } from "next/server";
import { getAuth } from "../../../lib/auth";
import { getDB } from "../../../lib/db";
import { getBucket, mediaUrl, sniffMedia } from "../../../lib/r2";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = session.user.id;

  let file: unknown;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be 25 MB or smaller." }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();
  const kind = sniffMedia(new Uint8Array(bytes, 0, Math.min(16, bytes.byteLength)));
  if (!kind) {
    return NextResponse.json(
      { error: "Use an MP4 or WebM video, or a PNG, JPG, GIF or WebP image." },
      { status: 415 },
    );
  }

  const bucket = getBucket();
  const db = getDB();
  const key = `backgrounds/${userId}-${Date.now()}.${kind.ext}`;

  await bucket.put(key, bytes, { httpMetadata: { contentType: kind.mime } });

  const old = await db
    .prepare("SELECT background_key FROM profiles WHERE user_id = ?")
    .bind(userId)
    .first<{ background_key: string | null }>();

  await db
    .prepare(
      "INSERT INTO profiles (user_id, background_key) VALUES (?, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET background_key = excluded.background_key, updated_at = strftime('%s','now')",
    )
    .bind(userId, key)
    .run();

  if (old?.background_key && old.background_key !== key) {
    try { await bucket.delete(old.background_key); } catch {}
  }

  return NextResponse.json({ ok: true, url: mediaUrl(key), kind: kind.kind });
}
