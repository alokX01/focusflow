"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingUp, Clock, Eye, Calendar, Download } from "lucide-react"
import { FocusTimeline } from "@/components/focus-timeline"
import { DistractionChart } from "@/components/distraction-chart"
import { WeeklyProgress } from "@/components/weekly-progress"
import { useAnalytics } from "@/hooks/use-analytics"
import { useState } from "react"

export function AnalyticsDashboard() {
  const { stats, loading, error, refreshStats } = useAnalytics()
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("week")

  const handlePeriodChange = async (period: "week" | "month" | "year") => {
    setSelectedPeriod(period)
    await refreshStats(period)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="text-lg text-destructive">Error: {error}</div>
          <Button onClick={() => refreshStats()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">No analytics data available</div>
        </div>
      </div>
    )
  }

  const weeklyData = stats.weeklyData ?? []

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex items-center justify-between text-foreground">
        <div className="flex items-center gap-2">
          <Button
            variant={selectedPeriod === "week" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => handlePeriodChange("week")}
          >
            <Calendar className="w-4 h-4" />
            Last 7 days
          </Button>
          <Button
            variant={selectedPeriod === "month" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => handlePeriodChange("month")}
          >
            <Calendar className="w-4 h-4" />
            Last 30 days
          </Button>
          <Button
            variant={selectedPeriod === "year" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => handlePeriodChange("year")}
          >
            <Calendar className="w-4 h-4" />
            Last year
          </Button>
        </div>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => refreshStats(selectedPeriod)}>
          <Download className="w-4 h-4" />
          Export Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Sessions</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalSessions ?? 0}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-500">Current streak: {stats.currentStreak ?? 0} days</span>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Focus Time</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.round(((stats.totalFocusTime ?? 0) / 3600) * 10) / 10}h
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-muted-foreground">
              Daily average: {Math.round((stats.averageSessionDuration ?? 0) / 60)}min
            </span>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Focus Score</p>
              <p className="text-2xl font-bold text-foreground">{Math.round(stats.averageFocusPercentage ?? 0)}%</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-2">
            <Progress value={stats.averageFocusPercentage ?? 0} className="h-1" />
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Best Session</p>
              <p className="text-2xl font-bold text-foreground">{Math.round((stats.bestSessionMinutes ?? 0))} min</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-muted-foreground">Longest single session</span>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Weekly Progress</h3>
            <p className="text-sm text-muted-foreground">Your focus score trend over the past period</p>
          </div>
          <WeeklyProgress />
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Distraction Patterns</h3>
            <p className="text-sm text-muted-foreground">When you're most likely to get distracted</p>
          </div>
          <DistractionChart />
        </Card>
      </div>

      {/* Focus Timeline */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Today's Focus Timeline</h3>
          <p className="text-sm text-muted-foreground">Real-time view of your attention during the last session</p>
        </div>
        <FocusTimeline />
      </Card>

      {/* Weekly Data Table */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Weekly Breakdown</h3>
          <p className="text-sm text-muted-foreground">Your focus time and sessions for each day</p>
        </div>

        <div className="space-y-4">
          {(weeklyData ?? []).map((day, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20"
            >
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <Badge variant="outline" className="text-xs">
                  {day.sessions} sessions
                </Badge>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm font-medium text-foreground">{Math.round(day.focusTime / 60)}min</div>
                  <div className="text-xs text-muted-foreground">Focus Time</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-foreground">{day.distractions}</div>
                  <div className="text-xs text-muted-foreground">Distractions</div>
                </div>
                <div className="w-16">
                  <Progress
                    value={day.sessions > 0 ? (day.focusTime / (day.sessions * 25 * 60)) * 100 : 0}
                    className="h-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}