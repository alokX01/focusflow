"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Filter,
  TrendingUp,
  Clock,
  Eye,
  Target,
  Download,
  Calendar,
  X,
} from "lucide-react";
import { MonthlyChart } from "@/components/monthly-chart";
import { toast } from "sonner";

interface Session {
  id: string;
  time: string;
  duration: number;
  focusScore: number;
  distractions: number;
  type: "focus" | "break" | "pomodoro";
  goal?: string;
  tags?: string[];
}

interface DayData {
  id: string;
  date: string;
  sessions: Session[];
  totalFocusTime: number;
  averageFocusScore: number;
  totalDistractions: number;
}

type Period = "week" | "month" | "quarter" | "year";

export function HistoryInterface() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("week");
  const [historicalSessions, setHistoricalSessions] = useState<DayData[]>([]);
  const [selectedSession, setSelectedSession] = useState<
    (Session & { date: string }) | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState({
    totalSessions: 0,
    totalFocusTime: 0,
    averageFocusScore: 0,
    bestDay: { date: "", score: 0 },
    improvement: 0,
  });

  useEffect(() => {
    fetchHistoricalData();
  }, [selectedPeriod]);

  const fetchHistoricalData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/sessions?period=${selectedPeriod}&limit=30`
      );
      if (response.ok) {
        const data = await response.json();
        // Process and group sessions by day
        const groupedSessions = groupSessionsByDay(data.sessions);
        setHistoricalSessions(groupedSessions);

        // Calculate stats
        calculateMonthlyStats(data.sessions);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
      toast.error("Failed to load session history");
    } finally {
      setIsLoading(false);
    }
  };

  const groupSessionsByDay = (sessions: any[]): DayData[] => {
    const grouped = sessions.reduce((acc: any, session: any) => {
      const date = new Date(session.startTime).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = {
          id: date,
          date,
          sessions: [],
          totalFocusTime: 0,
          totalDistractions: 0,
          averageFocusScore: 0,
        };
      }

      acc[date].sessions.push({
        id: session._id,
        time: new Date(session.startTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration: Math.round(session.duration / 60),
        focusScore: session.focusPercentage,
        distractions: session.distractionCount,
        type: session.sessionType,
        goal: session.goal,
        tags: session.tags,
      });

      acc[date].totalFocusTime += Math.round(session.duration / 60);
      acc[date].totalDistractions += session.distractionCount;

      return acc;
    }, {});

    // Calculate averages
    Object.values(grouped).forEach((day: any) => {
      day.averageFocusScore = Math.round(
        day.sessions.reduce(
          (sum: number, s: Session) => sum + s.focusScore,
          0
        ) / day.sessions.length
      );
    });

    return Object.values(grouped).sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const calculateMonthlyStats = (sessions: any[]) => {
    if (sessions.length === 0) return;

    const totalFocusMinutes = sessions.reduce(
      (sum, s) => sum + s.duration / 60,
      0
    );
    const avgScore = Math.round(
      sessions.reduce((sum, s) => sum + s.focusPercentage, 0) / sessions.length
    );

    // Find best day
    const dailyScores = groupSessionsByDay(sessions);
    const bestDay = dailyScores.reduce((best, day) =>
      day.averageFocusScore > best.averageFocusScore ? day : best
    );

    setMonthlyStats({
      totalSessions: sessions.length,
      totalFocusTime: Math.round((totalFocusMinutes / 60) * 10) / 10,
      averageFocusScore: avgScore,
      bestDay: {
        date: bestDay.date,
        score: bestDay.averageFocusScore,
      },
      improvement: 15, // TODO: Calculate actual improvement
    });
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/export?period=${selectedPeriod}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `focusflow-history-${selectedPeriod}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("History exported successfully!");
      }
    } catch (error) {
      toast.error("Failed to export history");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getFocusScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 75) return "text-blue-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getFocusScoreBadge = (
    score: number
  ): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <Tabs
          value={selectedPeriod}
          onValueChange={(v) => setSelectedPeriod(v as Period)}
        >
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleExport}
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </motion.div>

      {/* Monthly Overview */}
      {isLoading ? (
        <StatsLoading />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            icon={Target}
            label="Total Sessions"
            value={monthlyStats.totalSessions}
            subtext={`+${monthlyStats.improvement}% this ${selectedPeriod}`}
            color="bg-primary"
            trend
          />
          <StatCard
            icon={Clock}
            label="Focus Time"
            value={`${monthlyStats.totalFocusTime}h`}
            subtext={`${Math.round(
              (monthlyStats.totalFocusTime / monthlyStats.totalSessions) * 60
            )}min avg`}
            color="bg-green-500"
          />
          <StatCard
            icon={Eye}
            label="Avg Focus Score"
            value={`${monthlyStats.averageFocusScore}%`}
            color="bg-blue-500"
            showProgress
            progressValue={monthlyStats.averageFocusScore}
          />
          <StatCard
            icon={TrendingUp}
            label="Best Day"
            value={`${monthlyStats.bestDay.score}%`}
            subtext={new Date(monthlyStats.bestDay.date).toLocaleDateString()}
            color="bg-amber-500"
          />
        </motion.div>
      )}

      {/* Monthly Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Monthly Progress</CardTitle>
            <CardDescription>Your focus score trend over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <MonthlyChart data={historicalSessions} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Daily Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>
              Detailed breakdown of your focus sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[1, 2, 3].map((j) => (
                        <Skeleton key={j} className="h-32 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : historicalSessions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No sessions found</p>
                <p className="text-sm text-muted-foreground">
                  Start a focus session to see your history
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {historicalSessions.map((day, dayIndex) => (
                  <motion.div
                    key={day.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: dayIndex * 0.05 }}
                    className="space-y-4"
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div>
                        <h4 className="font-medium">{formatDate(day.date)}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{day.sessions.length} sessions</span>
                          <span>{day.totalFocusTime}min total</span>
                          <span
                            className={getFocusScoreColor(
                              day.averageFocusScore
                            )}
                          >
                            {day.averageFocusScore}% avg
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={getFocusScoreBadge(day.averageFocusScore)}
                      >
                        {day.averageFocusScore}%
                      </Badge>
                    </div>

                    {/* Sessions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {day.sessions.map((session, sessionIndex) => (
                        <motion.div
                          key={session.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() =>
                            setSelectedSession({ ...session, date: day.date })
                          }
                          className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer bg-card"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium">
                              {session.time}
                            </span>
                            <Badge
                              variant={
                                session.type === "focus"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {session.type}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Duration
                              </span>
                              <span className="font-medium">
                                {session.duration}min
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Focus
                              </span>
                              <span
                                className={getFocusScoreColor(
                                  session.focusScore
                                )}
                              >
                                {session.focusScore}%
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Distractions
                              </span>
                              <span>{session.distractions}</span>
                            </div>
                          </div>

                          <Progress
                            value={session.focusScore}
                            className="h-1 mt-3"
                          />

                          {session.goal && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                              🎯 {session.goal}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Session Details Modal */}
      {selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  trend,
  showProgress,
  progressValue,
}: {
  icon: any;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  trend?: boolean;
  showProgress?: boolean;
  progressValue?: number;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div
            className={`w-12 h-12 rounded-lg ${color}/10 flex items-center justify-center`}
          >
            <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
          </div>
          {trend && <TrendingUp className="w-4 h-4 text-green-500" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
        {showProgress && progressValue !== undefined && (
          <Progress value={progressValue} className="h-1 mt-3" />
        )}
      </CardContent>
    </Card>
  );
}

