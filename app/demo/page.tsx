"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { TimerInterface } from "@/components/timer-interface"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Target, 
  TrendingUp, 
  Clock, 
  Award,
  ChevronRight,
  Calendar,
  Zap,
  Brain
} from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    todayFocus: 0,
    todayGoal: 240, // 4 hours in minutes
    streak: 0,
    totalToday: 0,
    weeklyAverage: 0
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (status === "authenticated") {
      fetchTodayStats()
    }
  }, [status, router])

  const fetchTodayStats = async () => {
    try {
      const response = await fetch('/api/users/me/stats')
      if (response.ok) {
        const data = await response.json()
        setStats({
          todayFocus: data.todayFocus || 0,
          todayGoal: 240,
          streak: data.currentStreak || 0,
          totalToday: data.todayTotal || 0,
          weeklyAverage: data.weeklyAverage || 0
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading your workspace...</div>
      </div>
    )
  }

  const progressPercentage = Math.min((stats.totalToday / stats.todayGoal) * 100, 100)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Today's Progress</span>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {stats.totalToday} / {stats.todayGoal} min
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {progressPercentage.toFixed(0)}% of daily goal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Focus Score</span>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayFocus}%</div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.todayFocus >= 80 ? 'Excellent!' : 'Keep it up!'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Current Streak</span>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.streak} days</div>
              <p className="text-xs text-muted-foreground mt-2">
                Don't break the chain!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Weekly Average</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weeklyAverage}%</div>
              <p className="text-xs text-muted-foreground mt-2">
                Focus performance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Timer Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TimerInterface />
          </div>
          
          {/* Quick Actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/analytics" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    View Analytics
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/history" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    Session History
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/settings" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    Settings
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Recent Achievement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Week Warrior</p>
                      <p className="text-xs text-muted-foreground">
                        7 day streak achieved!
                      </p>
                    </div>
                  </div>
                </div>
                <Link href="/profile#achievements">
                  <Button variant="link" className="px-0 mt-3">
                    View all achievements →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}