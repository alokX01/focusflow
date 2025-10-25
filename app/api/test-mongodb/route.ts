import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('focusflow')
    
    // Perform a simple operation
    const admin = db.admin()
    const result = await admin.ping()
    
    // Try to list collections
    const collections = await db.listCollections().toArray()
    
    return NextResponse.json({ 
      status: 'Connected',
      database: 'focusflow',
      collections: collections.map(c => c.name),
      message: 'MongoDB Atlas is working correctly!'
    })
  } catch (error: any) {
    console.error('MongoDB test error:', error)
    return NextResponse.json({ 
      status: 'Error',
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}