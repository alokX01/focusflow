"use client"

// Mock data for monthly progress
const monthlyData = [
  { day: 1, score: 72 },
  { day: 2, score: 78 },
  { day: 3, score: 75 },
  { day: 4, score: 82 },
  { day: 5, score: 79 },
  { day: 6, score: 85 },
  { day: 7, score: 88 },
  { day: 8, score: 84 },
  { day: 9, score: 90 },
  { day: 10, score: 96 },
  { day: 11, score: 89 },
  { day: 12, score: 87 },
  { day: 13, score: 86 },
  { day: 14, score: 81 },
  { day: 15, score: 82 },
]

export function MonthlyChart() {
  const maxScore = 100
  const minScore = Math.min(...monthlyData.map((d) => d.score))
  const avgScore = Math.round(monthlyData.reduce((sum, d) => sum + d.score, 0) / monthlyData.length)

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="relative h-48 flex items-end justify-between gap-1">
        {monthlyData.map((data, index) => (
          <div key={index} className="flex flex-col items-center gap-2 flex-1 group">
            <div className="relative w-full">
              <div
                className="w-full bg-primary/80 rounded-t transition-all duration-300 hover:bg-primary group-hover:scale-105"
                style={{
                  height: `${((data.score - minScore) / (maxScore - minScore)) * 160 + 20}px`,
                }}
              />
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Day {data.day}: {data.score}%
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{data.day}</div>
          </div>
        ))}
      </div>

      {/* Average line indicator */}
      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-primary" />
          <span>Daily scores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-muted-foreground" />
          <span>Average: {avgScore}%</span>
        </div>
      </div>
    </div>
  )
}
