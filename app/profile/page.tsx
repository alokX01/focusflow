"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Mail, 
  Calendar, 
  Target, 
  TrendingUp, 
  Award,
  Clock,
  Camera,
  Save,
  Loader2,
  MoonIcon
} from "lucide-react"
import { Header } from "@/components/header"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalFocusTime: 0,
    averageFocus: 0,
    currentStreak: 0,
    bestStreak: 0,
    achievements: []
  })

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    focusGoal: 25,
    breakDuration: 5,
    dailyTarget: 4
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
    
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        email: session.user.email || "",
        focusGoal: 25,
        breakDuration: 5,
        dailyTarget: 4
      })
      
      // Fetch user stats
      fetchUserStats()
    }
  }, [session, status, router])

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/users/me/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setIsEditing(false)
        // Update session
        router.refresh()
      }
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  const userInitials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U"

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header */}
        <div className="mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
                  <AvatarImage src={session?.user?.image || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-2xl">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold">{session?.user?.name}</h1>
                  <p className="text-muted-foreground">{session?.user?.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      Member since {new Date().toLocaleDateString()}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Target className="h-3 w-3" />
                      {stats.totalSessions} Sessions
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(stats.totalFocusTime)}
                    </Badge>
                  </div>
                </div>
                
                <Button
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isEditing ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  {isEditing ? "Save Changes" : "Edit Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Focus Time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatTime(stats.totalFocusTime)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +20% from last week
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Average Focus</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageFocus}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Great performance!
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Current Streak</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.currentStreak} days</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keep it up!
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Best Streak</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.bestStreak} days</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Personal record
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Focus Preferences</CardTitle>
                <CardDescription>Customize your focus sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="focusGoal">Focus Duration (minutes)</Label>
                    <Input
                      id="focusGoal"
                      type="number"
                      value={formData.focusGoal}
                      onChange={(e) => setFormData({...formData, focusGoal: parseInt(e.target.value)})}
                      disabled={!isEditing}
                      min="1"
                      max="60"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                    <Input
                      id="breakDuration"
                      type="number"
                      value={formData.breakDuration}
                      onChange={(e) => setFormData({...formData, breakDuration: parseInt(e.target.value)})}
                      disabled={!isEditing}
                      min="1"
                      max="30"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dailyTarget">Daily Session Target</Label>
                    <Input
                      id="dailyTarget"
                      type="number"
                      value={formData.dailyTarget}
                      onChange={(e) => setFormData({...formData, dailyTarget: parseInt(e.target.value)})}
                      disabled={!isEditing}
                      min="1"
                      max="20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Camera Detection</Label>
                    <Button variant="outline" className="w-full" disabled={!isEditing}>
                      <Camera className="h-4 w-4 mr-2" />
                      Configure Camera
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { name: "First Focus", description: "Complete your first session", icon: Target, unlocked: true },
                { name: "Week Warrior", description: "7 day streak", icon: TrendingUp, unlocked: true },
                { name: "Focus Master", description: "100% focus for 5 sessions", icon: Award, unlocked: false },
                { name: "Early Bird", description: "Start before 6 AM", icon: Clock, unlocked: true },
                { name: "Night Owl", description: "Focus after midnight", icon: MoonIcon, unlocked: false },
                { name: "Marathon", description: "4+ hours in a day", icon: Target, unlocked: false },
              ].map((achievement, index) => (
                <Card key={index} className={achievement.unlocked ? "" : "opacity-50"}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${achievement.unlocked ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                        <achievement.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{achievement.name}</CardTitle>
                        <CardDescription className="text-xs">{achievement.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}