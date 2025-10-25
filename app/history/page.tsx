import { HistoryInterface } from "@/components/history-interface"
import { Header } from "@/components/header"

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Session History</h1>
          <p className="text-muted-foreground">Track your focus journey and see how you've improved over time</p>
        </div>
        <HistoryInterface />
      </main>
    </div>
  )
}
