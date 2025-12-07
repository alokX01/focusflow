// app/dashboard/page.tsx
"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

import { Header } from "@/components/header";

const TimerInterface = dynamic(
  () => import("@/components/timer-interface").then((m) => m.TimerInterface),
  { ssr: false }
);

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="px-4 pb-10 pt-4 md:px-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          {/* Greeting + philosophy */}
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {firstName}
              </span>
              .
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              When the timer runs, you focus. When it stops, you step away.
              Short breaks keep you sharp, long breaks reset you fully.
            </p>
          </section>

          {/* Timer card */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl border bg-card/90 p-4 shadow-sm"
          >
            <TimerInterface
              onSessionComplete={() => {
                // Optionally: show a toast or trigger refetch here
                console.log("Session completed callback from dashboard");
              }}
            />
          </motion.section>
        </div>
      </main>
    </div>
  );
}
