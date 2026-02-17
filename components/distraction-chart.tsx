"use client";

interface DistractionData {
  hour: string;
  distractions: number;
}

export function DistractionChart({ data }: { data?: any[] }) {
  const formatted: DistractionData[] =
    data && Array.isArray(data)
      ? data.map((d: any) => ({
          hour: d.hour || d._id || "00:00",
          distractions: d.distractions ?? d.count ?? 0,
        }))
      : [];

  if (formatted.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No distraction data yet
      </div>
    );
  }

  const max = Math.max(...formatted.map((d) => d.distractions), 1);
  const peak = formatted.reduce((best, curr) =>
    curr.distractions > best.distractions ? curr : best
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between h-32 gap-2">
        {formatted.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
            <div className="relative w-full">
              <div
                className="w-full rounded-t transition-all duration-300 group-hover:scale-105 bg-destructive/80 dark:bg-destructive/70 hover:bg-destructive"
                style={{
                  height: `${(d.distractions / max) * 100}%`,
                  minHeight: d.distractions > 0 ? "8px" : "2px",
                }}
              />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-lg border whitespace-nowrap">
                  {d.distractions} distraction{d.distractions !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{d.hour}</div>
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Peak distraction hour: {peak.hour}
      </div>
    </div>
  );
}
