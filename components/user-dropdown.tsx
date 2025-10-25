"use client"

import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LogOut,
  LogIn,
  UserPlus,
  ChevronDown,
  User,
  Moon,
  Sun,
  Laptop,
  Settings,
  Award,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"

export function UserDropdown() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    setIsLoading(true)
    setIsOpen(false)
    
    try {
      await signOut({ 
        redirect: false,
        callbackUrl: "/" 
      })
      
      router.push("/")
      router.refresh()
      
    } catch (error) {
      console.error("Sign out error:", error)
      window.location.href = "/"
    }
  }

  // Loading state
  if (status === "loading") {
    return <div className="h-10 w-10 animate-pulse bg-muted rounded-full" />
  }

  // Not authenticated - show sign in/up buttons
  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/signin">
          <Button variant="ghost" size="sm">
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Button>
        </Link>
        <Link href="/auth/signup">
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <UserPlus className="w-4 h-4 mr-2" />
            Get Started
          </Button>
        </Link>
      </div>
    )
  }

  // Generate initials
  const userInitials = session.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || session.user?.email?.charAt(0).toUpperCase() || "U"

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        variant="ghost"
        className="relative h-10 rounded-full px-2 hover:bg-accent/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={session.user?.image || ""} 
              alt={session.user?.name || "User"} 
            />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-medium max-w-[150px] truncate">
            {session.user?.name || session.user?.email?.split("@")[0]}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-xl bg-background border border-border z-[100] overflow-hidden">
          {/* User Info Header */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-background">
                <AvatarImage src={session.user?.image || ""} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {session.user?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link 
              href="/profile" 
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm hover:bg-accent transition-colors cursor-pointer group"
            >
              <User className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
              <span>My Profile</span>
            </Link>

            <Link 
              href="/dashboard" 
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm hover:bg-accent transition-colors cursor-pointer group"
            >
              <TrendingUp className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
              <span>Dashboard</span>
            </Link>

            <Link 
              href="/achievements" 
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm hover:bg-accent transition-colors cursor-pointer group"
            >
              <Award className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
              <span>Achievements</span>
            </Link>

            <Link 
              href="/preferences" 
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm hover:bg-accent transition-colors cursor-pointer group"
            >
              <Settings className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
              <span>Preferences</span>
            </Link>
          </div>

          {/* Theme Section */}
          <div className="border-t border-border py-2">
            <div className="px-4 py-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Appearance
            </div>
            <div className="px-2">
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${
                    theme === "light" 
                      ? "bg-background shadow-sm text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="h-3 w-3" />
                  Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${
                    theme === "dark" 
                      ? "bg-background shadow-sm text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Moon className="h-3 w-3" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${
                    theme === "system" 
                      ? "bg-background shadow-sm text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Laptop className="h-3 w-3" />
                  Auto
                </button>
              </div>
            </div>
          </div>

          {/* Sign Out */}
          <div className="border-t border-border p-2">
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="flex items-center justify-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoading ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}