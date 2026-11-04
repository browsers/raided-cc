import { getBucket } from "../../../../lib/r2";

export const dynamic = "force-dynamic";

// Only these prefixes are public. Anything else in the bucket stays private.
const PUBLIC_PREFIXES = ["avatars/", "backgrounds/", "music/"];

const BASE_HEADERS = {
  // Keys include a timestamp, so a changed file always has a new URL.
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
  "Accept-Ranges": "bytes",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: parts } = await params;
  const key = parts.map(decodeURIComponent).join("/");

  if (key.includes("..") || !PUBLIC_PREFIXES.some((p) => key.startsWith(p))) {
    return new Response("Not found", { status: 404 });
  }

  const bucket = getBucket();
  const range = req.headers.get("range");

  // Video needs Range requests (seeking, and Safari won't play without them).
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    const head = m ? await bucket.head(key) : null;
    if (!m || !head) return new Response("Not found", { status: 404 });

    const size = head.size;
    let start: number;
    let end: number;
    if (m[1] === "" && m[2] !== "") {
      // "bytes=-500": the last 500 bytes
      start = Math.max(0, size - Number(m[2]));
      end = size - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
    }
    if (!Number.isFinite(start) || start > end || start >= size) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }

    const obj = await bucket.get(key, { range: { offset: start, length: end - start + 1 } });
    if (!obj) return new Response("Not found", { status: 404 });
    return new Response(obj.body, {
      status: 206,
      headers: {
        ...BASE_HEADERS,
        "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
        ETag: obj.httpEtag,
      },
    });
  }

  const obj = await bucket.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      ...BASE_HEADERS,
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Length": String(obj.size),
      ETag: obj.httpEtag,
    },
  });
}
