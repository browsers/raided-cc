import { getCloudflareContext } from "@opennextjs/cloudflare";

// Minimal shape of the D1 binding (same idea as in lib/auth.ts).
type Stmt = {
  bind(...values: unknown[]): Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number } }>;
};
export type D1 = { prepare(query: string): Stmt };

export function getDB(): D1 {
  return (getCloudflareContext().env as unknown as { DB: D1 }).DB;
}
