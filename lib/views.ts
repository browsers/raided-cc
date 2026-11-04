import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "./db";

/** Salted SHA-256, so the raw IP is never stored. */
async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Counts a view only the first time an IP visits a profile, then returns the
 * total. Refreshing never adds another view.
 *
 * Returns null if the tables from migrations 0002 / 0003 aren't there yet, so
 * the profile page still loads.
 */
export async function countUniqueView(userId: string): Promise<number | null> {
  try {
    const db = getDB();

    // Cloudflare puts the real visitor IP in cf-connecting-ip
    const h = await headers();
    const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();

    if (ip) {
      const env = getCloudflareContext().env as unknown as { BETTER_AUTH_SECRET?: string };
      const ipHash = await hashIp(ip, env.BETTER_AUTH_SECRET ?? "raided");

      // The primary key (user_id, ip_hash) makes a repeat visit a no-op
      const res = await db
        .prepare("INSERT OR IGNORE INTO profile_views (user_id, ip_hash) VALUES (?, ?)")
        .bind(userId, ipHash)
        .run();

      if ((res.meta?.changes ?? 0) > 0) {
        await db
          .prepare("UPDATE profiles SET views = views + 1 WHERE user_id = ?")
          .bind(userId)
          .run();
      }
    }

    const row = await db
      .prepare("SELECT views FROM profiles WHERE user_id = ?")
      .bind(userId)
      .first<{ views: number }>();
    return row?.views ?? null;
  } catch {
    return null;
  }
}