// Session Details Modal
function SessionDetailsModal({
  session,
  onClose,
}: {
  session: Session & { date: string };
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Session Details</CardTitle>
                <CardDescription>
                  {new Date(session.date).toLocaleDateString()} at{" "}
                  {session.time}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
                <div className="text-lg font-bold">{session.duration}min</div>
                <div className="text-xs text-muted-foreground">Duration</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Eye className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                <div className="text-lg font-bold">{session.focusScore}%</div>
                <div className="text-xs text-muted-foreground">Focus Score</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <TrendingUp className="w-5 h-5 mx-auto mb-2 text-green-500" />
                <div className="text-lg font-bold">
                  {Math.round(session.duration * (session.focusScore / 100))}min
                </div>
                <div className="text-xs text-muted-foreground">
                  Focused Time
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Target className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                <div className="text-lg font-bold">{session.distractions}</div>
                <div className="text-xs text-muted-foreground">
                  Distractions
                </div>
              </div>
            </div>

            {/* Goal */}
            {session.goal && (
              <div className="p-4 rounded-lg border border-border">
                <p className="text-sm font-medium mb-1">Session Goal</p>
                <p className="text-muted-foreground">{session.goal}</p>
              </div>
            )}

            {/* Tags */}
            {session.tags && session.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {session.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Focus Timeline Placeholder */}
            <div>
              <p className="text-sm font-medium mb-3">Focus Timeline</p>
              <div className="h-8 bg-muted/30 rounded-lg overflow-hidden flex">
                <div
                  className="bg-green-500"
                  style={{ width: `${session.focusScore}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${100 - session.focusScore}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Start</span>
                <span>End</span>
              </div>
            </div>

            {/* Overall Performance */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Overall Performance</p>
                  <p className="text-xs text-muted-foreground">
                    {session.focusScore >= 90
                      ? "Excellent focus!"
                      : session.focusScore >= 75
                      ? "Good session"
                      : "Room for improvement"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{session.focusScore}%</div>
                  <Progress
                    value={session.focusScore}
                    className="w-24 h-1 mt-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// Loading States
function StatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
