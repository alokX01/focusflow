import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getDatabase } from '@/lib/mongodb'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week'
    
    // Return demo data for non-authenticated users
    if (!session?.user) {
      return NextResponse.json({
        analytics: getDemoData(period)
      })
    }
    
    const userId = (session.user as any).id || session.user.email
    const db = await getDatabase()
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }
    
    // Get sessions
    const sessions = await db
      .collection('sessions')
      .find({
        userId,
        createdAt: { $gte: startDate, $lte: endDate }
      })
      .toArray()
    
    // Generate daily data for charts
    const dailyData = generateDailyData(sessions, startDate, endDate, period)
    
    // Generate hourly distribution
    const hourlyDistribution = generateHourlyDistribution(sessions)
    
    // Calculate stats
    const stats = {
      totalSessions: sessions.length,
      totalMinutes: Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60),
      averageFocus: sessions.length > 0
        ? Math.round(sessions.reduce((acc, s) => acc + s.focusPercentage, 0) / sessions.length)
        : 0,
      completionRate: sessions.length > 0
        ? Math.round((sessions.filter(s => s.isCompleted).length / sessions.length) * 100)
        : 0,
      streak: await calculateStreak(db, userId),
      todayFocus: calculateTodayFocus(sessions),
      weeklyFocus: calculateWeeklyAverage(sessions)
    }
    
    return NextResponse.json({
      analytics: {
        ...stats,
        dailyData,
        hourlyDistribution,
        topTags: getTopTags(sessions),
        distractionTypes: getDistractionTypes(sessions)
      }
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    
    // Return demo data on error
    return NextResponse.json({
      analytics: getDemoData('week')
    })
  }
}

function getDemoData(period: string) {
  const days = period === 'week' 
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : period === 'month'
    ? Array.from({length: 30}, (_, i) => `Day ${i + 1}`)
    : Array.from({length: 12}, (_, i) => `Month ${i + 1}`)
  
  return {
    totalSessions: 42,
    totalMinutes: 1260,
    averageFocus: 85,
    completionRate: 78,
    streak: 7,
    todayFocus: 88,
    weeklyFocus: 85,
    dailyData: days.slice(0, 7).map(day => ({
      day,
      focus: Math.floor(Math.random() * 30) + 70,
      sessions: Math.floor(Math.random() * 5) + 1,
      minutes: Math.floor(Math.random() * 120) + 30
    })),
    hourlyDistribution: Array.from({length: 24}, (_, hour) => ({
      hour: `${hour}:00`,
      count: Math.floor(Math.random() * 5)
    })),
    topTags: [
      { tag: 'Work', count: 15 },
      { tag: 'Study', count: 12 },
      { tag: 'Reading', count: 8 },
      { tag: 'Writing', count: 5 },
      { tag: 'Creative', count: 2 }
    ],
    distractionTypes: [
      { type: 'Phone', count: 12 },
      { type: 'Browser', count: 8 },
      { type: 'People', count: 5 },
      { type: 'Other', count: 3 }
    ]
  }
}

function generateDailyData(sessions: any[], startDate: Date, endDate: Date, period: string) {
  const data = []
  const current = new Date(startDate)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  while (current <= endDate) {
    const dayStart = new Date(current)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(current)
    dayEnd.setHours(23, 59, 59, 999)
    
    const daySessions = sessions.filter(s => {
      const sessionDate = new Date(s.createdAt)
      return sessionDate >= dayStart && sessionDate <= dayEnd
    })
    
    const dayName = period === 'week' 
      ? days[current.getDay()]
      : current.getDate().toString()
    
    data.push({
      day: dayName,
      focus: daySessions.length > 0
        ? Math.round(daySessions.reduce((acc, s) => acc + s.focusPercentage, 0) / daySessions.length)
        : 0,
      sessions: daySessions.length,
      minutes: Math.round(daySessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60)
    })
    
    current.setDate(current.getDate() + 1)
    
    // Limit data points for longer periods
    if (period === 'month' && data.length >= 30) break
    if (period === 'year' && data.length >= 52) break
  }
  
  return data
}

function generateHourlyDistribution(sessions: any[]) {
  const distribution = Array(24).fill(0).map((_, hour) => ({
    hour: `${hour}:00`,
    count: 0
  }))
  
  sessions.forEach(s => {
    if (s.startTime) {
      const hour = new Date(s.startTime).getHours()
      distribution[hour].count++
    }
  })
  
  return distribution
}

function calculateTodayFocus(sessions: any[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todaySessions = sessions.filter(s => {
    const sessionDate = new Date(s.createdAt)
    sessionDate.setHours(0, 0, 0, 0)
    return sessionDate.getTime() === today.getTime()
  })
  
  if (todaySessions.length === 0) return 0
  
  return Math.round(
    todaySessions.reduce((acc, s) => acc + s.focusPercentage, 0) / todaySessions.length
  )
}

function calculateWeeklyAverage(sessions: any[]) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const weekSessions = sessions.filter(s => new Date(s.createdAt) >= weekAgo)
  
  if (weekSessions.length === 0) return 0
  
  return Math.round(
    weekSessions.reduce((acc, s) => acc + s.focusPercentage, 0) / weekSessions.length
  )
}

function getTopTags(sessions: any[]) {
  const tagCounts: any = {}
  
  sessions.forEach(s => {
    if (s.tags && Array.isArray(s.tags)) {
      s.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    }
  })
  
  return Object.entries(tagCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }))
}

function getDistractionTypes(sessions: any[]) {
  const types: any = {}
  
  sessions.forEach(s => {
    if (s.distractions && Array.isArray(s.distractions)) {
      s.distractions.forEach((d: any) => {
        types[d.type] = (types[d.type] || 0) + 1
      })
    }
  })
  
  return Object.entries(types)
    .map(([type, count]) => ({ type, count }))
}

async function calculateStreak(db: any, userId: string) {
  const sessions = await db
    .collection('sessions')
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(365)
    .toArray()
  
  if (sessions.length === 0) return 0
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    checkDate.setHours(0, 0, 0, 0)
    
    const hasSession = sessions.some((s: any) => {
      const sessionDate = new Date(s.createdAt)
      sessionDate.setHours(0, 0, 0, 0)
      return sessionDate.getTime() === checkDate.getTime()
    })
    
    if (hasSession) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  
  return streak
}