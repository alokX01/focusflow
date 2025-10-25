import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { User } from '@/lib/models'

export const dynamic = 'force-dynamic'

// GET /api/users - Get user profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const db = await getDatabase()
    const user = await db
      .collection<User>('users')
      .findOne({ _id: userId })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// POST /api/users - Create or update user profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, name, avatar } = body

    if (!userId || !email || !name) {
      return NextResponse.json(
        { error: 'User ID, email, and name are required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Check if user already exists
    const existingUser = await db
      .collection<User>('users')
      .findOne({ _id: userId })

    const userData: User = {
      _id: userId,
      email,
      name,
      avatar,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date()
    }

    let result
    if (existingUser) {
      result = await db
        .collection<User>('users')
        .updateOne(
          { _id: userId },
          { $set: userData }
        )
    } else {
      result = await db
        .collection<User>('users')
        .insertOne(userData)
    }

    return NextResponse.json({ 
      user: userData,
      message: existingUser ? 'User updated successfully' : 'User created successfully'
    })
  } catch (error) {
    console.error('Error saving user:', error)
    return NextResponse.json({ error: 'Failed to save user' }, { status: 500 })
  }
}
