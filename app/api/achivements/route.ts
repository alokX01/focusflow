import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getDatabase } from '@/lib/mongodb'
import { authOptions } from '@/lib/auth'

const ACHIEVEMENTS = [
  { id: 'first_session', name: 'First Steps', description: 'Complete your first focus session', points: 10 },
  { id: 'hour_focused', name: 'Deep Diver', description: 'Focus for 1 hour straight', points: 20 },
  { id: 'day_streak_3', name: 'Consistent', description: 'Maintain a 3-day streak', points: 30 },
  { id: 'day_streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', points: 50 },
  { id: 'day_streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', points: 100 },
  { id: 'perfect_focus', name: 'Laser Focus', description: 'Complete a session with 100% focus', points: 25 },
  { id: 'early_bird', name: 'Early Bird', description: 'Start a session before 6 AM', points: 15 },
  { id: 'night_owl', name: 'Night Owl', description: 'Complete a session after midnight', points: 15 },
  { id: 'sessions_10', name: 'Getting Started', description: 'Complete 10 sessions', points: 20 },
  { id: 'sessions_50', name: 'Dedicated', description: 'Complete 50 sessions', points: 50 },
  { id: 'sessions_100', name: 'Centurion', description: 'Complete 100 sessions', points: 100 },
  { id: 'daily_goal', name: 'Goal Getter', description: 'Achieve your daily goal', points: 10 },
  { id: 'weekly_goal', name: 'Week Complete', description: 'Achieve your weekly goal', points: 30 },
  { id: 'no_distractions', name: 'Undistracted', description: 'Complete 5 sessions without distractions', points: 40 },
  { id: 'productivity_master', name: 'Productivity Master', description: 'Maintain 90%+ focus for a week', points: 75 }
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = (session.user as any).id || session.user.email
    const db = await getDatabase()
    
    // Get user's achievements
    const userAchievements = await db
      .collection('userAchievements')
      .find({ userId })
      .toArray()
    
    // Get user stats for checking new achievements
    const stats = await getUserStats(db, userId)
    
    // Check and unlock new achievements
    const newAchievements = await checkAchievements(db, userId, stats, userAchievements)
    
    // Combine all achievements with unlock status
    const allAchievements = ACHIEVEMENTS.map(achievement => {
      const userAch = userAchievements.find(ua => ua.achievementId === achievement.id)
      return {
        ...achievement,
        unlocked: !!userAch,
        unlockedAt: userAch?.unlockedAt || null,
        progress: getAchievementProgress(achievement.id, stats)
      }
    })
    
    // Calculate total points
    const totalPoints = userAchievements.reduce((sum, ua) => {
      const ach = ACHIEVEMENTS.find(a => a.id === ua.achievementId)
      return sum + (ach?.points || 0)
    }, 0)
    
    return NextResponse.json({
      achievements: allAchievements,
      newAchievements,
      totalPoints,
      level: Math.floor(totalPoints / 100) + 1
    })
  } catch (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }
}

async function getUserStats(db: any, userId: string) {
  const sessions = await db
    .collection('sessions')
    .find({ userId })
    .toArray()
  
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 7)
  
  return {
    totalSessions: sessions.length,
    perfectFocusSessions: sessions.filter((s: any) => s.focusPercentage === 100).length,
    currentStreak: await getCurrentStreak(db, userId),
    todaySessions: sessions.filter((s: any) => new Date(s.createdAt) >= todayStart).length,
    weekSessions: sessions.filter((s: any) => new Date(s.createdAt) >= weekStart).length,
    noDistractionSessions: sessions.filter((s: any) => s.distractionCount === 0).length,
    earlyBirdSessions: sessions.filter((s: any) => new Date(s.startTime).getHours() < 6).length,
    nightOwlSessions: sessions.filter((s: any) => new Date(s.startTime).getHours() >= 0 && new Date(s.startTime).getHours() < 4).length,
    weeklyFocusAverage: calculateWeeklyAverage(sessions, weekStart),
    longestSession: Math.max(...sessions.map((s: any) => s.duration || 0))
  }
}

function getAchievementProgress(achievementId: string, stats: any): number {
  switch (achievementId) {
    case 'first_session': return Math.min(stats.totalSessions, 1) * 100
    case 'hour_focused': return Math.min((stats.longestSession / 3600) * 100, 100)
    case 'day_streak_3': return Math.min((stats.currentStreak / 3) * 100, 100)
    case 'day_streak_7': return Math.min((stats.currentStreak / 7) * 100, 100)
    case 'day_streak_30': return Math.min((stats.currentStreak / 30) * 100, 100)
    case 'sessions_10': return Math.min((stats.totalSessions / 10) * 100, 100)
    case 'sessions_50': return Math.min((stats.totalSessions / 50) * 100, 100)
    case 'sessions_100': return Math.min((stats.totalSessions / 100) * 100, 100)
    case 'no_distractions': return Math.min((stats.noDistractionSessions / 5) * 100, 100)
    default: return 0
  }
}

async function checkAchievements(db: any, userId: string, stats: any, userAchievements: any[]) {
  const newAchievements = []
  
  // Check each achievement condition
  const checks = [
    { id: 'first_session', condition: stats.totalSessions >= 1 },
    { id: 'hour_focused', condition: stats.longestSession >= 3600 },
    { id: 'day_streak_3', condition: stats.currentStreak >= 3 },
    { id: 'day_streak_7', condition: stats.currentStreak >= 7 },
    { id: 'day_streak_30', condition: stats.currentStreak >= 30 },
    { id: 'perfect_focus', condition: stats.perfectFocusSessions >= 1 },
    { id: 'early_bird', condition: stats.earlyBirdSessions >= 1 },
    { id: 'night_owl', condition: stats.nightOwlSessions >= 1 },
    { id: 'sessions_10', condition: stats.totalSessions >= 10 },
    { id: 'sessions_50', condition: stats.totalSessions >= 50 },
    { id: 'sessions_100', condition: stats.totalSessions >= 100 },
    { id: 'no_distractions', condition: stats.noDistractionSessions >= 5 },
    { id: 'productivity_master', condition: stats.weeklyFocusAverage >= 90 }
  ]
  
  for (const check of checks) {
    if (check.condition && !userAchievements.find(ua => ua.achievementId === check.id)) {
      // Unlock achievement
      await db.collection('userAchievements').insertOne({
        userId,
        achievementId: check.id,
        unlockedAt: new Date()
      })
      
      const achievement = ACHIEVEMENTS.find(a => a.id === check.id)
      if (achievement) {
        newAchievements.push(achievement)
      }
    }
  }
  
  return newAchievements
}

function calculateWeeklyAverage(sessions: any[], weekStart: Date) {
  const weekSessions = sessions.filter((s: any) => new Date(s.createdAt) >= weekStart)
  if (weekSessions.length === 0) return 0
  return Math.round(weekSessions.reduce((acc: number, s: any) => acc + s.focusPercentage, 0) / weekSessions.length)
}

async function getCurrentStreak(db: any, userId: string) {
  // Implementation from analytics route
  const sessions = await db
    .collection('sessions')
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray()
  
  if (sessions.length === 0) return 0
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    
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