import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { DistractionEvent } from '@/lib/models'
import { ObjectId, UpdateFilter } from 'mongodb'

// Define your session type if not already
interface Session {
  _id: ObjectId
  distractions?: DistractionEvent[]
  distractionCount?: number
  updatedAt?: Date
}

export const dynamic = 'force-dynamic'

// POST /api/sessions/[id]/distractions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { type, duration, description } = body

    if (!type || !duration) {
      return NextResponse.json(
        { error: 'Type and duration are required' },
        { status: 400 }
      )
    }

    const distraction: DistractionEvent = {
      timestamp: new Date(),
      type,
      duration,
      description
    }

    const db = await getDatabase()

    // Type-safe update object
    const update: UpdateFilter<Session> = {
      $push: { distractions: distraction },
      $inc: { distractionCount: 1 },
      $set: { updatedAt: new Date() }
    }

    const result = await db
      .collection<Session>('sessions')
      .updateOne({ _id: new ObjectId(params.id) }, update)

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      distraction,
      message: 'Distraction added successfully'
    })
  } catch (error) {
    console.error('Error adding distraction:', error)
    return NextResponse.json({ error: 'Failed to add distraction' }, { status: 500 })
  }
}
