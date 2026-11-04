import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hashPassword, verifyPassword } from "./password";

// Minimal shape of the D1 binding. Declared here so the project doesn't need
// the Cloudflare type package just to build.
type D1 = {
  prepare(query: string): {
    bind(...values: unknown[]): { run(): Promise<unknown> };
  };
};

type AuthEnv = {
  DB: D1;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
};

// Names that would collide with real pages (raided.cc/<username> is a profile).
const RESERVED = new Set([
  "admin", "api", "app", "assets", "dashboard", "login", "logout", "signup",
  "register", "settings", "support", "help", "about", "terms", "privacy",
  "leaderboard", "features", "components", "status", "raided", "staff",
]);

function build(env: AuthEnv) {
  return betterAuth({
    // Better Auth talks to the D1 binding directly. Cast because its types
    // expect Cloudflare's own D1Database type, which we don't install.
    database: env.DB as never,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 24,
        usernameValidator: (name: string) =>
          /^[a-z0-9._-]+$/.test(name) && !RESERVED.has(name),
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          // Every new account gets an empty profile row and the next UID.
          after: async (user: { id: string }) => {
            await env.DB
              .prepare("INSERT OR IGNORE INTO profiles (user_id) VALUES (?)")
              .bind(user.id)
              .run();
            // AUTOINCREMENT hands out 1, 2, 3, ... in signup order
            // (try/catch so signup can never fail over this, e.g. before the
            // migration is applied; the migration backfills anyone missed)
            try {
              await env.DB
                .prepare("INSERT OR IGNORE INTO user_uids (user_id) VALUES (?)")
                .bind(user.id)
                .run();
            } catch {}
          },
        },
      },
    },
  });
}

type Auth = ReturnType<typeof build>;
let cached: { db: D1; auth: Auth } | undefined;

/** Returns the auth instance, built once per Worker instance. */
export function getAuth(): Auth {
  const env = getCloudflareContext().env as unknown as AuthEnv;
  if (!cached || cached.db !== env.DB) {
    cached = { db: env.DB, auth: build(env) };
  }
  return cached.auth;
}
