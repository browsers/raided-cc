import { getCloudflareContext } from "@opennextjs/cloudflare";

// Minimal shape of the R2 binding (same idea as lib/db.ts, no extra types needed).
export type R2Object = {
  body: ReadableStream;
  size: number; // full object size, even for a ranged read
  httpEtag: string;
  httpMetadata?: { contentType?: string };
};
export type R2 = {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<R2Object | null>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
};

export function getBucket(): R2 {
  return (getCloudflareContext().env as unknown as { BUCKET: R2 }).BUCKET;
}

/** URL the browser uses to load an R2 object (served by /api/media). */
export const mediaUrl = (key: string) => `/api/media/${key}`;

export type ImageKind = { mime: string; ext: string };

/** Identify an image by its first bytes. The browser's Content-Type is never trusted. */
export function sniffImage(b: Uint8Array): ImageKind | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { mime: "image/gif", ext: "gif" };
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return { mime: "image/webp", ext: "webp" };
  return null;
}

export type MediaKind = ImageKind & { kind: "image" | "video" };

/** Image or video (MP4 / WebM), identified by first bytes. */
export function sniffMedia(b: Uint8Array): MediaKind | null {
  const img = sniffImage(b);
  if (img) return { ...img, kind: "image" };
  // MP4 / MOV: "ftyp" at byte 4
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    return { mime: "video/mp4", ext: "mp4", kind: "video" };
  }
  // WebM / Matroska: EBML header
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return { mime: "video/webm", ext: "webm", kind: "video" };
  }
  return null;
}

export type Background = { url: string; kind: "image" | "video" };

/** Background for a profile, or null. Kind comes from the file extension in the key. */
export function backgroundFromKey(key: string | null | undefined): Background | null {
  if (!key) return null;
  const video = /\.(mp4|webm)$/i.test(key);
  return { url: mediaUrl(key), kind: video ? "video" : "image" };
}
