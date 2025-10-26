"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Eye,
  Calendar,
  Download,
  Target,
  Zap,
  Brain,
  Award,
} from "lucide-react";
import { FocusTimeline } from "@/components/focus-timeline";
import { DistractionChart } from "@/components/distraction-chart";
import { WeeklyProgress } from "@/components/weekly-progress";
import { useAnalytics } from "@/hooks/use-analytics";
import { useState } from "react";
import { toast } from "sonner";

type Period = "week" | "month" | "year";

export function AnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("week");
  const { analytics, loading, error, refetch } = useAnalytics(selectedPeriod);

  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/export?period=${selectedPeriod}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `focusflow-analytics-${selectedPeriod}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Analytics exported successfully!");
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export analytics");
    }
  };

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load analytics</p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold">Analytics Overview</h2>
          <p className="text-muted-foreground">
            Track your focus patterns and productivity
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Tabs
            value={selectedPeriod}
            onValueChange={(v) => handlePeriodChange(v as Period)}
          >
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
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
        </div>
      </motion.div>

      {/* Key Metrics */}
      {loading ? (
        <MetricsLoading />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <MetricCard
            icon={BarChart3}
            label="Total Sessions"
            value={analytics?.totalSessions || 0}
            subtext={`${analytics?.completionRate || 0}% completion rate`}
            color="bg-blue-500"
            trend={
              analytics?.streak ? `${analytics.streak} day streak` : undefined
            }
          />

          <MetricCard
            icon={Clock}
            label="Focus Time"
            value={`${analytics?.totalHours || 0}h`}
            subtext={`${Math.round(
              (analytics?.totalMinutes || 0) / (analytics?.totalSessions || 1)
            )}min avg`}
            color="bg-green-500"
          />

          <MetricCard
            icon={Brain}
            label="Avg Focus Score"
            value={`${analytics?.averageFocus || 0}%`}
            subtext={
              analytics?.averageFocus >= 80 ? "Excellent!" : "Keep improving"
            }
            color="bg-purple-500"
            showProgress
            progressValue={analytics?.averageFocus || 0}
          />

          <MetricCard
            icon={Target}
            label="Best Session"
            value={`${Math.round(analytics?.bestSessionMinutes || 0)}min`}
            subtext="Longest focused session"
            color="bg-amber-500"
          />
        </motion.div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Weekly Progress
              </CardTitle>
              <CardDescription>Your focus score trend</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ChartLoading />
              ) : (
                <WeeklyProgress data={analytics?.dailyData} />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-destructive" />
                Distraction Patterns
              </CardTitle>
              <CardDescription>Peak distraction times</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ChartLoading />
              ) : (
                <DistractionChart data={analytics?.hourlyDistribution} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Focus Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Recent Session Timeline
            </CardTitle>
            <CardDescription>
              Attention pattern during your last session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <ChartLoading /> : <FocusTimeline />}
          </CardContent>
        </Card>
      </motion.div>

      {/* Insights & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics?.insights?.map((insight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div className="text-2xl">{insight.charAt(0)}</div>
                      <p className="text-sm flex-1">{insight.substring(2)}</p>
                    </motion.div>
                  )) || (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Complete more sessions to get personalized insights
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Tags */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Top Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics?.topTags?.slice(0, 5).map((tag, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {i + 1}
                        </div>
                        <span className="font-medium">{tag.tag}</span>
                      </div>
                      <Badge variant="secondary">{tag.count} sessions</Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tags yet. Add tags to your sessions!
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
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
  trend?: string;
  showProgress?: boolean;
  progressValue?: number;
}) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-lg ${color}/10 flex items-center justify-center`}
            >
              <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
            </div>
            {trend && (
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground">{subtext}</p>
            )}
          </div>

          {showProgress && progressValue !== undefined && (
            <div className="mt-4">
              <Progress value={progressValue} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Loading States
function MetricsLoading() {
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

function ChartLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-64 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 flex-1" />
      </div>
    </div>
  );
}
