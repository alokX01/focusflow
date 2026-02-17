"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  User,
  Calendar,
  Target,
  TrendingUp,
  Award,
  Clock,
  Camera,
  Save,
  Loader2,
  Trophy,
  Flame,
} from "lucide-react";

type ProfileForm = {
  name: string;
  email: string;
  focusGoal: number;
  breakDuration: number;
  dailyTarget: number;
};

type UserMeta = {
  id?: string;
  image?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Stats = {
  totalSessions: number;
  totalFocusTime: number;
  averageFocus: number;
  currentStreak: number;
  bestStreak: number;
  todaySessions: number;
  todayMinutes: number;
  todayFocus: number;
  weeklyAverage: number;
};

const DEFAULT_FORM: ProfileForm = {
  name: "",
  email: "",
  focusGoal: 25,
  breakDuration: 5,
  dailyTarget: 4,
};

const DEFAULT_STATS: Stats = {
  totalSessions: 0,
  totalFocusTime: 0,
  averageFocus: 0,
  currentStreak: 0,
  bestStreak: 0,
  todaySessions: 0,
  todayMinutes: 0,
  todayFocus: 0,
  weeklyAverage: 0,
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [userMeta, setUserMeta] = useState<UserMeta>({});
  const [formData, setFormData] = useState<ProfileForm>(DEFAULT_FORM);
  const [initialFormData, setInitialFormData] = useState<ProfileForm>(DEFAULT_FORM);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user) {
      loadProfileData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router]);

  const loadProfileData = async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([fetchUserProfile(), fetchUserStats()]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/users/me", { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const user = data?.user || {};
      const preferences = user?.preferences || {};

      const nextForm: ProfileForm = {
        name: user?.name || session?.user?.name || "",
        email: user?.email || session?.user?.email || "",
        focusGoal: Number(preferences.focusGoal ?? DEFAULT_FORM.focusGoal),
        breakDuration: Number(preferences.breakDuration ?? DEFAULT_FORM.breakDuration),
        dailyTarget: Number(preferences.dailyTarget ?? DEFAULT_FORM.dailyTarget),
      };

      setFormData(nextForm);
      setInitialFormData(nextForm);
      setUserMeta({
        id: user?.id,
        image: user?.image || null,
        createdAt: user?.createdAt || null,
        updatedAt: user?.updatedAt || null,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Could not load profile details",
        variant: "destructive",
      });
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch("/api/users/me/stats", { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const parsed = data?.data || data;
      setStats({
        totalSessions: parsed?.totalSessions || 0,
        totalFocusTime: parsed?.totalFocusTime || 0,
        averageFocus: parsed?.averageFocus || 0,
        currentStreak: parsed?.currentStreak || 0,
        bestStreak: parsed?.bestStreak || parsed?.currentStreak || 0,
        todaySessions: parsed?.todaySessions || 0,
        todayMinutes: parsed?.todayMinutes || 0,
        todayFocus: parsed?.todayFocus || 0,
        weeklyAverage: parsed?.weeklyAverage || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Could not load profile stats",
        variant: "destructive",
      });
    }
  };

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const onNumberChange = (
    key: "focusGoal" | "breakDuration" | "dailyTarget",
    value: string
  ) => {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return;
    if (key === "focusGoal") {
      setFormData((prev) => ({ ...prev, focusGoal: clamp(Math.round(raw), 1, 90) }));
      return;
    }
    if (key === "breakDuration") {
      setFormData((prev) => ({ ...prev, breakDuration: clamp(Math.round(raw), 1, 30) }));
      return;
    }
    setFormData((prev) => ({ ...prev, dailyTarget: clamp(Math.round(raw), 1, 20) }));
  };

  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          focusGoal: formData.focusGoal,
          breakDuration: formData.breakDuration,
          dailyTarget: formData.dailyTarget,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save profile");
      }

      setInitialFormData(formData);
      setIsEditing(false);
      toast({ title: "Profile updated successfully" });
      router.refresh();
    } catch (error: any) {
      toast({
        title: error?.message || "Could not save profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setIsEditing(false);
  };

  const userInitials =
    formData.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const memberSince = userMeta.createdAt
    ? new Date(userMeta.createdAt).toLocaleDateString()
    : "N/A";

  const achievements = [
    {
      name: "First Focus",
      description: "Complete your first session",
      unlocked: stats.totalSessions >= 1,
      icon: Target,
    },
    {
      name: "Week Warrior",
      description: "Reach a 7 day streak",
      unlocked: stats.currentStreak >= 7 || stats.bestStreak >= 7,
      icon: Flame,
    },
    {
      name: "Focus Master",
      description: "Keep average focus above 85%",
      unlocked: stats.averageFocus >= 85 && stats.totalSessions >= 10,
      icon: Award,
    },
    {
      name: "Marathon",
      description: "Accumulate 4+ focus hours",
      unlocked: stats.totalFocusTime >= 240,
      icon: Clock,
    },
    {
      name: "Consistency Pro",
      description: "Hit a 14 day best streak",
      unlocked: stats.bestStreak >= 14,
      icon: Trophy,
    },
    {
      name: "Daily Habit",
      description: "Complete at least one session today",
      unlocked: stats.todaySessions > 0,
      icon: Calendar,
    },
  ];

  if (status === "loading" || isLoadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
                  <AvatarImage src={userMeta.image || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-2xl">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold">{formData.name || "User"}</h1>
                  <p className="text-muted-foreground">{formData.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      Member since {memberSince}
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

                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} className="gap-2">
                    <User className="h-4 w-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !isDirty} className="gap-2">
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Focus Time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatTime(stats.totalFocusTime)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lifetime focused time
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
                    Weekly avg: {stats.weeklyAverage}%
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
                    Best streak: {stats.bestStreak} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Today Snapshot</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todaySessions} sessions</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(stats.todayMinutes)} focused, {stats.todayFocus}% avg
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Focus Preferences</CardTitle>
                <CardDescription>Customize your default focus setup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={formData.email} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="focusGoal">Focus Duration (minutes)</Label>
                    <Input
                      id="focusGoal"
                      type="number"
                      value={formData.focusGoal}
                      onChange={(e) => onNumberChange("focusGoal", e.target.value)}
                      disabled={!isEditing}
                      min="1"
                      max="90"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                    <Input
                      id="breakDuration"
                      type="number"
                      value={formData.breakDuration}
                      onChange={(e) => onNumberChange("breakDuration", e.target.value)}
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
                      onChange={(e) => onNumberChange("dailyTarget", e.target.value)}
                      disabled={!isEditing}
                      min="1"
                      max="20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Camera Detection</Label>
                    <Button variant="outline" className="w-full" disabled>
                      <Camera className="h-4 w-4 mr-2" />
                      Configure in Settings page
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement, index) => (
                <Card key={index} className={achievement.unlocked ? "" : "opacity-50"}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          achievement.unlocked ? "bg-primary/10 text-primary" : "bg-muted"
                        }`}
                      >
                        <achievement.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{achievement.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {achievement.description}
                        </CardDescription>
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
  );
}
