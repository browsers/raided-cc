import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AvatarCache = {
  url: string | null;
  expires: number;
};

let cache: AvatarCache | null = null;

async function readEnv(name: string) {
  if (process.env[name]) return process.env[name];
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    const value = (context.env as Record<string, unknown>)[name];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

function respond(url: string | null, maxAge: number) {
  return NextResponse.json(
    { avatarUrl: url },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      },
    },
  );
}

export async function GET() {
  const token = await readEnv("DISCORD_BOT_TOKEN");
  const userId = await readEnv("DISCORD_USER_ID");

  if (!token || !userId) {
    return respond(null, 0);
  }

  const now = Date.now();
  if (cache && cache.expires > now) {
    return respond(cache.url, 60);
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/users/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bot ${token}`,
          "User-Agent": "raided.cc/1.0",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Discord returned ${response.status}`);
    }

    const user = (await response.json()) as {
      id: string;
      avatar: string | null;
    };

    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${
          user.avatar.startsWith("a_") ? "gif" : "png"
        }?size=512`
      : null;

    cache = { url: avatarUrl, expires: now + 60_000 };
    return respond(avatarUrl, 60);
  } catch {
    if (cache) return respond(cache.url, 30);
    return respond(null, 0);
  }
}
