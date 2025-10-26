import { ObjectId } from "mongodb";

// ============================================
// USER TYPES
// ============================================

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  hashedPassword?: string;
  provider?: "credentials" | "google" | "github";
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  _id: ObjectId;
  userId: string;

  // Timer Settings
  focusDuration: number; // minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;

  // Focus Detection
  cameraEnabled: boolean;
  distractionThreshold: number; // seconds
  pauseOnDistraction: boolean;
  sensitivity: "low" | "medium" | "high";

  // Notifications
  soundEnabled: boolean;
  desktopNotifications: boolean;
  breakReminders: boolean;
  eyeStrainReminders: boolean;

  // Privacy
  dataRetention: number; // days
  localProcessing: boolean;
  analyticsSharing: boolean;

  // Appearance
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SESSION TYPES
// ============================================

export interface Session {
  _id: ObjectId;
  userId: string;

  // Time Tracking
  startTime: Date;
  endTime: Date | null;
  duration: number; // seconds actually focused
  targetDuration: number; // seconds planned
  pausedDuration?: number; // time paused

  // Focus Metrics
  focusPercentage: number; // 0-100
  focusScore: number; // Calculated weighted score
  distractionCount: number;

  // Session Configuration
  sessionType: "focus" | "break" | "pomodoro";
  isCompleted: boolean;
  completedAt?: Date;

  // Optional Features
  cameraEnabled: boolean;
  goal?: string;
  tags?: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface Distraction {
  _id: ObjectId;
  sessionId: ObjectId | string;
  userId: string;
  timestamp: Date;
  duration: number; // seconds distracted
  type: "away" | "phone" | "browser" | "manual" | "other";
  severity: number; // 1-10
  confidence?: number; // AI confidence score
  note?: string;
  createdAt: Date;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface DailyStats {
  _id: ObjectId;
  userId: string;
  date: Date; // Normalized to start of day

  // Session Stats
  sessionsStarted: number;
  sessionsCompleted: number;
  totalFocusTime: number; // seconds
  totalBreakTime: number;

  // Focus Metrics
  averageFocusScore: number;
  totalDistractions: number;

  // Achievements
  longestStreak: number;
  perfectSessions: number; // 100% focus

  createdAt: Date;
  updatedAt: Date;
}

export interface Achievement {
  _id: ObjectId;
  userId: string;
  achievementId: string;
  type: "milestone" | "streak" | "quality" | "time";
  title: string;
  description: string;
  icon: string;
  points: number;
  unlockedAt: Date;
  progress?: number;
  target?: number;
}

export interface ActivityLog {
  _id: ObjectId;
  userId: string;
  action: string;
  sessionId?: ObjectId;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SessionsResponse {
  sessions: Session[];
  stats: {
    totalSessions: number;
    totalMinutes: number;
    averageFocus: number;
    completionRate: number;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AnalyticsResponse {
  daily: DailyStats[];
  summary: {
    totalFocusHours: number;
    averageDailyFocus: number;
    bestDay: Date;
    currentStreak: number;
    longestStreak: number;
  };
  charts?: {
    dailyData: any[];
    hourlyDistribution: any[];
  };
  insights?: string[];
}

// ============================================
// INPUT VALIDATION TYPES (for Zod)
// ============================================

export interface CreateSessionInput {
  targetDuration: number; // minutes
  sessionType?: "focus" | "break" | "pomodoro";
  cameraEnabled?: boolean;
  goal?: string;
  tags?: string[];
}

export interface UpdateSessionInput {
  duration?: number;
  focusPercentage?: number;
  distractionCount?: number;
  isCompleted?: boolean;
  endTime?: Date;
}

export interface SessionFilters {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  minFocus?: number;
  sessionType?: "focus" | "break" | "pomodoro";
}

export interface UserStatsResponse {
  todayFocus: number;
  todayMinutes: number;
  todaySessions: number;
  currentStreak: number;
  weeklyAverage: number;
  totalSessions: number;
  totalHours: number;
}

// ============================================
// HELPER TYPES
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithId<T> = T & { _id: string };

export type CollectionName =
  | "users"
  | "sessions"
  | "userSettings"
  | "distractions"
  | "dailyStats"
  | "achievements"
  | "userAchievements"
  | "activityLogs"
  | "dailyAnalytics";
