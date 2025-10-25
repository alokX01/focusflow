"use client"

// Mock timeline data - represents focus/distraction events over time
const timelineData = [
  { time: 0, focused: true, duration: 300 }, // 5 min focused
  { time: 300, focused: false, duration: 30 }, // 30 sec distracted
  { time: 330, focused: true, duration: 420 }, // 7 min focused
  { time: 750, focused: false, duration: 45 }, // 45 sec distracted
  { time: 795, focused: true, duration: 705 }, // 11.75 min focused
]

export function FocusTimeline() {
  const totalDuration = 1500 // 25 minutes in seconds

  return (
    <div className="space-y-4">
      {/* Timeline Bar */}
      <div className="relative h-8 bg-muted/30 rounded-lg overflow-hidden">
        {timelineData.map((segment, index) => (
          <div
            key={index}
            className={`absolute top-0 h-full transition-all duration-300 ${
              segment.focused ? "bg-green-500" : "bg-red-500"
            }`}
            style={{
              left: `${(segment.time / totalDuration) * 100}%`,
              width: `${(segment.duration / totalDuration) * 100}%`,
            }}
          />
        ))}

        {/* Time markers */}
        <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-muted-foreground">
          <span>0:00</span>
          <span>5:00</span>
          <span>10:00</span>
          <span>15:00</span>
          <span>20:00</span>
          <span>25:00</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-muted-foreground">Focused</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-muted-foreground">Distracted</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-semibold text-green-500">23:45</div>
          <div className="text-xs text-muted-foreground">Time Focused</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-red-500">1:15</div>
          <div className="text-xs text-muted-foreground">Time Distracted</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-amber-500">2</div>
          <div className="text-xs text-muted-foreground">Distraction Events</div>
        </div>
      </div>
    </div>
  )
}
