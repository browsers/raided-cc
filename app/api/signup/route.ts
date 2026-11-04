import { NextResponse } from "next/server";
import { getAuth } from "../../../lib/auth";

export const dynamic = "force-dynamic";

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

async function verifyTurnstile(token: string, ip: string | null, secret: string) {
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

// Turns Better Auth's error into something worth showing on the form.
function friendlyError(code: string, message: string) {
  const text = `${code} ${message}`.toLowerCase();
  if (text.includes("username") && (text.includes("taken") || text.includes("already"))) {
    return "That username is taken.";
  }
  if (text.includes("username")) return "That username isn't available.";
  if (text.includes("already exists") || (text.includes("email") && text.includes("already"))) {
    return "An account with that email already exists.";
  }
  if (text.includes("password")) return message || "That password isn't allowed.";
  return "Couldn't create your account. Please try again.";
}

export async function POST(req: Request) {
  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const { username, email, password, turnstileToken } = data as Record<string, string>;

  if (!turnstileToken) {
    return NextResponse.json(
      { error: "Please complete the verification." },
      { status: 400 },
    );
  }

  const secret = await readEnv("TURNSTILE_SECRET_KEY");
  if (!secret) {
    return NextResponse.json(
      { error: "Verification isn't configured on the server." },
      { status: 500 },
    );
  }

  const ok = await verifyTurnstile(
    turnstileToken,
    req.headers.get("CF-Connecting-IP"),
    secret,
  );
  if (!ok) {
    return NextResponse.json(
      { error: "Verification failed, please try again." },
      { status: 400 },
    );
  }

  if (!/^[a-z0-9._-]{3,24}$/.test(username ?? "")) {
    return NextResponse.json({ error: "Invalid username." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "")) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  if ((password ?? "").length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const authRes = await getAuth().api.signUpEmail({
      body: { name: username, email, password, username },
      headers: req.headers,
      asResponse: true,
    });

    if (!authRes.ok) {
      const err = (await authRes.json().catch(() => ({}))) as {
        code?: string;
        message?: string;
      };
      return NextResponse.json(
        { error: friendlyError(err.code ?? "", err.message ?? "") },
        { status: authRes.status >= 500 ? 500 : 400 },
      );
    }

    // Signed up and signed in: pass the session cookie on to the browser.
    const res = NextResponse.json({ ok: true });
    for (const cookie of authRes.headers.getSetCookie()) {
      res.headers.append("set-cookie", cookie);
    }
    return res;
  } catch (err) {
    console.error("signup failed", err);
    return NextResponse.json(
      { error: "Couldn't create your account. Please try again." },
      { status: 500 },
    );
  }
}