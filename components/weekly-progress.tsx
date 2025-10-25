"use client"

// Mock data for weekly progress
const weeklyData = [
  { day: "Mon", score: 78 },
  { day: "Tue", score: 82 },
  { day: "Wed", score: 75 },
  { day: "Thu", score: 89 },
  { day: "Fri", score: 85 },
  { day: "Sat", score: 92 },
  { day: "Sun", score: 88 },
]

export function WeeklyProgress() {
  const maxScore = 100

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between h-32 gap-2">
        {weeklyData.map((data, index) => (
          <div key={index} className="flex flex-col items-center gap-2 flex-1">
            <div
              className="w-full bg-primary/80 rounded-t transition-all duration-300 hover:bg-primary"
              style={{
                height: `${(data.score / maxScore) * 100}%`,
                minHeight: "8px",
              }}
            />
            <div className="text-xs text-muted-foreground">{data.day}</div>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">Average this week: 84% (+5% from last week)</div>
    </div>
  )
}
