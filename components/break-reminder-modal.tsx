"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Eye, Coffee, Speech as Stretch, X, Play } from "lucide-react"

interface BreakReminderModalProps {
  isOpen: boolean
  onClose: () => void
  onStartBreak: () => void
  breakType: "short" | "long" | "eye-strain"
}

export function BreakReminderModal({ isOpen, onClose, onStartBreak, breakType }: BreakReminderModalProps) {
  const [countdown, setCountdown] = useState(10)
  const [isCountingDown, setIsCountingDown] = useState(false)

  const breakConfig = {
    short: {
      title: "Time for a Short Break",
      duration: "5 minutes",
      icon: Coffee,
      color: "bg-amber-500",
      suggestions: ["Stand up and stretch", "Get a glass of water", "Take a few deep breaths", "Look out the window"],
    },
    long: {
      title: "Time for a Long Break",
      duration: "15 minutes",
      icon: Stretch,
      color: "bg-green-500",
      suggestions: ["Take a walk outside", "Have a healthy snack", "Do some light exercise", "Chat with a colleague"],
    },
    "eye-strain": {
      title: "Eye Strain Break",
      duration: "2 minutes",
      icon: Eye,
      color: "bg-blue-500",
      suggestions: [
        "Look at something 20 feet away",
        "Blink slowly 10 times",
        "Close your eyes for 30 seconds",
        "Adjust your screen brightness",
      ],
    },
  }

  const config = breakConfig[breakType]
  const IconComponent = config.icon

  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      onStartBreak()
    }
  }, [countdown, isCountingDown, onStartBreak])

  const startCountdown = () => {
    setIsCountingDown(true)
    setCountdown(10)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${config.color}/10 flex items-center justify-center`}>
                <IconComponent className={`w-5 h-5 text-${config.color.split("-")[1]}-500`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
                <p className="text-sm text-muted-foreground">{config.duration} recommended</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Break Suggestions */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-foreground mb-3">Suggested Activities</h4>
            <div className="space-y-2">
              {config.suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Countdown */}
          {isCountingDown && (
            <div className="mb-6 text-center">
              <div className="text-3xl font-bold text-foreground mb-2">{countdown}</div>
              <p className="text-sm text-muted-foreground">Break starting in...</p>
              <Progress value={((10 - countdown) / 10) * 100} className="mt-2" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!isCountingDown ? (
              <>
                <Button onClick={startCountdown} className="flex-1 gap-2">
                  <Play className="w-4 h-4" />
                  Start Break
                </Button>
                <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                  Skip
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsCountingDown(false)} className="w-full">
                Cancel
              </Button>
            )}
          </div>

          {/* Break Stats */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Breaks taken today</span>
              <Badge variant="secondary">8</Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
