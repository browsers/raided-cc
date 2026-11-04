import { NextResponse } from "next/server";
import { getAuth } from "../../../lib/auth";
import { getDB } from "../../../lib/db";
import { getBucket, mediaUrl, sniffImage } from "../../../lib/r2";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

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
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();
  const kind = sniffImage(new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength)));
  if (!kind) {
    return NextResponse.json({ error: "Use a PNG, JPG, GIF or WebP image." }, { status: 415 });
  }

  const bucket = getBucket();
  const db = getDB();
  const key = `avatars/${userId}-${Date.now()}.${kind.ext}`;

  await bucket.put(key, bytes, { httpMetadata: { contentType: kind.mime } });

  // Remember the old file so it can be cleaned up once the new one is saved.
  const old = await db
    .prepare("SELECT avatar_key FROM profiles WHERE user_id = ?")
    .bind(userId)
    .first<{ avatar_key: string | null }>();

  const url = mediaUrl(key);
  // user.image is what the dock, the dashboard pill and the profile page all read.
  await db
    .prepare('UPDATE "user" SET image = ?, "updatedAt" = ? WHERE id = ?')
    .bind(url, new Date().toISOString(), userId)
    .run();
  await db
    .prepare(
      "INSERT INTO profiles (user_id, avatar_key) VALUES (?, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET avatar_key = excluded.avatar_key, updated_at = strftime('%s','now')",
    )
    .bind(userId, key)
    .run();

  if (old?.avatar_key && old.avatar_key !== key) {
    try { await bucket.delete(old.avatar_key); } catch {}
  }

  return NextResponse.json({ ok: true, url });
}
