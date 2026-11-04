import { getBucket } from "../../../../lib/r2";

export const dynamic = "force-dynamic";

// Only these prefixes are public. Anything else in the bucket stays private.
const PUBLIC_PREFIXES = ["avatars/", "backgrounds/", "music/"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: parts } = await params;
  const key = parts.map(decodeURIComponent).join("/");

  if (key.includes("..") || !PUBLIC_PREFIXES.some((p) => key.startsWith(p))) {
    return new Response("Not found", { status: 404 });
  }

  const obj = await getBucket().get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      // Keys include a timestamp, so a changed file always has a new URL.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ETag: obj.httpEtag,
    },
  });
}
