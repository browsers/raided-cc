import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_BYTES = {
  avatar: 2 * 1024 * 1024,
  background: 8 * 1024 * 1024,
} as const;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  // 1. Only signed-in users can upload.
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return fail("Sign in to upload.", 401);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return fail("Sign in again to upload.", 401);

  // 2. Check what they want to upload.
  let body: { kind?: string; contentType?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return fail("Send the request as JSON.", 400);
  }

  const { kind, contentType, size } = body;

  if (kind !== "avatar" && kind !== "background")
    return fail("Upload type must be avatar or background.", 400);

  const ext = contentType ? EXTENSIONS[contentType] : undefined;
  if (!contentType || !ext)
    return fail("Use a PNG, JPG, WebP or GIF image.", 400);

  if (typeof size !== "number" || size <= 0)
    return fail("Missing file size.", 400);

  if (size > MAX_BYTES[kind]) {
    const mb = MAX_BYTES[kind] / (1024 * 1024);
    return fail(`That file is too big. The limit is ${mb} MB.`, 413);
  }

  // 3. Make a short-lived upload link for one exact file.
  const key = `${data.user.id}/${kind}-${randomUUID()}.${ext}`;
  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: 60 }
  );

  return NextResponse.json({
    uploadUrl,
    publicUrl: `${R2_PUBLIC_URL}/${key}`,
  });
}
