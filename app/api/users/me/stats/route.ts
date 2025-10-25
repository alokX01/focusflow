import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getDatabase } from '@/lib/mongodb'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id || session.user.email
    const db = await getDatabase()
    
    // Get all user sessions
    const sessions = await db
      .collection('sessions')
      .find({ userId })
      .toArray()

    // Calculate stats
    const totalSessions = sessions.length
    const totalFocusTime = sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60 // in minutes
    const averageFocus = sessions.length > 0 
      ? Math.round(sessions.reduce((acc, s) => acc + (s.focusPercentage || 0), 0) / sessions.length)
      : 0

    // Calculate streaks (simplified)
    const today = new Date()
    const sessionsToday = sessions.filter(s => {
      const sessionDate = new Date(s.createdAt)
      return sessionDate.toDateString() === today.toDateString()
    })

    return NextResponse.json({
      totalSessions,
      totalFocusTime: Math.round(totalFocusTime),
      averageFocus,
      currentStreak: sessionsToday.length > 0 ? 1 : 0,
      bestStreak: 7, // Placeholder
      achievements: []
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}