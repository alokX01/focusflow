import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getDatabase } from '@/lib/mongodb'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'

// GET all sessions with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = (session.user as any).id || session.user.email
    const { searchParams } = new URL(request.url)
    
    // Filtering options
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minFocus = searchParams.get('minFocus')
    
    const db = await getDatabase()
    
    // Build query
    const query: any = { userId }
    
    if (startDate || endDate) {
      query.startTime = {}
      if (startDate) query.startTime.$gte = new Date(startDate)
      if (endDate) query.startTime.$lte = new Date(endDate)
    }
    
    if (minFocus) {
      query.focusPercentage = { $gte: parseInt(minFocus) }
    }
    
    const sessions = await db
      .collection('sessions')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .toArray()
    
    // Get total count for pagination
    const totalCount = await db
      .collection('sessions')
      .countDocuments(query)
    
    // Calculate summary stats
    const stats = {
      totalSessions: totalCount,
      totalMinutes: sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60,
      averageFocus: sessions.length > 0 
        ? Math.round(sessions.reduce((acc, s) => acc + s.focusPercentage, 0) / sessions.length)
        : 0,
      completionRate: sessions.length > 0
        ? Math.round((sessions.filter(s => s.isCompleted).length / sessions.length) * 100)
        : 0
    }
    
    return NextResponse.json({ 
      sessions: sessions.map(s => ({ ...s, _id: s._id.toString() })),
      stats,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

// POST - Create new session with enhanced tracking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = (session.user as any).id || session.user.email
    const body = await request.json()
    const { 
      targetDuration, 
      sessionType = 'focus', 
      cameraEnabled = false,
      goal,
      tags = []
    } = body
    
    const db = await getDatabase()
    
    // Get user settings for defaults
    const userSettings = await db
      .collection('userSettings')
      .findOne({ userId })
    
    const newSession = {
      _id: new ObjectId(),
      userId,
      
      // Time tracking
      startTime: new Date(),
      endTime: null,
      duration: 0,
      targetDuration: targetDuration * 60, // Convert to seconds
      
      // Focus metrics
      focusPercentage: 100,
      distractionCount: 0,
      distractions: [],
      focusScore: 0,
      
      // Session info
      sessionType,
      isCompleted: false,
      cameraEnabled,
      goal,
      tags,
      
      // Device & environment
      deviceInfo: {
        userAgent: request.headers.get('user-agent'),
        platform: body.platform || 'web',
        screenResolution: body.screenResolution
      },
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await db.collection('sessions').insertOne(newSession)
    
    // Update daily stats
    await updateDailyStats(db, userId, 'session_started')
    
    // Log activity
    await db.collection('activityLogs').insertOne({
      userId,
      action: 'session_started',
      sessionId: newSession._id,
      timestamp: new Date()
    })
    
    return NextResponse.json({
      session: { ...newSession, _id: newSession._id.toString() },
      message: 'Session created successfully'
    })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

// Helper function to update daily stats
async function updateDailyStats(db: any, userId: string, action: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  await db.collection('dailyStats').updateOne(
    { userId, date: today },
    {
      $inc: {
        sessionsStarted: action === 'session_started' ? 1 : 0,
        sessionsCompleted: action === 'session_completed' ? 1 : 0
      },
      $set: { updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  )
}