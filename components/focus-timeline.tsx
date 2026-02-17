"use client";

type SamplePoint = { t: number; focused: boolean };
type SegmentPoint = { time: number; duration: number; focused: boolean };

function isSampleTimeline(timeline: any[]): timeline is SamplePoint[] {
  return timeline.length > 0 && typeof timeline[0]?.t === "number";
}

function toSegments(timeline: any[]): { segments: SegmentPoint[]; total: number } {
  if (!timeline || timeline.length === 0) return { segments: [], total: 0 };

  if (isSampleTimeline(timeline)) {
    const sorted = [...timeline]
      .filter((x) => typeof x.t === "number")
      .sort((a, b) => a.t - b.t);
    if (sorted.length === 0) return { segments: [], total: 0 };

    const total = Math.max(1, sorted[sorted.length - 1].t + 1);
    const segments: SegmentPoint[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      const start = curr.t;
      const end = next ? next.t : total;
      const duration = Math.max(1, end - start);
      segments.push({ time: start, duration, focused: !!curr.focused });
    }

    return { segments, total };
  }

  const normalized = timeline
    .map((x) => ({
      time: Number(x.time ?? 0),
      duration: Math.max(0, Number(x.duration ?? 0)),
      focused: Boolean(x.focused),
    }))
    .filter((x) => x.duration > 0)
    .sort((a, b) => a.time - b.time);

  const total = normalized.reduce((max, seg) => Math.max(max, seg.time + seg.duration), 0);
  return { segments: normalized, total: Math.max(total, 1) };
}

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function FocusTimeline({ timeline = [] }: { timeline?: any[] }) {
  const { segments, total } = toSegments(timeline);

  if (segments.length === 0) {
    return (
      <div className="h-24 w-full rounded-lg border border-dashed border-border text-sm text-muted-foreground flex items-center justify-center">
        No timeline data available yet
      </div>
    );
  }

  const focusedSeconds = segments
    .filter((s) => s.focused)
    .reduce((sum, s) => sum + s.duration, 0);
  const distractedSeconds = Math.max(0, total - focusedSeconds);
  const distractionEvents = segments.reduce((count, seg, i) => {
    if (i === 0) return seg.focused ? 0 : 1;
    return !seg.focused && segments[i - 1].focused ? count + 1 : count;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="relative h-8 bg-muted/40 dark:bg-muted/20 rounded-lg overflow-hidden">
        {segments.map((segment, idx) => (
          <div
            key={idx}
            className={`absolute top-0 h-full transition-all duration-300 ${
              segment.focused
                ? "bg-blue-500/80 dark:bg-blue-400/80"
                : "bg-slate-400/70 dark:bg-slate-500/70"
            }`}
            style={{
              left: `${(segment.time / total) * 100}%`,
              width: `${(segment.duration / total) * 100}%`,
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-muted-foreground">
          <span>0:00</span>
          <span>{formatClock(Math.floor(total / 2))}</span>
          <span>{formatClock(total)}</span>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500 dark:bg-blue-400" />
          <span className="text-muted-foreground">Focused</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-400 dark:bg-slate-500" />
          <span className="text-muted-foreground">Distracted</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-500 dark:text-blue-300">
            {formatClock(focusedSeconds)}
          </div>
          <div className="text-xs text-muted-foreground">Time Focused</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-500 dark:text-slate-400">
            {formatClock(distractedSeconds)}
          </div>
          <div className="text-xs text-muted-foreground">Time Distracted</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-indigo-500">
            {distractionEvents}
          </div>
          <div className="text-xs text-muted-foreground">Distraction Events</div>
        </div>
      </div>
    </div>
  );
}
