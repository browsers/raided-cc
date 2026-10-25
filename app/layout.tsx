import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "raided.cc",
  description: "raided.cc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
