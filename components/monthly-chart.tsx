"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ChartData {
  day: number;
  score: number;
}

interface MonthlyChartProps {
  data?: Array<{
    date: string;
    averageFocusScore: number;
  }>;
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const chartData = useMemo<ChartData[]>(() => {
    if (!data || data.length === 0) {
      // Demo data
      return Array.from({ length: 15 }, (_, i) => ({
        day: i + 1,
        score: Math.floor(Math.random() * 30) + 70,
      }));
    }

    // Convert real data
    return data
      .map((item, index) => ({
        day: new Date(item.date).getDate(),
        score: item.averageFocusScore,
      }))
      .slice(0, 30); // Last 30 days
  }, [data]);

  const maxScore = 100;
  const minScore = Math.min(...chartData.map((d) => d.score), 0);
  const avgScore = Math.round(
    chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length
  );

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="relative h-48 flex items-end justify-between gap-1">
        {chartData.map((data, index) => {
          const heightPercent =
            ((data.score - minScore) / (maxScore - minScore)) * 100;

          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2 flex-1 group relative"
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg border whitespace-nowrap">
                  Day {data.day}: {data.score}%
                </div>
              </div>

              {/* Bar */}
              <div className="relative w-full flex items-end h-full">
                <div
                  className={cn(
                    "w-full rounded-t transition-all duration-300 group-hover:scale-110",
                    data.score >= 90
                      ? "bg-green-500"
                      : data.score >= 75
                      ? "bg-blue-500"
                      : data.score >= 60
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: data.score > 0 ? "8px" : "4px",
                  }}
                />
              </div>

              {/* Day Label */}
              <div className="text-xs text-muted-foreground">{data.day}</div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-primary" />
          <span className="text-muted-foreground">Daily scores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-muted-foreground" />
          <span className="text-muted-foreground">Average: {avgScore}%</span>
        </div>
      </div>
    </div>
  );
}
