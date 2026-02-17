import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { apiResponse, apiError, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return apiError("Unauthorized", 401);

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const pipeline = [
      { $match: { userId, isCompleted: true, isArchived: { $ne: true } } },
      {
        $facet: {
          today: [
            { $match: { startTime: { $gte: today, $lt: tomorrow } } },
            {
              $group: {
                _id: null,
                sessions: { $sum: 1 },
                totalTime: { $sum: "$duration" },
                avgFocus: { $avg: "$focusPercentage" },
              },
            },
          ],
          week: [
            { $match: { startTime: { $gte: weekAgo } } },
            {
              $group: {
                _id: null,
                avgFocus: { $avg: "$focusPercentage" },
              },
            },
          ],
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
          bestSession: [
            { $sort: { focusPercentage: -1, duration: -1 } },
            { $limit: 1 },
            {
              $project: {
                focusPercentage: 1,
                duration: 1,
                startTime: 1,
              },
            },
          ],
        },
      },
    ];

    const [data] = await db.collection("sessions").aggregate(pipeline).toArray();
    const { current: currentStreak, best: bestStreak } = await calculateStreaks(
      db,
      userId
    );

    const todayStats = data?.today?.[0] || { sessions: 0, totalTime: 0, avgFocus: 0 };
    const weekStats = data?.week?.[0] || { avgFocus: 0 };
    const overallStats = data?.overall?.[0] || {
      totalSessions: 0,
      totalTime: 0,
      avgFocus: 0,
    };
    const bestSession = data?.bestSession?.[0] || null;

    const totalFocusTimeMinutes = Math.round((overallStats.totalTime || 0) / 60);
    const averageFocus = Math.round(overallStats.avgFocus || 0);

    return apiResponse({
      today: {
        sessions: todayStats.sessions,
        minutes: Math.round((todayStats.totalTime || 0) / 60),
        focusPercentage: Math.round(todayStats.avgFocus || 0),
      },
      week: {
        averageFocus: Math.round(weekStats.avgFocus || 0),
      },
      overall: {
        totalSessions: overallStats.totalSessions,
        totalHours: Math.round(((overallStats.totalTime || 0) / 3600) * 10) / 10,
        averageFocus,
      },
      streak: {
        current: currentStreak,
        best: bestStreak,
      },
      bestSession: bestSession
        ? {
            focusPercentage: bestSession.focusPercentage,
            duration: Math.round(bestSession.duration / 60),
            date: bestSession.startTime,
          }
        : null,

      // For existing hooks/components
      todayFocus: Math.round(todayStats.avgFocus || 0),
      todayMinutes: Math.round((todayStats.totalTime || 0) / 60),
      todaySessions: todayStats.sessions,
      currentStreak,
      weeklyAverage: Math.round(weekStats.avgFocus || 0),
      totalSessions: overallStats.totalSessions,
      totalHours: Math.round(((overallStats.totalTime || 0) / 3600) * 10) / 10,

      // For profile page
      totalFocusTime: totalFocusTimeMinutes,
      averageFocus,
      bestStreak,
      achievements: [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function calculateStreaks(db: any, userId: string): Promise<{ current: number; best: number }> {
  const dates = await db
    .collection("sessions")
    .aggregate([
      { $match: { userId, isCompleted: true, isArchived: { $ne: true } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 3650 },
    ])
    .toArray();

  if (dates.length === 0) return { current: 0, best: 0 };

  const parsed = dates
    .map((d: any) => new Date(`${d._id}T00:00:00.000Z`))
    .filter((d: Date) => !Number.isNaN(d.getTime()))
    .sort((a: Date, b: Date) => a.getTime() - b.getTime());

  let best = 1;
  let run = 1;
  for (let i = 1; i < parsed.length; i++) {
    const prev = parsed[i - 1];
    const curr = parsed[i];
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      run++;
      best = Math.max(best, run);
    } else if (diffDays > 1) {
      run = 1;
    }
  }

  const daySet = new Set(dates.map((d: any) => d._id));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayKey = cursor.toISOString().split("T")[0];
  let current = 0;

  if (!daySet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = cursor.toISOString().split("T")[0];
    if (!daySet.has(key)) break;
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, best: Math.max(best, current) };
}
