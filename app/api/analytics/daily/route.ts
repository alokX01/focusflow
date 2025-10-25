import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { AnalyticsData } from '@/lib/models'

export const dynamic = 'force-dynamic'

// GET /api/analytics/daily - Get daily analytics data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const date = searchParams.get('date') // YYYY-MM-DD format

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const targetDate = date ? new Date(date) : new Date()
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const db = await getDatabase()
    
    // Get sessions for the specific day
    const sessions = await db
      .collection('sessions')
      .find({
        userId,
        createdAt: { $gte: dayStart, $lt: dayEnd },
        isCompleted: true
      })
      .toArray()

    // Calculate daily stats
    const totalFocusTime = sessions.reduce((sum, session) => sum + session.duration, 0)
    const totalSessions = sessions.length
    const completedSessions = sessions.filter(s => s.isCompleted).length
    const averageFocusPercentage = totalSessions > 0 
      ? sessions.reduce((sum, session) => sum + session.focusPercentage, 0) / totalSessions 
      : 0
    const totalDistractions = sessions.reduce((sum, session) => sum + session.distractionCount, 0)

    // Get or create daily analytics record
    const existingRecord = await db
      .collection<AnalyticsData>('analytics')
      .findOne({
        userId,
        date: dayStart
      })

    const dailyAnalytics: AnalyticsData = {
      userId,
      date: dayStart,
      totalFocusTime,
      totalSessions,
      completedSessions,
      averageFocusPercentage,
      totalDistractions,
      longestStreak: 0, // This would need more complex calculation
      dailyGoal: 25 * 60, // Default 25 minutes in seconds
      goalAchieved: totalFocusTime >= (25 * 60),
      createdAt: existingRecord?.createdAt || new Date(),
      updatedAt: new Date()
    }

    if (existingRecord) {
      await db
        .collection<AnalyticsData>('analytics')
        .updateOne(
          { _id: existingRecord._id },
          { $set: dailyAnalytics }
        )
    } else {
      await db
        .collection<AnalyticsData>('analytics')
        .insertOne(dailyAnalytics)
    }

    return NextResponse.json({ dailyAnalytics })
  } catch (error) {
    console.error('Error fetching daily analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch daily analytics' }, { status: 500 })
  }
}
