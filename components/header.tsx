"use client"

import { Button } from "@/components/ui/button"
import { Settings, BarChart3, History, Camera } from "lucide-react"
import Link from "next/link"
import { UserDropdown } from "@/components/user-dropdown"  // ✅ Import UserDropdown
import { useSession } from "next-auth/react"
import { DarkModeToggle } from "@/components/dark-mode-toggle"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">FocusFlow</h1>
          </Link>

          <nav className="flex items-center gap-2 text-foreground">
            {/* Only show nav items on desktop when logged in */}
            {session && (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/analytics">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/history">
                      <History className="w-4 h-4 mr-2" />
                      History
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/settings">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </Button>
                </div>
              </>
            )}
            
            <DarkModeToggle />
            <UserDropdown />  {/* ✅ Use UserDropdown, not UserMenu */}
          </nav>
        </div>
      </div>
    </header>
  )
}