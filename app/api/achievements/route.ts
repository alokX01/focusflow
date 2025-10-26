import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: "milestone" | "streak" | "quality" | "time";
  points: number;
  icon: string;
  target?: number;
}

const ACHIEVEMENTS: Achievement[] = [
  // Milestones
  {
    id: "first_session",
    name: "First Steps",
    description: "Complete your first focus session",
    category: "milestone",
    points: 10,
    icon: "🎯",
    target: 1,
  },
  {
    id: "sessions_10",
    name: "Getting Started",
    description: "Complete 10 sessions",
    category: "milestone",
    points: 20,
    icon: "🚀",
    target: 10,
  },
  {
    id: "sessions_50",
    name: "Dedicated",
    description: "Complete 50 sessions",
    category: "milestone",
    points: 50,
    icon: "💪",
    target: 50,
  },
  {
    id: "sessions_100",
    name: "Centurion",
    description: "Complete 100 sessions",
    category: "milestone",
    points: 100,
    icon: "👑",
    target: 100,
  },

  // Streaks
  {
    id: "streak_3",
    name: "Consistent",
    description: "Maintain a 3-day streak",
    category: "streak",
    points: 30,
    icon: "🔥",
    target: 3,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 7-day streak",
    category: "streak",
    points: 50,
    icon: "⚡",
    target: 7,
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintain a 30-day streak",
    category: "streak",
    points: 100,
    icon: "🏆",
    target: 30,
  },

  // Quality
  {
    id: "perfect_focus",
    name: "Laser Focus",
    description: "Complete a session with 100% focus",
    category: "quality",
    points: 25,
    icon: "🎯",
  },
  {
    id: "no_distractions_5",
    name: "Undistracted",
    description: "Complete 5 sessions without distractions",
    category: "quality",
    points: 40,
    icon: "🧘",
    target: 5,
  },
  {
    id: "productivity_master",
    name: "Productivity Master",
    description: "Maintain 90%+ focus for a week",
    category: "quality",
    points: 75,
    icon: "⭐",
  },

  // Time-based
  {
    id: "hour_focused",
    name: "Deep Diver",
    description: "Focus for 1 hour straight",
    category: "time",
    points: 20,
    icon: "⏱️",
    target: 3600,
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Start a session before 6 AM",
    category: "time",
    points: 15,
    icon: "🌅",
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Complete a session after 10 PM",
    category: "time",
    points: 15,
    icon: "🦉",
  },
];

// ============================================
// API HANDLER
// ============================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    // Fetch user achievements and stats in parallel
    const [userAchievements, stats] = await Promise.all([
      db.collection("userAchievements").find({ userId }).toArray(),
      getUserStats(db, userId),
    ]);

    // Check for new achievements
    const newAchievements = await checkAndUnlockAchievements(
      db,
      userId,
      stats,
      userAchievements
    );

    // Map achievements with progress
    const allAchievements = ACHIEVEMENTS.map((achievement) => {
      const userAch = userAchievements.find(
        (ua) => ua.achievementId === achievement.id
      );
      return {
        ...achievement,
        unlocked: !!userAch,
        unlockedAt: userAch?.unlockedAt || null,
        progress: getAchievementProgress(
          achievement.id,
          stats,
          achievement.target
        ),
      };
    });

    // Group by category
    const grouped = allAchievements.reduce((acc, ach) => {
      if (!acc[ach.category]) acc[ach.category] = [];
      acc[ach.category].push(ach);
      return acc;
    }, {} as Record<string, typeof allAchievements>);

    // Calculate totals
    const totalPoints = userAchievements.reduce((sum, ua) => {
      const ach = ACHIEVEMENTS.find((a) => a.id === ua.achievementId);
      return sum + (ach?.points || 0);
    }, 0);

    const level = Math.floor(totalPoints / 100) + 1;
    const nextLevelPoints = level * 100;
    const progressToNextLevel = ((totalPoints % 100) / 100) * 100;

    return NextResponse.json({
      achievements: allAchievements,
      grouped,
      newAchievements,
      stats: {
        totalPoints,
        level,
        nextLevelPoints,
        progressToNextLevel,
        unlockedCount: userAchievements.length,
        totalCount: ACHIEVEMENTS.length,
      },
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getUserStats(db: any, userId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Aggregate stats in single query
  const pipeline = [
    { $match: { userId, isCompleted: true } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalSessions: { $sum: 1 },
              perfectFocus: {
                $sum: { $cond: [{ $eq: ["$focusPercentage", 100] }, 1, 0] },
              },
              noDistractions: {
                $sum: { $cond: [{ $eq: ["$distractionCount", 0] }, 1, 0] },
              },
              maxDuration: { $max: "$duration" },
            },
          },
        ],
        timeBasedSessions: [
          {
            $project: {
              hour: { $hour: "$startTime" },
              createdAt: 1,
            },
          },
        ],
        weeklyAverage: [
          { $match: { createdAt: { $gte: weekAgo } } },
          {
            $group: {
              _id: null,
              avgFocus: { $avg: "$focusPercentage" },
            },
          },
        ],
      },
    },
  ];

  const results = await db.collection("sessions").aggregate(pipeline).toArray();
  const data = results[0];

  const totals = data.totals[0] || {};
  const timeBasedSessions = data.timeBasedSessions || [];
  const weeklyAvg = data.weeklyAverage[0] || {};

  return {
    totalSessions: totals.totalSessions || 0,
    perfectFocusSessions: totals.perfectFocus || 0,
    noDistractionSessions: totals.noDistractions || 0,
    longestSession: totals.maxDuration || 0,
    earlyBirdSessions: timeBasedSessions.filter((s: any) => s.hour < 6).length,
    nightOwlSessions: timeBasedSessions.filter((s: any) => s.hour >= 22).length,
    weeklyFocusAverage: Math.round(weeklyAvg.avgFocus || 0),
    currentStreak: await calculateStreak(db, userId),
  };
}

