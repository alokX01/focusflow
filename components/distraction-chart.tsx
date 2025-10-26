"use client";

import { useEffect, useState } from "react";

interface DistractionData {
  hour: string;
  distractions: number;
}

export function DistractionChart() {
  const [distractionData, setDistractionData] = useState<DistractionData[]>([]);
  const [maxDistractions, setMaxDistractions] = useState(0);

  useEffect(() => {
    // Fetch real data from API or use demo data
    const demoData: DistractionData[] = [
      { hour: "9AM", distractions: 2 },
      { hour: "10AM", distractions: 1 },
      { hour: "11AM", distractions: 3 },
      { hour: "12PM", distractions: 5 },
      { hour: "1PM", distractions: 7 },
      { hour: "2PM", distractions: 4 },
      { hour: "3PM", distractions: 6 },
      { hour: "4PM", distractions: 3 },
      { hour: "5PM", distractions: 2 },
    ];

    setDistractionData(demoData);
    setMaxDistractions(Math.max(...demoData.map((d) => d.distractions)));
  }, []);

  if (distractionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No distraction data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between h-32 gap-2">
        {distractionData.map((data, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-2 flex-1 group"
          >
            <div className="relative w-full">
              <div
                className="w-full bg-destructive/80 rounded-t transition-all duration-300 hover:bg-destructive group-hover:scale-105"
                style={{
                  height:
                    maxDistractions > 0
                      ? `${(data.distractions / maxDistractions) * 100}%`
                      : "0%",
                  minHeight: data.distractions > 0 ? "8px" : "2px",
                }}
              />

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg border">
                  {data.distractions} distraction
                  {data.distractions !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{data.hour}</div>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Peak distraction time: 1PM - 3PM
      </div>
    </div>
  );
}
