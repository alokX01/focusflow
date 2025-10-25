"use client"

import { Header } from "@/components/header"
import { TimerInterface } from "@/components/timer-interface"
import { useSession } from "next-auth/react"

export default function FocusPage() {
  const { status } = useSession()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-4">
        {status !== "authenticated" && (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            You’re using demo mode. Sign in to save your sessions.
          </div>
        )}
        <TimerInterface />
      </main>
    </div>
  )
}