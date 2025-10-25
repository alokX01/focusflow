"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { X, Clock, Eye, AlertTriangle, TrendingUp } from "lucide-react"

interface SessionDetailsProps {
  session: {
    time: string
    duration: number
    focusScore: number
    distractions: number
    type: string
    date: string
  }
  onClose: () => void
}

export function SessionDetails({ session, onClose }: SessionDetailsProps) {
  // Mock detailed session data
  const sessionDetails = {
    startTime: session.time,
    endTime: "10:25",
    actualFocusTime: Math.round(session.duration * (session.focusScore / 100)),
    distractionEvents: [
      { time: "09:35", duration: 15, reason: "Phone notification" },
      { time: "09:42", duration: 8, reason: "Looking away" },
      { time: "09:48", duration: 12, reason: "Door opening" },
    ],
    focusPattern: [
      { minute: 1, focused: true },
      { minute: 2, focused: true },
      { minute: 3, focused: true },
      { minute: 4, focused: true },
      { minute: 5, focused: false },
      { minute: 6, focused: true },
      { minute: 7, focused: false },
      { minute: 8, focused: true },
      // ... more data
    ],
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Session Details</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(session.date).toLocaleDateString()} at {session.time}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Session Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="text-lg font-semibold text-foreground">{session.duration}min</div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-lg font-semibold text-foreground">{sessionDetails.actualFocusTime}min</div>
              <div className="text-xs text-muted-foreground">Focused Time</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <Eye className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-lg font-semibold text-foreground">{session.focusScore}%</div>
              <div className="text-xs text-muted-foreground">Focus Score</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-lg font-semibold text-foreground">{session.distractions}</div>
              <div className="text-xs text-muted-foreground">Distractions</div>
            </div>
          </div>

          {/* Focus Timeline */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-foreground mb-3">Focus Timeline</h4>
            <div className="relative h-6 bg-muted/30 rounded-lg overflow-hidden">
              {/* Simplified timeline visualization */}
              <div className="absolute inset-0 flex">
                <div className="bg-green-500 h-full" style={{ width: "20%" }} />
                <div className="bg-red-500 h-full" style={{ width: "5%" }} />
                <div className="bg-green-500 h-full" style={{ width: "25%" }} />
                <div className="bg-red-500 h-full" style={{ width: "3%" }} />
                <div className="bg-green-500 h-full" style={{ width: "47%" }} />
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0min</span>
              <span>25min</span>
            </div>
          </div>

          {/* Distraction Events */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-foreground mb-3">Distraction Events</h4>
            <div className="space-y-2">
              {sessionDetails.distractionEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{event.time}</div>
                      <div className="text-xs text-muted-foreground">{event.reason}</div>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {event.duration}s
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Session Rating */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Overall Performance</h4>
                <p className="text-xs text-muted-foreground">Based on focus score and consistency</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-foreground">{session.focusScore}%</div>
                <Progress value={session.focusScore} className="w-20 h-1 mt-1" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
