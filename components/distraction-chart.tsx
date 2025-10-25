"use client"

// Mock data for hourly distraction patterns
const distractionData = [
  { hour: "9AM", distractions: 2 },
  { hour: "10AM", distractions: 1 },
  { hour: "11AM", distractions: 3 },
  { hour: "12PM", distractions: 5 },
  { hour: "1PM", distractions: 7 },
  { hour: "2PM", distractions: 4 },
  { hour: "3PM", distractions: 6 },
  { hour: "4PM", distractions: 3 },
  { hour: "5PM", distractions: 2 },
]

export function DistractionChart() {
  const maxDistractions = Math.max(...distractionData.map((d) => d.distractions))

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between h-32 gap-2">
        {distractionData.map((data, index) => (
          <div key={index} className="flex flex-col items-center gap-2 flex-1">
            <div
              className="w-full bg-red-500/80 rounded-t transition-all duration-300 hover:bg-red-500"
              style={{
                height: `${(data.distractions / maxDistractions) * 100}%`,
                minHeight: data.distractions > 0 ? "8px" : "2px",
              }}
            />
            <div className="text-xs text-muted-foreground">{data.hour}</div>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">Peak distraction time: 1PM - 3PM</div>
    </div>
  )
}
