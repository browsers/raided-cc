import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "../../lib/auth";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "Dashboard | raided.cc",
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Signed-out visitors get sent to the login page.
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return <div className="dash">{children}</div>;
}
