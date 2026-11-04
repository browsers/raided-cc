import { headers } from "next/headers";
import DashboardShell from "../../components/DashboardShell";
import { getAuth } from "../../lib/auth";
import { getDB } from "../../lib/db";

export const dynamic = "force-dynamic";

// The whole dashboard lives at /dashboard. Overview / Settings / Badges are
// tabs inside it, so the URL never changes.
export default async function DashboardPage() {
  // layout.tsx already redirects signed-out visitors; this just reads who it is.
  const session = await getAuth().api.getSession({ headers: await headers() });
  const user = session?.user as
    | { name?: string; image?: string | null; username?: string | null; displayUsername?: string | null }
    | undefined;

  const username = user?.username || user?.name || "";
  const displayName = user?.displayUsername || username;

  // Public UID (null if the user_uids table isn't there yet)
  let uid: number | null = null;
  if (session?.user?.id) {
    try {
      const row = await getDB()
        .prepare("SELECT uid FROM user_uids WHERE user_id = ?")
        .bind(session.user.id)
        .first<{ uid: number }>();
      uid = row?.uid ?? null;
    } catch {}
  }

  return (
    <DashboardShell
      username={username}
      displayName={displayName}
      image={user?.image ?? null}
      uid={uid}
    />
  );
}