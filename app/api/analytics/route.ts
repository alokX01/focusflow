import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ============================================
// VALIDATION
// ============================================

const AnalyticsQuerySchema = z.object({
  period: z.enum(["week", "month", "year", "all"]).default("week"),
  includeCharts: z.boolean().default(true),
  includeInsights: z.boolean().default(true),
});

// ============================================
// MAIN HANDLER
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);

    // Validate query params
    const query = AnalyticsQuerySchema.parse({
      period: searchParams.get("period") || "week",
      includeCharts: searchParams.get("includeCharts") !== "false",
      includeInsights: searchParams.get("includeInsights") !== "false",
    });

    // Return demo data for unauthenticated users
    if (!session?.user) {
      return NextResponse.json({
        analytics: getDemoData(query.period),
        isDemo: true,
      });
    }

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    // Calculate date range
    const { startDate, endDate } = getDateRange(query.period);

    // Fetch analytics with aggregation pipeline
    const analytics = await fetchAnalytics(
      db,
      userId,
      startDate,
      endDate,
      query.period,
      query.includeCharts
    );

    // Add insights if requested
    if (query.includeInsights) {
      (analytics as any).insights = generateInsights(analytics);
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error fetching analytics:", error);

    // Graceful fallback to demo data
    const period = new URL(request.url).searchParams.get("period") || "week";
    return NextResponse.json({
      analytics: getDemoData(period as any),
      isDemo: true,
      error: "Failed to fetch user data, showing demo",
    });
  }
}

// ============================================
// CORE ANALYTICS FETCHER
// ============================================

