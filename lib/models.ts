import { ObjectId } from 'mongodb'

export interface User {
  _id?: ObjectId
  email: string
  name: string
  password?: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface FocusSession {
  _id?: ObjectId
  userId: string
  
  // Time tracking
  startTime: Date
  endTime?: Date
  duration: number // in seconds
  targetDuration: number // in seconds
  
  // Focus metrics
  focusPercentage: number
  focusScore: number
  distractionCount: number
  distractions: DistractionEvent[]
  
  // Session info
  sessionType: 'focus' | 'break' | 'longBreak'
  isCompleted: boolean
  cameraEnabled: boolean
  goal?: string
  tags?: string[]
  notes?: string
  
  // Device & environment
  deviceInfo?: {
    userAgent?: string
    platform?: string
    screenResolution?: string
  }
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface DistractionEvent {
  timestamp: Date
  type: 'phone' | 'away' | 'distracted' | 'talking' | 'multitasking' | 'other'
  duration: number // in seconds
  severity: 'low' | 'medium' | 'high'
  description?: string
}

export interface UserSettings {
  _id?: ObjectId
  userId: string
  
  // Timer settings
  focusDuration: number // minutes
  breakDuration: number // minutes
  longBreakDuration: number // minutes
  sessionsBeforeLongBreak: number
  
  // Goals
  dailyGoalMinutes: number
  weeklyGoalHours: number
  
  // Features
  cameraEnabled: boolean
  soundEnabled: boolean
  notificationsEnabled: boolean
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  
  // Preferences
  theme: 'light' | 'dark' | 'system'
  clockFormat: '12h' | '24h'
  firstDayOfWeek: 'sunday' | 'monday'
  
  // Notifications
  reminderEnabled: boolean
  reminderTime: string // HH:mm format
  breakReminders: boolean
  
  // Privacy
  shareAnalytics: boolean
  publicProfile: boolean
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface DailyStats {
  _id?: ObjectId
  userId: string
  date: Date
  
  // Session stats
  sessionsStarted: number
  sessionsCompleted: number
  totalMinutes: number
  focusMinutes: number
  breakMinutes: number
  
  // Performance
  averageFocus: number
  distractionCount: number
  
  // Goals
  dailyGoalAchieved: boolean
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface Achievement {
  _id?: ObjectId
  id: string
  name: string
  description: string
  points: number
  icon?: string
  category: 'focus' | 'streak' | 'milestone' | 'special'
}

export interface UserAchievement {
  _id?: ObjectId
  userId: string
  achievementId: string
  unlockedAt: Date
  notified: boolean
}

export interface ActivityLog {
  _id?: ObjectId
  userId: string
  action: string
  details?: any
  sessionId?: string
  timestamp: Date
}

export interface WeeklyReport {
  _id?: ObjectId
  userId: string
  report: {
    period: {
      start: string
      end: string
    }
    summary: any
    improvements: any
    highlights: any
    recommendations: string[]
  }
  createdAt: Date
  sentAt?: Date
}