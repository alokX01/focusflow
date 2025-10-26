import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { apiResponse, apiError, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

// ============================================
// GET - Get User Statistics
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Aggregate statistics
    const pipeline = [
      { $match: { userId, isCompleted: true } },
      {
        $facet: {
          // Today's stats
          today: [
            { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
            {
              $group: {
                _id: null,
                sessions: { $sum: 1 },
                totalTime: { $sum: "$duration" },
                avgFocus: { $avg: "$focusPercentage" },
              },
            },
          ],

          // Weekly stats
          week: [
            { $match: { createdAt: { $gte: weekAgo } } },
            {
              $group: {
                _id: null,
                avgFocus: { $avg: "$focusPercentage" },
              },
            },
          ],

          // Overall stats
          overall: [
            {
              $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                totalTime: { $sum: "$duration" },
                avgFocus: { $avg: "$focusPercentage" },
              },
            },
          ],

          // Best session
          bestSession: [
            { $sort: { focusPercentage: -1 } },
            { $limit: 1 },
            {
              $project: {
                focusPercentage: 1,
                duration: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
    ];

    const results = await db
      .collection("sessions")
      .aggregate(pipeline)
      .toArray();
    const data = results[0];

    // Calculate streak
    const streak = await calculateCurrentStreak(db, userId);

    // Format response
    const todayStats = data.today[0] || {
      sessions: 0,
      totalTime: 0,
      avgFocus: 0,
    };

    const weekStats = data.week[0] || { avgFocus: 0 };
    const overallStats = data.overall[0] || {
      totalSessions: 0,
      totalTime: 0,
      avgFocus: 0,
    };
    const bestSession = data.bestSession[0];

    return apiResponse({
      today: {
        sessions: todayStats.sessions,
        minutes: Math.round(todayStats.totalTime / 60),
        focusPercentage: Math.round(todayStats.avgFocus || 0),
      },
      week: {
        averageFocus: Math.round(weekStats.avgFocus || 0),
      },
      overall: {
        totalSessions: overallStats.totalSessions,
        totalHours: Math.round((overallStats.totalTime / 3600) * 10) / 10,
        averageFocus: Math.round(overallStats.avgFocus || 0),
      },
      streak: {
        current: streak,
        best: streak, // TODO: Store best streak separately
      },
      bestSession: bestSession
        ? {
            focusPercentage: bestSession.focusPercentage,
            duration: Math.round(bestSession.duration / 60),
            date: bestSession.createdAt,
          }
        : null,

      // Quick access for hooks
      todayFocus: Math.round(todayStats.avgFocus || 0),
      todayMinutes: Math.round(todayStats.totalTime / 60),
      todaySessions: todayStats.sessions,
      currentStreak: streak,
      weeklyAverage: Math.round(weekStats.avgFocus || 0),
      totalSessions: overallStats.totalSessions,
      totalHours: Math.round((overallStats.totalTime / 3600) * 10) / 10,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function calculateCurrentStreak(
  db: any,
  userId: string
): Promise<number> {
  // Get unique dates with sessions
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
  const todayStr = today.toISOString().split("T")[0];

  let streak = 0;
  let checkDate = new Date(today);

  // Check if today has a session
  const hasToday = dates.some((d: any) => d._id === todayStr);

  // If no session today, start from yesterday
  if (!hasToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive days
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const hasSession = dates.some((d: any) => d._id === dateStr);

    if (hasSession) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