async function fetchAnalytics(
  db: any,
  userId: string,
  startDate: Date,
  endDate: Date,
  period: string,
  includeCharts: boolean
) {
  // Main aggregation pipeline
  const pipeline = [
    {
      $match: {
        userId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $facet: {
        // Overall statistics
        stats: [
          {
            $group: {
              _id: null,
              totalSessions: { $sum: 1 },
              completedSessions: { $sum: { $cond: ["$isCompleted", 1, 0] } },
              totalMinutes: { $sum: { $divide: ["$duration", 60] } },
              avgFocusPercentage: { $avg: "$focusPercentage" },
              totalDistractions: { $sum: "$distractionCount" },
              perfectSessions: {
                $sum: { $cond: [{ $eq: ["$focusPercentage", 100] }, 1, 0] },
              },
            },
          },
        ],

        // Daily breakdown for charts
        dailyData: includeCharts
          ? [
              {
                $group: {
                  _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
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

        // Hourly distribution
        hourlyDistribution: includeCharts
          ? [
              {
                $group: {
                  _id: { $hour: "$startTime" },
                  count: { $sum: 1 },
                  avgFocus: { $avg: "$focusPercentage" },
                },
              },
              { $sort: { _id: 1 } },
            ]
          : [],

        // Top tags
        topTags: [
          { $unwind: { path: "$tags", preserveNullAndEmptyArrays: false } },
          { $group: { _id: "$tags", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],

        // Session types
        sessionTypes: [
          {
            $group: {
              _id: "$sessionType",
              count: { $sum: 1 },
              totalMinutes: { $sum: { $divide: ["$duration", 60] } },
            },
          },
        ],

        // Best performing days
        bestDays: [
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              avgFocus: { $avg: "$focusPercentage" },
              sessions: { $sum: 1 },
            },
          },
          { $match: { sessions: { $gte: 2 } } }, // At least 2 sessions
          { $sort: { avgFocus: -1 } },
          { $limit: 5 },
        ],
      },
    },
  ];

  const results = await db.collection("sessions").aggregate(pipeline).toArray();
  const data = results[0];

  const stats = data.stats[0] || {
    totalSessions: 0,
    completedSessions: 0,
    totalMinutes: 0,
    avgFocusPercentage: 0,
    totalDistractions: 0,
    perfectSessions: 0,
  };

  // Calculate streak
  const streak = await calculateStreak(db, userId);

  // Calculate today's focus
  const todayFocus = await getTodayFocus(db, userId);

  // Format daily data for charts
  const dailyData = formatDailyData(data.dailyData, startDate, endDate, period);

  return {
    // Core stats
    totalSessions: stats.totalSessions,
    completedSessions: stats.completedSessions,
    totalMinutes: Math.round(stats.totalMinutes),
    totalHours: Math.round((stats.totalMinutes / 60) * 10) / 10,
    averageFocus: Math.round(stats.avgFocusPercentage || 0),
    completionRate:
      stats.totalSessions > 0
        ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
        : 0,

    // Streak & recent
    streak,
    todayFocus,

    // Quality metrics
    perfectSessions: stats.perfectSessions,
    perfectRate:
      stats.totalSessions > 0
        ? Math.round((stats.perfectSessions / stats.totalSessions) * 100)
        : 0,
    totalDistractions: stats.totalDistractions,
    avgDistractionPerSession:
      stats.totalSessions > 0
        ? Math.round((stats.totalDistractions / stats.totalSessions) * 10) / 10
        : 0,

    // Charts
    ...(includeCharts && {
      dailyData,
      hourlyDistribution: data.hourlyDistribution.map((h: any) => ({
        hour: `${h._id}:00`,
        count: h.count,
        avgFocus: Math.round(h.avgFocus || 0),
      })),
      peakHours: findPeakHours(data.hourlyDistribution),
    }),

    // Categories
    topTags: data.topTags.map((t: any) => ({
      tag: t._id,
      count: t.count,
    })),

    sessionTypes: data.sessionTypes.map((st: any) => ({
      type: st._id,
      count: st.count,
      minutes: Math.round(st.totalMinutes),
    })),

    // Best days
    bestDays: data.bestDays.map((d: any) => ({
      date: d._id,
      avgFocus: Math.round(d.avgFocus),
      sessions: d.sessions,
    })),
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDateRange(period: string) {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "week":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case "all":
      startDate.setFullYear(2020); // Arbitrary far past date
      break;
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

function formatDailyData(
  rawData: any[],
  startDate: Date,
  endDate: Date,
  period: string
) {
  const dataMap = new Map(rawData.map((d) => [d._id, d]));
  const formatted = [];

  const current = new Date(startDate);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  while (current <= endDate) {
    const dateKey = current.toISOString().split("T")[0];
    const data = dataMap.get(dateKey);

    const label =
      period === "week"
        ? days[current.getDay()]
        : period === "month"
        ? current.getDate().toString()
        : `${current.getMonth() + 1}/${current.getDate()}`;

    formatted.push({
      day: label,
      date: dateKey,
      focus: data ? Math.round(data.focus) : 0,
      sessions: data?.sessions || 0,
      minutes: data ? Math.round(data.minutes) : 0,
      distractions: data?.distractions || 0,
    });

    current.setDate(current.getDate() + 1);

    // Limit data points for year view
    if (period === "year" && formatted.length >= 52) break;
  }

  return formatted;
}

function findPeakHours(hourlyData: any[]) {
  if (!hourlyData || hourlyData.length === 0) return [];

  return hourlyData
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((h) => ({
      hour: h._id,
      count: h.count,
      label: `${h._id}:00`,
    }));
}

async function calculateStreak(db: any, userId: string): Promise<number> {
  const pipeline = [
    { $match: { userId, isCompleted: true } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
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
  let checkDate = new Date(today);

  // Allow today to not have a session yet
  const todayStr = today.toISOString().split("T")[0];
  const hasToday = dates.some((d: { _id: string }) => d._id === todayStr);

  if (!hasToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const hasSession = dates.some((d: { _id: string }) => d._id === dateStr);

    if (hasSession) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

async function getTodayFocus(db: any, userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .collection("sessions")
    .aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: today, $lt: tomorrow },
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

  return result[0] ? Math.round(result[0].avgFocus) : 0;
}

function getTopTags(sessions: any[]) {
  const tagCounts: any = {}
  
  sessions.forEach(s => {
    if (s.tags && Array.isArray(s.tags)) {
      s.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    }
  })
  
  return Object.entries(tagCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }))
}

function getDistractionTypes(sessions: any[]) {
  const types: any = {}
  
  sessions.forEach(s => {
    if (s.distractions && Array.isArray(s.distractions)) {
      s.distractions.forEach((d: any) => {
        types[d.type] = (types[d.type] || 0) + 1
      })
    }
  })
  
  return Object.entries(types)
    .map(([type, count]) => ({ type, count }))
}

async function calculateStreak(db: any, userId: string) {
  const sessions = await db
    .collection('sessions')
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(365)
    .toArray()
  
  if (sessions.length === 0) return 0
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    checkDate.setHours(0, 0, 0, 0)
    
    const hasSession = sessions.some(s => {
      const sessionDate = new Date(s.createdAt)
      sessionDate.setHours(0, 0, 0, 0)
      return sessionDate.getTime() === checkDate.getTime()
    })
    
    if (hasSession) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  
  return streak
}