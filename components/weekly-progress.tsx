"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface DailyData {
  day?: string;
  date?: string;
  focus: number;
  sessions: number;
  minutes: number;
}

const EMPTY_WEEK: DailyData[] = [
  { day: "Mon", focus: 0, sessions: 0, minutes: 0 },
  { day: "Tue", focus: 0, sessions: 0, minutes: 0 },
  { day: "Wed", focus: 0, sessions: 0, minutes: 0 },
  { day: "Thu", focus: 0, sessions: 0, minutes: 0 },
  { day: "Fri", focus: 0, sessions: 0, minutes: 0 },
  { day: "Sat", focus: 0, sessions: 0, minutes: 0 },
  { day: "Sun", focus: 0, sessions: 0, minutes: 0 },
];

export function WeeklyProgress({ data }: { data?: DailyData[] }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return EMPTY_WEEK;

    return data.slice(-7).map((d) => {
      const parsed = d.date ? new Date(d.date) : null;
      const day =
        d.day ||
        (parsed && !Number.isNaN(parsed.getTime())
          ? parsed.toLocaleDateString("en-US", { weekday: "short" })
          : "");
      return { ...d, day };
    });
  }, [data]);

  const maxFocus = Math.max(...chartData.map((d) => d.focus), 100);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between h-48 gap-2">
        {chartData.map((d, i) => {
          const height = (d.focus / maxFocus) * 100;
          const isToday = new Date().getDay() === (i + 1) % 7;
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-2 flex-1 group relative"
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-12 opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                <div className="bg-popover text-popover-foreground text-xs rounded-lg px-3 py-2 shadow-lg border whitespace-nowrap">
                  <p className="font-semibold">{d.day}</p>
                  <p>Focus: {d.focus}%</p>
                  <p>Sessions: {d.sessions}</p>
                  <p>Time: {d.minutes}min</p>
                </div>
              </div>
              <div className="relative w-full flex flex-col justify-end h-full">
                <div
                  className={cn(
                    "w-full rounded-t-lg transition-all duration-300 group-hover:scale-105",
                    d.focus >= 80
                      ? "bg-blue-500"
                      : d.focus >= 60
                      ? "bg-blue-400"
                      : d.focus >= 40
                      ? "bg-amber-500"
                      : d.focus > 0
                      ? "bg-slate-400"
                      : "bg-muted",
                    isToday && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={{
                    height: `${height}%`,
                    minHeight: d.focus > 0 ? "8px" : "4px",
                  }}
                />
              </div>
              <div
                className={cn(
                  "text-xs font-medium",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}
              >
                {d.day}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-muted-foreground">Excellent (80%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-400" />
          <span className="text-muted-foreground">Good (60-80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-muted-foreground">Fair (40-60%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-400" />
          <span className="text-muted-foreground">Low (&lt;40%)</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {Math.round(chartData.reduce((a, d) => a + d.focus, 0) / chartData.length) || 0}%
          </div>
          <div className="text-xs text-muted-foreground">Avg Focus</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {chartData.reduce((a, d) => a + d.sessions, 0)}
          </div>
          <div className="text-xs text-muted-foreground">Total Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {Math.round(chartData.reduce((a, d) => a + d.minutes, 0) / 60)}h
          </div>
          <div className="text-xs text-muted-foreground">Total Time</div>
        </div>
      </div>
    </div>
  );
}
