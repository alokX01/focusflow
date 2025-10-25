"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, TrendingUp, Clock, Eye, Target, Download } from "lucide-react";
import { MonthlyChart } from "@/components/monthly-chart";
import { SessionDetails } from "@/components/session-details";

// Mock historical data
const historicalSessions = [
  {
    id: 1,
    date: "2024-01-15",
    sessions: [
      {
        time: "09:30",
        duration: 25,
        focusScore: 89,
        distractions: 3,
        type: "work",
      },
      {
        time: "10:00",
        duration: 5,
        focusScore: 95,
        distractions: 0,
        type: "break",
      },
      {
        time: "10:05",
        duration: 25,
        focusScore: 76,
        distractions: 5,
        type: "work",
      },
      {
        time: "14:15",
        duration: 25,
        focusScore: 82,
        distractions: 4,
        type: "work",
      },
    ],
    totalFocusTime: 75,
    averageFocusScore: 82,
    totalDistractions: 12,
  },
  {
    id: 2,
    date: "2024-01-14",
    sessions: [
      {
        time: "10:00",
        duration: 25,
        focusScore: 94,
        distractions: 1,
        type: "work",
      },
      {
        time: "10:30",
        duration: 5,
        focusScore: 98,
        distractions: 0,
        type: "break",
      },
      {
        time: "16:30",
        duration: 25,
        focusScore: 68,
        distractions: 7,
        type: "work",
      },
    ],
    totalFocusTime: 50,
    averageFocusScore: 81,
    totalDistractions: 8,
  },
  {
    id: 3,
    date: "2024-01-13",
    sessions: [
      {
        time: "09:00",
        duration: 25,
        focusScore: 91,
        distractions: 2,
        type: "work",
      },
      {
        time: "11:15",
        duration: 25,
        focusScore: 87,
        distractions: 3,
        type: "work",
      },
      {
        time: "15:45",
        duration: 25,
        focusScore: 79,
        distractions: 6,
        type: "work",
      },
    ],
    totalFocusTime: 75,
    averageFocusScore: 86,
    totalDistractions: 11,
  },
];

const monthlyStats = {
  totalSessions: 45,
  totalFocusTime: 18.5, // hours
  averageFocusScore: 84,
  bestDay: { date: "2024-01-10", score: 96 },
  improvement: 15, // percentage
};

export function HistoryInterface() {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getFocusScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 75) return "text-amber-500";
    return "text-red-500";
  };

  const getFocusScoreBadge = (score: number) => {
    if (score >= 90) return "default";
    if (score >= 75) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex items-center justify-between text-foreground">
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>

        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Monthly Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Total Sessions
              </p>
              <p className="text-2xl font-bold text-foreground">
                {monthlyStats.totalSessions}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-500">
              +{monthlyStats.improvement}% this month
            </span>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Focus Time</p>
              <p className="text-2xl font-bold text-foreground">
                {monthlyStats.totalFocusTime}h
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-muted-foreground">
              Daily average: 37min
            </span>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Avg Focus Score
              </p>
              <p className="text-2xl font-bold text-foreground">
                {monthlyStats.averageFocusScore}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-2">
            <Progress value={monthlyStats.averageFocusScore} className="h-1" />
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Best Day</p>
              <p className="text-2xl font-bold text-foreground">
                {monthlyStats.bestDay.score}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-muted-foreground">
              {new Date(monthlyStats.bestDay.date).toLocaleDateString()}
            </span>
          </div>
        </Card>
      </div>

      {/* Monthly Progress Chart */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Monthly Progress
          </h3>
          <p className="text-sm text-muted-foreground">
            Your focus score trend over the past month
          </p>
        </div>
        <MonthlyChart />
      </Card>

      {/* Daily Sessions */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Recent Sessions
          </h3>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of your focus sessions
          </p>
        </div>

        <div className="space-y-6">
          {historicalSessions.map((day) => (
            <div key={day.id} className="space-y-4">
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h4 className="font-medium text-foreground">
                    {formatDate(day.date)}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{day.sessions.length} sessions</span>
                    <span>{day.totalFocusTime}min total</span>
                    <span className={getFocusScoreColor(day.averageFocusScore)}>
                      {day.averageFocusScore}% avg focus
                    </span>
                  </div>
                </div>
                <Badge variant={getFocusScoreBadge(day.averageFocusScore)}>
                  {day.averageFocusScore}%
                </Badge>
              </div>

              {/* Sessions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {day.sessions.map((session, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() =>
                      setSelectedSession({ ...session, date: day.date })
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-foreground">
                        {session.time}
                      </div>
                      <Badge
                        variant={
                          session.type === "work" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {session.type}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="text-foreground">
                          {session.duration}min
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Focus</span>
                        <span
                          className={getFocusScoreColor(session.focusScore)}
                        >
                          {session.focusScore}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Distractions
                        </span>
                        <span className="text-foreground">
                          {session.distractions}
                        </span>
                      </div>

                      <Progress
                        value={session.focusScore}
                        className="h-1 mt-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Session Details Modal */}
      {selectedSession && (
        <SessionDetails
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
