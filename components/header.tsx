"use client";

import { Button } from "@/components/ui/button";
import { Settings, BarChart3, History, Camera, Menu } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { UserDropdown } from "@/components/user-dropdown";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Header() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", icon: Camera, label: "Focus" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/history", icon: History, label: "History" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              FocusFlow
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="flex items-center gap-2">
            {session && (
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Button key={item.href} variant="ghost" size="sm" asChild>
                    <Link href={item.href} className="gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </Button>
                ))}
              </div>
            )}

            <DarkModeToggle />

            {/* Mobile Menu - FIX: Don't use asChild with Button */}
            {session && (
              <div className="md:hidden">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-64">
                    <div className="flex flex-col gap-2 mt-8">
                      {navItems.map((item) => (
                        <Button
                          key={item.href}
                          variant="ghost"
                          className="justify-start gap-2"
                          asChild
                        >
                          <Link
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}

            <UserDropdown />
          </nav>
        </div>
      </div>
    </header>
  );
}
