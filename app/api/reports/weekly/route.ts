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
    
    // Get last week's data
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    
    const sessions = await db
      .collection('sessions')
      .find({
        userId,
        createdAt: { $gte: startDate, $lte: endDate }
      })
      .toArray()
    
    // Calculate weekly report
    const report = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      
      summary: {
        totalSessions: sessions.length,
        totalMinutes: Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60),
        averageFocus: sessions.length > 0
          ? Math.round(sessions.reduce((acc, s) => acc + s.focusPercentage, 0) / sessions.length)
          : 0,
        completionRate: sessions.length > 0
          ? Math.round((sessions.filter(s => s.isCompleted).length / sessions.length) * 100)
          : 0
      },
      
      improvements: {
        focusChange: await calculateFocusChange(db, userId, startDate),
        productivityTrend: await calculateProductivityTrend(db, userId)
      },
      
      highlights: {
        bestDay: getBestDay(sessions),
        longestSession: Math.max(...sessions.map(s => s.duration || 0)) / 60,
        mostProductiveTime: getMostProductiveTime(sessions)
      },
      
      recommendations: getRecommendations(sessions)
    }
    
    // Save report
    await db.collection('weeklyReports').insertOne({
      userId,
      report,
      createdAt: new Date()
    })
    
    return NextResponse.json({ report })
  } catch (error) {
    console.error('Error generating weekly report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

async function calculateFocusChange(db: any, userId: string, weekStart: Date) {
  const previousWeekStart = new Date(weekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const previousWeekEnd = new Date(weekStart)
  
  const previousSessions = await db
    .collection('sessions')
    .find({
      userId,
      createdAt: { $gte: previousWeekStart, $lt: previousWeekEnd }
    })
    .toArray()
  
  const currentSessions = await db
    .collection('sessions')
    .find({
      userId,
      createdAt: { $gte: weekStart }
    })
    .toArray()
  
  const previousAvg = previousSessions.length > 0
    ? previousSessions.reduce((acc: number, s: any) => acc + s.focusPercentage, 0) / previousSessions.length
    : 0
  
  const currentAvg = currentSessions.length > 0
    ? currentSessions.reduce((acc: number, s: any) => acc + s.focusPercentage, 0) / currentSessions.length
    : 0
  
  return Math.round(currentAvg - previousAvg)
}

async function calculateProductivityTrend(db: any, userId: string) {
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  
  const sessions = await db
    .collection('sessions')
    .find({
      userId,
      createdAt: { $gte: fourWeeksAgo }
    })
    .toArray()
  
  // Group by week and calculate trend
  const weeks: any = {}
  sessions.forEach((s: any) => {
    const weekNum = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000))
    if (!weeks[weekNum]) weeks[weekNum] = []
    weeks[weekNum].push(s)
  })
  
  const weeklyAverages = Object.values(weeks).map((weekSessions: any) =>
    weekSessions.reduce((acc: number, s: any) => acc + s.focusPercentage, 0) / weekSessions.length
  )
  
  // Simple trend: positive if last week > first week
  if (weeklyAverages.length >= 2) {
    return weeklyAverages[weeklyAverages.length - 1] > weeklyAverages[0] ? 'improving' : 'declining'
  }
  
  return 'stable'
}

function getBestDay(sessions: any[]) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayStats: any = {}
  
  sessions.forEach(s => {
    const day = days[new Date(s.createdAt).getDay()]
    if (!dayStats[day]) dayStats[day] = { total: 0, count: 0 }
    dayStats[day].total += s.focusPercentage
    dayStats[day].count++
  })
  
  let bestDay = ''
  let bestAvg = 0
  
  Object.entries(dayStats).forEach(([day, stats]: any) => {
    const avg = stats.total / stats.count
    if (avg > bestAvg) {
      bestAvg = avg
      bestDay = day
    }
  })
  
  return bestDay
}

function getMostProductiveTime(sessions: any[]) {
  const hourStats: any = {}
  
  sessions.forEach(s => {
    const hour = new Date(s.startTime).getHours()
    if (!hourStats[hour]) hourStats[hour] = { total: 0, count: 0 }
    hourStats[hour].total += s.focusPercentage
    hourStats[hour].count++
  })
  
  let bestHour = 0
  let bestAvg = 0
  
  Object.entries(hourStats).forEach(([hour, stats]: any) => {
    const avg = stats.total / stats.count
    if (avg > bestAvg) {
      bestAvg = avg
      bestHour = parseInt(hour)
    }
  })
  
  return `${bestHour}:00 - ${bestHour + 1}:00`
}

function getRecommendations(sessions: any[]) {
  const recommendations = []
  
  const avgFocus = sessions.length > 0
    ? sessions.reduce((acc, s) => acc + s.focusPercentage, 0) / sessions.length
    : 0
  
  if (avgFocus < 70) {
    recommendations.push('Consider shorter focus sessions to maintain concentration')
  }
  
  const completionRate = sessions.length > 0
    ? (sessions.filter(s => s.isCompleted).length / sessions.length) * 100
    : 0
  
  if (completionRate < 50) {
    recommendations.push('Try to complete more sessions to build consistency')
  }
  
  const avgDistractions = sessions.length > 0
    ? sessions.reduce((acc, s) => acc + s.distractionCount, 0) / sessions.length
    : 0
  
  if (avgDistractions > 3) {
    recommendations.push('Minimize distractions by turning off notifications during focus time')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Great work! Keep maintaining your excellent focus habits')
  }
  
  return recommendations
}