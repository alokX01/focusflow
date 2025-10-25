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
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json, csv
    const dataType = searchParams.get('type') || 'all' // all, sessions, analytics
    
    const db = await getDatabase()
    
    // Gather all user data
    const userData: any = {
      profile: await db.collection('users').findOne({ email: session.user.email }),
      settings: await db.collection('userSettings').findOne({ userId }),
      sessions: await db.collection('sessions').find({ userId }).toArray(),
      achievements: await db.collection('userAchievements').find({ userId }).toArray(),
      dailyStats: await db.collection('dailyStats').find({ userId }).toArray()
    }
    
    // Remove sensitive data
    if (userData.profile) {
      delete userData.profile.password
      delete userData.profile._id
    }
    
    if (format === 'csv' && dataType === 'sessions') {
      // Convert sessions to CSV
      const csv = convertSessionsToCSV(userData.sessions)
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="focusflow-sessions-${Date.now()}.csv"`
        }
      })
    }
    
    // Return JSON
    let exportData = userData
    if (dataType === 'sessions') {
      exportData = { sessions: userData.sessions }
    } else if (dataType === 'analytics') {
      exportData = { dailyStats: userData.dailyStats, achievements: userData.achievements }
    }
    
    return NextResponse.json({
      data: exportData,
      exportedAt: new Date(),
      user: session.user.email
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}

function convertSessionsToCSV(sessions: any[]) {
  const headers = [
    'Date',
    'Start Time',
    'End Time',
    'Duration (minutes)',
    'Focus %',
    'Distractions',
    'Type',
    'Completed',
    'Goal',
    'Tags'
  ]
  
  const rows = sessions.map(s => [
    new Date(s.createdAt).toLocaleDateString(),
    new Date(s.startTime).toLocaleTimeString(),
    s.endTime ? new Date(s.endTime).toLocaleTimeString() : 'N/A',
    Math.round(s.duration / 60),
    s.focusPercentage,
    s.distractionCount,
    s.sessionType,
    s.isCompleted ? 'Yes' : 'No',
    s.goal || '',
    (s.tags || []).join(', ')
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  
  return csvContent
}