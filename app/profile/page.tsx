"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  User,
  Calendar,
  Target,
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

type Achievement = {
  id: string;
  name: string;
  description: string;
  category: string;
  points: number;
  icon?: string;
  unlocked: boolean;
  progress: number;
  unlockedAt?: string | null;
};

type AchievementStats = {
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  progressToNextLevel: number;
  unlockedCount: number;
  totalCount: number;
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

const DEFAULT_ACHIEVEMENT_STATS: AchievementStats = {
  totalPoints: 0,
  level: 1,
  nextLevelPoints: 100,
  progressToNextLevel: 0,
  unlockedCount: 0,
  totalCount: 0,
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
  const [initialFormData, setInitialFormData] = useState<ProfileForm>(
    DEFAULT_FORM
  );
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStats, setAchievementStats] = useState<AchievementStats>(
    DEFAULT_ACHIEVEMENT_STATS
  );

  const loadProfileData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [profileRes, statsRes, settingsRes, achievementsRes] =
        await Promise.all([
          fetch("/api/users/me", { cache: "no-store" }),
          fetch("/api/users/me/stats", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
          fetch("/api/achievements", { cache: "no-store" }),
        ]);

      const profileData = profileRes.ok ? await profileRes.json() : {};
      const statsData = statsRes.ok ? await statsRes.json() : {};
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};
      const achievementsData = achievementsRes.ok
        ? await achievementsRes.json()
        : {};

      const user = profileData?.user || {};
      const preferences = user?.preferences || {};
      const settings = settingsData?.data?.settings || {};
      const parsedStats = statsData?.data || statsData;

      const nextForm: ProfileForm = {
        name: user?.name || session?.user?.name || "",
        email: user?.email || session?.user?.email || "",
        focusGoal: Number(
          settings?.focusDuration ?? preferences.focusGoal ?? DEFAULT_FORM.focusGoal
        ),
        breakDuration: Number(
          settings?.shortBreakDuration ??
            preferences.breakDuration ??
            DEFAULT_FORM.breakDuration
        ),
        dailyTarget: Number(
          preferences.dailyTarget ?? DEFAULT_FORM.dailyTarget
        ),
      };

      setFormData(nextForm);
      setInitialFormData(nextForm);
      setUserMeta({
        id: user?.id,
        image: user?.image || null,
        createdAt: user?.createdAt || null,
        updatedAt: user?.updatedAt || null,
      });

      setStats({
        totalSessions: parsedStats?.totalSessions || 0,
        totalFocusTime: parsedStats?.totalFocusTime || 0,
        averageFocus: parsedStats?.averageFocus || 0,
        currentStreak: parsedStats?.currentStreak || 0,
        bestStreak: parsedStats?.bestStreak || parsedStats?.currentStreak || 0,
        todaySessions: parsedStats?.todaySessions || 0,
        todayMinutes: parsedStats?.todayMinutes || 0,
        todayFocus: parsedStats?.todayFocus || 0,
        weeklyAverage: parsedStats?.weeklyAverage || 0,
      });

      setAchievements(
        Array.isArray(achievementsData?.achievements)
          ? achievementsData.achievements
          : []
      );
      setAchievementStats(
        achievementsData?.stats || DEFAULT_ACHIEVEMENT_STATS
      );
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Could not load profile details",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated") {
      loadProfileData();
    }
  }, [status, router, loadProfileData]);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const onNumberChange = (
    key: "focusGoal" | "breakDuration" | "dailyTarget",
    value: string
  ) => {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return;
    if (key === "focusGoal") {
      setFormData((prev) => ({ ...prev, focusGoal: clamp(Math.round(raw), 5, 120) }));
      return;
    }
    if (key === "breakDuration") {
      setFormData((prev) => ({
        ...prev,
        breakDuration: clamp(Math.round(raw), 1, 30),
      }));
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
      const [profileRes, settingsRes] = await Promise.all([
        fetch("/api/users/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            dailyTarget: formData.dailyTarget,
            focusGoal: formData.focusGoal,
            breakDuration: formData.breakDuration,
          }),
        }),
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            focusDuration: formData.focusGoal,
            shortBreakDuration: formData.breakDuration,
          }),
        }),
      ]);

      if (!profileRes.ok || !settingsRes.ok) {
        const profileErr = await profileRes.json().catch(() => ({}));
        const settingsErr = await settingsRes.json().catch(() => ({}));
        throw new Error(
          profileErr?.error ||
            settingsErr?.error ||
            "Failed to save profile settings"
        );
      }

      await loadProfileData();
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
                <CardDescription>Synchronized with the main settings page</CardDescription>
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
                      min="5"
                      max="120"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="breakDuration">Short Break Duration (minutes)</Label>
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

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Progress
                </CardTitle>
                <CardDescription>
                  Level {achievementStats.level} • {achievementStats.unlockedCount}/
                  {achievementStats.totalCount} unlocked
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{achievementStats.totalPoints} points</span>
                  <span>Next: {achievementStats.nextLevelPoints} points</span>
                </div>
                <Progress value={achievementStats.progressToNextLevel} />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className={achievement.unlocked ? "" : "opacity-60"}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-lg px-2 py-1 text-lg ${
                          achievement.unlocked ? "bg-primary/10" : "bg-muted"
                        }`}
                      >
                        {achievement.icon || "ACH"}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{achievement.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {achievement.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{achievement.points} pts</span>
                      <span>{achievement.progress}%</span>
                    </div>
                    <Progress value={achievement.progress} />
                    {achievement.unlocked ? (
                      <Badge className="gap-1">
                        <Flame className="h-3 w-3" />
                        Unlocked
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Locked</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
