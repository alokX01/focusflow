import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const AnalyticsQuerySchema = z.object({
  period: z.enum(["week", "month", "year", "all"]).default("week"),
  includeCharts: z.boolean().default(true),
  includeInsights: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);

    const query = AnalyticsQuerySchema.parse({
      period: searchParams.get("period") || "week",
      includeCharts: searchParams.get("includeCharts") !== "false",
      includeInsights: searchParams.get("includeInsights") !== "false",
    });

    if (!session?.user) {
      return NextResponse.json({
        analytics: getDemoData(query.period),
        isDemo: true,
      });
    }

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();
    const { startDate, endDate } = getDateRange(query.period);

    const [baseAnalytics, streak, todayFocus, recentSessionTimeline] =
      await Promise.all([
        fetchAnalytics(
          db,
          userId,
          startDate,
          endDate,
          query.period,
          query.includeCharts
        ),
        calculateStreak(db, userId),
        getTodayFocus(db, userId),
        getRecentSessionTimeline(db, userId),
      ]);

    const analytics: any = {
      ...baseAnalytics,
      streak,
      todayFocus,
      recentSessionTimeline,
    };

    if (query.includeInsights) {
      analytics.insights = generateInsights(analytics);
    }

    return NextResponse.json({
      analytics,
      period: query.period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      isDemo: false,
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json(
      {
        analytics: getDemoData("week"),
        error: "Failed to fetch analytics, showing demo data",
        isDemo: true,
      },
      { status: 500 }
    );
  }
}

async function fetchAnalytics(
  db: any,
  userId: string,
  start: Date,
  end: Date,
  period: string,
  includeCharts: boolean
) {
  const pipeline: any[] = [
    {
      $match: {
        userId,
        isArchived: { $ne: true },
        startTime: { $gte: start, $lte: end },
      },
    },
    {
      $facet: {
        stats: [
          {
            $group: {
              _id: null,
              totalSessions: { $sum: 1 },
              completedSessions: { $sum: { $cond: ["$isCompleted", 1, 0] } },
              totalMinutes: {
                $sum: { $divide: [{ $ifNull: ["$duration", 0] }, 60] },
              },
              avgFocusPercentage: { $avg: "$focusPercentage" },
              totalDistractions: { $sum: "$distractionCount" },
              perfectSessions: {
                $sum: { $cond: [{ $gte: ["$focusPercentage", 100] }, 1, 0] },
              },
              bestSessionMinutes: {
                $max: { $divide: [{ $ifNull: ["$duration", 0] }, 60] },
              },
            },
          },
        ],
        dailyData: includeCharts
          ? [
              {
                $group: {
                  _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
                  },
                  sessions: { $sum: 1 },
                  focus: { $avg: "$focusPercentage" },
                  minutes: { $sum: { $divide: ["$duration", 60] } },
                  distractions: { $sum: "$distractionCount" },
                },
              },
              { $sort: { _id: 1 } },
            ]
          : [],
        hourlyDistribution: includeCharts
          ? [
              {
                $project: {
                  hour: { $dateToString: { format: "%H:00", date: "$startTime" } },
                  distractions: { $ifNull: ["$distractionCount", 0] },
                },
              },
              {
                $group: {
                  _id: "$hour",
                  sessions: { $sum: 1 },
                  distractions: { $sum: "$distractions" },
                },
              },
              { $sort: { _id: 1 } },
            ]
          : [],
        topTags: [
          { $unwind: { path: "$tags", preserveNullAndEmptyArrays: false } },
          { $group: { _id: "$tags", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ];

  const result = (await db.collection("sessions").aggregate(pipeline).toArray())[0] || {};

  const stats = result?.stats?.[0] || {
    totalSessions: 0,
    completedSessions: 0,
    totalMinutes: 0,
    avgFocusPercentage: 0,
    totalDistractions: 0,
    perfectSessions: 0,
    bestSessionMinutes: 0,
  };

  const dailyData = formatDailyData(result.dailyData || [], start, end, period);

  const hourlyDistribution =
    result.hourlyDistribution?.map((x: any) => ({
      hour: x._id,
      sessions: x.sessions,
      distractions: x.distractions,
    })) || [];

  return {
    totalSessions: stats.totalSessions,
    completedSessions: stats.completedSessions,
    totalMinutes: Math.round(stats.totalMinutes),
    totalHours: +(stats.totalMinutes / 60).toFixed(1),
    averageFocus: Math.round(stats.avgFocusPercentage || 0),
    completionRate:
      stats.totalSessions > 0
        ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
        : 0,
    perfectSessions: stats.perfectSessions,
    perfectRate:
      stats.totalSessions > 0
        ? Math.round((stats.perfectSessions / stats.totalSessions) * 100)
        : 0,
    totalDistractions: stats.totalDistractions,
    avgDistractionPerSession:
      stats.totalSessions > 0
        ? +(stats.totalDistractions / stats.totalSessions).toFixed(1)
        : 0,
    bestSessionMinutes: Math.round(stats.bestSessionMinutes || 0),
    dailyData,
    hourlyDistribution,
    peakHours: hourlyDistribution
      .slice()
      .sort((a: any, b: any) => b.distractions - a.distractions)
      .slice(0, 3),
    topTags:
      result.topTags?.map((t: any) => ({
        tag: t._id,
        count: t.count,
      })) || [],
  };
}

function getDateRange(period: string) {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "week":
      start.setDate(end.getDate() - 6);
      break;
    case "month":
      start.setDate(end.getDate() - 29);
      break;
    case "year":
      start.setDate(end.getDate() - 364);
      break;
    case "all":
      start.setFullYear(2020);
      break;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { startDate: start, endDate: end };
}

function formatDailyData(raw: any[], start: Date, end: Date, period: string) {
  const map = new Map(raw.map((d) => [d._id, d]));
  const result: any[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const key = cursor.toISOString().split("T")[0];
    const d = map.get(key);
    result.push({
      day: cursor.toLocaleDateString("en-US", { weekday: "short" }),
      date: key,
      focus: d ? Math.round(d.focus) : 0,
      sessions: d?.sessions || 0,
      minutes: d ? Math.round(d.minutes || 0) : 0,
      distractions: d?.distractions || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  if (period === "week") return result.slice(-7);
  if (period === "month") return result.slice(-30);
  if (period === "year") return result.slice(-365);
  return result;
}

async function calculateStreak(db: any, userId: string) {
  const sessions = await db
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
      { $sort: { _id: -1 } },
    ])
    .toArray();

  if (!sessions.length) return 0;

  const sessionDates = new Set(sessions.map((s: any) => s._id));
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  let streak = 0;

  while (true) {
    const key = date.toISOString().split("T")[0];
    if (!sessionDates.has(key)) break;
    streak++;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

async function getTodayFocus(db: any, userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const result = await db
    .collection("sessions")
    .aggregate([
      {
        $match: {
          userId,
          isArchived: { $ne: true },
          startTime: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          avgFocus: { $avg: "$focusPercentage" },
        },
      },
    ])
    .toArray();

  return result[0] ? Math.round(result[0].avgFocus || 0) : 0;
}

async function getRecentSessionTimeline(db: any, userId: string) {
  const latest = await db.collection("sessions").findOne(
    {
      userId,
      isArchived: { $ne: true },
      timeline: { $exists: true, $ne: [] },
    },
    { sort: { startTime: -1 } }
  );
  return Array.isArray(latest?.timeline) ? latest.timeline : [];
}

function getDemoData(period: string) {
  const days =
    period === "week"
      ? 7
      : period === "month"
      ? 30
      : period === "year"
      ? 365
      : 60;

  return {
    totalSessions: 10,
    completedSessions: 8,
    totalMinutes: 540,
    totalHours: 9,
    averageFocus: 74,
    completionRate: 80,
    perfectSessions: 1,
    perfectRate: 10,
    totalDistractions: 18,
    avgDistractionPerSession: 1.8,
    bestSessionMinutes: 45,
    streak: 0,
    todayFocus: 0,
    recentSessionTimeline: [],
    dailyData: Array.from({ length: days }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.toISOString().split("T")[0],
        sessions: Math.floor(Math.random() * 2),
        focus: Math.round(Math.random() * 100),
        minutes: Math.floor(Math.random() * 60),
        distractions: Math.floor(Math.random() * 5),
      };
    }),
    hourlyDistribution: [
      { hour: "09:00", sessions: 3, distractions: 2 },
      { hour: "14:00", sessions: 2, distractions: 4 },
    ],
    peakHours: [{ hour: "14:00", sessions: 2, distractions: 4 }],
    topTags: [{ tag: "Study", count: 4 }],
  };
}

function generateInsights(analytics: any) {
  const insights: string[] = [];

  if (analytics.averageFocus > 80) {
    insights.push("Great consistency. Your focus levels are strong.");
  }
  if ((analytics.streak || 0) >= 3) {
    insights.push("You are on a productivity streak. Keep the momentum.");
  }
  if ((analytics.perfectSessions || 0) > 0) {
    insights.push("You logged distraction-free sessions. Strong control.");
  }
  if ((analytics.avgDistractionPerSession || 0) <= 1) {
    insights.push("Your setup is optimized for focus.");
  }
  if (insights.length === 0) {
    insights.push("Keep completing sessions to unlock more personalized insights.");
  }

  return insights;
}
