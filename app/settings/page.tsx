import { SettingsInterface } from "@/components/settings-interface"
import { Header } from "@/components/header"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Configure your FocusFlow experience and camera preferences</p>
        </div>
        <SettingsInterface />
      </main>
    </div>
  )
}