function getAchievementProgress(
  achievementId: string,
  stats: any,
  target?: number
): number {
  const progressMap: Record<string, number> = {
    first_session: Math.min((stats.totalSessions / 1) * 100, 100),
    sessions_10: Math.min((stats.totalSessions / 10) * 100, 100),
    sessions_50: Math.min((stats.totalSessions / 50) * 100, 100),
    sessions_100: Math.min((stats.totalSessions / 100) * 100, 100),
    streak_3: Math.min((stats.currentStreak / 3) * 100, 100),
    streak_7: Math.min((stats.currentStreak / 7) * 100, 100),
    streak_30: Math.min((stats.currentStreak / 30) * 100, 100),
    hour_focused: Math.min((stats.longestSession / 3600) * 100, 100),
    no_distractions_5: Math.min((stats.noDistractionSessions / 5) * 100, 100),
    perfect_focus: stats.perfectFocusSessions > 0 ? 100 : 0,
    productivity_master: Math.min((stats.weeklyFocusAverage / 90) * 100, 100),
    early_bird: stats.earlyBirdSessions > 0 ? 100 : 0,
    night_owl: stats.nightOwlSessions > 0 ? 100 : 0,
  };

  return Math.round(progressMap[achievementId] || 0);
}

async function checkAndUnlockAchievements(
  db: any,
  userId: string,
  stats: any,
  userAchievements: any[]
) {
  const newAchievements = [];
  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

  const checks: Record<string, boolean> = {
    first_session: stats.totalSessions >= 1,
    sessions_10: stats.totalSessions >= 10,
    sessions_50: stats.totalSessions >= 50,
    sessions_100: stats.totalSessions >= 100,
    streak_3: stats.currentStreak >= 3,
    streak_7: stats.currentStreak >= 7,
    streak_30: stats.currentStreak >= 30,
    hour_focused: stats.longestSession >= 3600,
    perfect_focus: stats.perfectFocusSessions >= 1,
    no_distractions_5: stats.noDistractionSessions >= 5,
    productivity_master: stats.weeklyFocusAverage >= 90,
    early_bird: stats.earlyBirdSessions >= 1,
    night_owl: stats.nightOwlSessions >= 1,
  };

  // Batch insert new achievements
  const toInsert = [];

  for (const [achievementId, unlocked] of Object.entries(checks)) {
    if (unlocked && !unlockedIds.has(achievementId)) {
      toInsert.push({
        userId,
        achievementId,
        unlockedAt: new Date(),
      });

      const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
      if (achievement) {
        newAchievements.push(achievement);
      }
    }
  }

  if (toInsert.length > 0) {
    await db.collection("userAchievements").insertMany(toInsert);
  }

  return newAchievements;
}

async function calculateStreak(db: any, userId: string): Promise<number> {
  // Optimized: Only get unique dates, not all sessions
  const pipeline = [
    { $match: { userId, isCompleted: true } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 365 },
  ];

  const dates = await db.collection("sessions").aggregate(pipeline).toArray();

  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const hasSession = dates.some((d) => d._id === dateStr);

    if (hasSession) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (i > 0) {
      // Allow for today to not have a session yet
      break;
    } else {
      // Check yesterday if today doesn't have a session
      currentDate.setDate(currentDate.getDate() - 1);
    }
  }

  return streak;
}
