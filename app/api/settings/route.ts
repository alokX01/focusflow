import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const db = await getDatabase()
    
    if (session?.user) {
      const userId = (session.user as any).id || session.user.email
      
      // Get user settings
      const settings = await db.collection("userSettings").findOne({ userId })
      
      if (settings) {
        return NextResponse.json({ settings })
      }
    }
    
    // Return default settings
    const defaultSettings = {
      focusDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
      dailyGoalMinutes: 240,
      weeklyGoalHours: 20,
      
      // Features
      cameraEnabled: false,
      soundEnabled: true,
      notificationsEnabled: true,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      
      // Preferences
      theme: "system",
      clockFormat: "24h",
      firstDayOfWeek: "monday",
      
      // Notifications
      reminderEnabled: true,
      reminderTime: "09:00",
      breakReminders: true,
      
      // Privacy
      shareAnalytics: false,
      publicProfile: false
    }
    
    return NextResponse.json({ settings: defaultSettings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userId = (session.user as any).id || session.user.email
    const db = await getDatabase()
    
    // Update or create settings
    await db.collection("userSettings").updateOne(
      { userId },
      {
        $set: {
          ...body,
          userId,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    )
    
    // Log settings change
    await db.collection("activityLogs").insertOne({
      userId,
      action: "settings_updated",
      details: body,
      timestamp: new Date()
    })
    
    return NextResponse.json({ 
      message: "Settings saved successfully",
      settings: body 
    })
  } catch (error) {
    console.error("Error saving settings:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}