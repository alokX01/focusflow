"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface DailyData {
  day: string;
  date?: string;
  focus: number;
  sessions: number;
  minutes: number;
}

interface WeeklyProgressProps {
  data?: DailyData[];
}

export function WeeklyProgress({ data }: WeeklyProgressProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Default demo data
      return [
        { day: "Mon", focus: 0, sessions: 0, minutes: 0 },
        { day: "Tue", focus: 0, sessions: 0, minutes: 0 },
        { day: "Wed", focus: 0, sessions: 0, minutes: 0 },
        { day: "Thu", focus: 0, sessions: 0, minutes: 0 },
        { day: "Fri", focus: 0, sessions: 0, minutes: 0 },
        { day: "Sat", focus: 0, sessions: 0, minutes: 0 },
        { day: "Sun", focus: 0, sessions: 0, minutes: 0 },
      ];
    }
    return data.slice(-7); // Last 7 days
  }, [data]);

  const maxFocus = Math.max(...chartData.map((d) => d.focus), 100);
  const maxSessions = Math.max(...chartData.map((d) => d.sessions), 1);

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="flex items-end justify-between h-48 gap-2">
        {chartData.map((data, index) => {
          const focusHeight = (data.focus / maxFocus) * 100;
          const isToday = new Date().getDay() === (index + 1) % 7;

          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2 flex-1 group relative"
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-popover text-popover-foreground text-xs rounded-lg px-3 py-2 shadow-lg border whitespace-nowrap">
                  <p className="font-semibold">{data.day}</p>
                  <p>Focus: {data.focus}%</p>
                  <p>Sessions: {data.sessions}</p>
                  <p>Time: {data.minutes}min</p>
                </div>
              </div>

              {/* Bar */}
              <div className="relative w-full flex flex-col justify-end h-full">
                <div
                  className={cn(
                    "w-full rounded-t-lg transition-all duration-300 group-hover:scale-105",
                    data.focus >= 80
                      ? "bg-green-500"
                      : data.focus >= 60
                      ? "bg-blue-500"
                      : data.focus >= 40
                      ? "bg-amber-500"
                      : data.focus > 0
                      ? "bg-red-500"
                      : "bg-muted",
                    isToday && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={{
                    height: `${focusHeight}%`,
                    minHeight: data.focus > 0 ? "8px" : "4px",
                  }}
                />
              </div>

              {/* Day Label */}
              <div
                className={cn(
                  "text-xs font-medium",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}
              >
                {data.day}
              </div>

              {/* Session Count Badge */}
              {data.sessions > 0 && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-primary">
                  {data.sessions}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-muted-foreground">Excellent (80%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-muted-foreground">Good (60-80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-muted-foreground">Fair (40-60%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-muted-foreground">Low (&lt;40%)</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {Math.round(
              chartData.reduce((acc, d) => acc + d.focus, 0) / chartData.length
            ) || 0}
            %
          </div>
          <div className="text-xs text-muted-foreground">Avg Focus</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {chartData.reduce((acc, d) => acc + d.sessions, 0)}
          </div>
          <div className="text-xs text-muted-foreground">Total Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {Math.round(chartData.reduce((acc, d) => acc + d.minutes, 0) / 60)}h
          </div>
          <div className="text-xs text-muted-foreground">Total Time</div>
        </div>
      </div>
    </div>
  );
}
