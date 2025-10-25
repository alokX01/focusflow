import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getDatabase } from '@/lib/mongodb'
import { authOptions } from '@/lib/auth'
import { FocusSession } from '@/lib/models'
import { ObjectId, WithId, Filter } from 'mongodb'

export const dynamic = 'force-dynamic'

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  try {
    new ObjectId(id)
    return true
  } catch {
    return false
  }
}

// Type for params (handle both sync and async params)
type Params = {
  params: { id: string } | Promise<{ id: string }>
}

// GET /api/sessions/[id] - Get a specific session
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    // Handle both sync and async params
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams
    
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id || session.user.email
    
    // Validate the ID format
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    const db = await getDatabase()
    
    // Use proper typing for the filter
    const filter: Filter<FocusSession> = {
      _id: new ObjectId(id) as any,  // Type assertion to bypass the strict typing
      userId: userId
    }
    
    const focusSession = await db
      .collection<FocusSession>('sessions')
      .findOne(filter) as WithId<FocusSession> | null

    if (!focusSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Convert _id to string for frontend
    const sessionWithStringId = {
      ...focusSession,
      _id: focusSession._id.toString()
    }

    return NextResponse.json({ session: sessionWithStringId })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

// PUT /api/sessions/[id] - Update a session
export async function PUT(
  request: NextRequest,
  { params }: Params
) {
  try {
    // Handle both sync and async params
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams
    
    // Check authentication (optional for testing)
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('Warning: Updating session without authentication')
    }
    
    const userId = session?.user ? ((session.user as any).id || session.user.email) : null
    
    // Validate the ID format
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    const body = await request.json()
    const { 
      endTime, 
      duration, 
      focusPercentage, 
      distractionCount, 
      isCompleted,
      distractions 
    } = body

    // Build update object
    const updateData: Partial<FocusSession> = {
      updatedAt: new Date()
    }

    if (endTime !== undefined) updateData.endTime = new Date(endTime)
    if (duration !== undefined) updateData.duration = duration
    if (focusPercentage !== undefined) updateData.focusPercentage = focusPercentage
    if (distractionCount !== undefined) updateData.distractionCount = distractionCount
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted
    if (distractions !== undefined) updateData.distractions = distractions

    const db = await getDatabase()
    
    // Build query with proper typing
    const query: Filter<FocusSession> = { 
      _id: new ObjectId(id) as any 
    }
    
    if (userId) {
      query.userId = userId
    }
    
    // Perform the update
    const result = await db
      .collection<FocusSession>('sessions')
      .updateOne(query, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch and return the updated session
    const updatedSession = await db
      .collection<FocusSession>('sessions')
      .findOne({ _id: new ObjectId(id) as any }) as WithId<FocusSession> | null

    if (updatedSession) {
      return NextResponse.json({ 
        message: 'Session updated successfully',
        session: {
          ...updatedSession,
          _id: updatedSession._id.toString()
        }
      })
    }

    return NextResponse.json({ 
      message: 'Session updated successfully',
      updated: result.modifiedCount
    })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ 
      error: 'Failed to update session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/sessions/[id] - Delete a session
export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  try {
    // Handle both sync and async params
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams
    
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id || session.user.email
    
    // Validate the ID format
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    const db = await getDatabase()
    
    // Check ownership before deleting with proper typing
    const filter: Filter<FocusSession> = {
      _id: new ObjectId(id) as any,
      userId: userId
    }
    
    const existingSession = await db
      .collection<FocusSession>('sessions')
      .findOne(filter) as WithId<FocusSession> | null

    if (!existingSession) {
      return NextResponse.json({ 
        error: 'Session not found or unauthorized' 
      }, { status: 404 })
    }

    // Delete the session
    const result = await db
      .collection<FocusSession>('sessions')
      .deleteOne(filter)

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'Session deleted successfully',
      deletedId: id
    })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}