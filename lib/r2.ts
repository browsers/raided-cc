import { S3Client } from "@aws-sdk/client-s3";

// R2 speaks the S3 API. "auto" is the region Cloudflare expects.
// The two checksum settings stop newer AWS SDK versions from adding
// checksum headers that break presigned uploads to R2.
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const R2_BUCKET = process.env.R2_BUCKET ?? "raided";
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
