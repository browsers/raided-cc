// Password hashing for Cloudflare Workers using the built-in Web Crypto API.
//
// Better Auth's default hasher (scrypt in plain JS) uses far more CPU than
// the Workers free plan allows, so signups would fail there. PBKDF2 runs
// natively and is fast enough. 100,000 iterations is the most Workers allow
// for PBKDF2 as far as I could verify. The iteration count is stored in the
// hash string, so we can raise it later without breaking old passwords.

const ITERATIONS = 100_000;
const KEY_BITS = 256;

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2-sha256$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const [scheme, iterStr, saltB64, hashB64] = hash.split("$");
  const iterations = Number(iterStr);
  if (scheme !== "pbkdf2-sha256" || !Number.isInteger(iterations) || !saltB64 || !hashB64) {
    return false;
  }
  const expected = fromB64(hashB64);
  const actual = await derive(password, fromB64(saltB64), iterations);
  if (actual.length !== expected.length) return false;
  // Constant-time compare so timing doesn't leak how many bytes matched.
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
