"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/header";

import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

const TimerInterface = dynamic(
  () => import("@/components/timer-interface").then((m) => m.TimerInterface),
  { ssr: false } // client-only to avoid SSR/hydration + dev Fast Refresh issues
);

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back
              {session?.user?.name
                ? `, ${session.user.name.split(" ")[0]}`
                : ""}
              ! 👋
            </h1>
          </div>

          <TimerInterface
            onSessionComplete={() => {
              console.log("🎉 Session completed callback!");
            }}
          />
        </motion.div>
      </main>
    </div>
  );
}
