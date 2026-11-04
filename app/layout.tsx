import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import ConsoleBanner from "../components/ConsoleBanner";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "raided.cc",
  icons: {
    icon: "/icon1.png"
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.className}>
      <body>
        <ConsoleBanner />
        {children}
      </body>
    </html>
  );
}