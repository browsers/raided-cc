import { headers } from "next/headers";
import DashboardShell from "../../components/DashboardShell";
import { getAuth } from "../../lib/auth";

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

  return (
    <DashboardShell
      username={username}
      displayName={displayName}
      image={user?.image ?? null}
    />
  );
}