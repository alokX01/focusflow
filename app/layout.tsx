import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Providers } from "./providers"; // ← CRITICAL: Import Providers
import "./globals.css";

export const metadata: Metadata = {
  title: "FocusFlow - Master Your Focus",
  description: "AI-powered focus tracking and productivity analytics",
  keywords: [
    "focus",
    "productivity",
    "time tracking",
    "pomodoro",
    "concentration",
  ],
  authors: [{ name: "FocusFlow" }],
  openGraph: {
    title: "FocusFlow - Master Your Focus",
    description: "AI-powered focus tracking and productivity analytics",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
