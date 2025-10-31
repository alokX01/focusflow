"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/contexts/settings-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SettingsProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </SettingsProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
