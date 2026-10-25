export type UploadKind = "avatar" | "background";

/**
 * Uploads an image to R2 and returns its public URL.
 * Save that URL to the user's profile row afterwards.
 */
export async function uploadImage(
  file: File,
  kind: UploadKind,
  accessToken: string
): Promise<string> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ kind, contentType: file.type, size: file.size }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed.");

  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error("The image could not be saved. Try again.");

  return data.publicUrl as string;
}
