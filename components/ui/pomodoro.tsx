'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function Pomodoro() {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (secondsLeft <= 0 && running) {
      setRunning(false)
      alert('Pomodoro finished — take a short break!')
      setSecondsLeft(25 * 60)
    }
  }, [secondsLeft, running])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <div className="p-3 border rounded inline-flex items-center gap-3">
      <div className="text-lg font-mono">{`${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`}</div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Start'}</Button>
        <Button size="sm" variant="outline" onClick={() => { setRunning(false); setSecondsLeft(25 * 60) }}>Reset</Button>
      </div>
    </div>
  )
}
