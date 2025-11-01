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

function generateInsights(analytics: any): string[] {
  const insights: string[] = [];

  // Streak insights
  if (analytics.streak >= 30) {
    insights.push("🔥 Amazing! 30+ day streak!");
  } else if (analytics.streak >= 7) {
    insights.push("💪 Great week streak!");
  } else if (analytics.streak === 0 && analytics.totalSessions > 0) {
    insights.push("🎯 Start a new streak today!");
  }

  // Focus quality
  if (analytics.averageFocus >= 90) {
    insights.push("⭐ Exceptional focus quality!");
  } else if (analytics.averageFocus >= 80) {
    insights.push("✨ Great focus overall!");
  } else if (analytics.averageFocus < 60 && analytics.totalSessions > 5) {
    insights.push("💡 Tip: Try shorter sessions to improve focus");
  }

  // Volume insights
  if (analytics.totalHours >= 40) {
    insights.push("🏆 Over 40 hours of focused work!");
  } else if (analytics.totalSessions >= 50) {
    insights.push("🚀 50+ sessions completed!");
  }

  // Completion rate
  if (analytics.completionRate >= 90) {
    insights.push("✅ Excellent session completion rate!");
  } else if (analytics.completionRate < 50 && analytics.totalSessions > 10) {
    insights.push("⚠️ Many incomplete sessions - try setting realistic goals");
  }

  // Perfect sessions
  if (analytics.perfectSessions > 0) {
    const rate = analytics.perfectRate;
    if (rate >= 20) {
      insights.push(
        `🎯 ${analytics.perfectSessions} sessions with perfect focus!`
      );
    }
  }

  // Distractions
  if (analytics.avgDistractionPerSession === 0 && analytics.totalSessions > 0) {
    insights.push("🧘 Zero distractions - incredible!");
  } else if (analytics.avgDistractionPerSession > 5) {
    insights.push("📵 High distraction rate - try Do Not Disturb mode");
  }

  // Peak hours
  if (analytics.peakHours && analytics.peakHours.length > 0) {
    const peak = analytics.peakHours[0];
    const time =
      peak.hour < 12 ? "morning" : peak.hour < 17 ? "afternoon" : "evening";
    insights.push(`⏰ Most productive in the ${time}`);
  }

  return insights.slice(0, 5); // Limit to top 5
}

function getDemoData(period: string) {
  const days =
    period === "week"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : period === "month"
      ? Array.from({ length: 30 }, (_, i) => (i + 1).toString())
      : Array.from(
          { length: 12 },
          (_, i) =>
            [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ][i]
        );

  return {
    totalSessions: 42,
    completedSessions: 38,
    totalMinutes: 1260,
    totalHours: 21,
    averageFocus: 85,
    completionRate: 90,
    streak: 7,
    todayFocus: 88,
    perfectSessions: 8,
    perfectRate: 19,
    totalDistractions: 45,
    avgDistractionPerSession: 1.1,

    dailyData: days
      .slice(0, period === "week" ? 7 : period === "month" ? 30 : 12)
      .map((day, i) => ({
        day,
        date: new Date(Date.now() - (days.length - i) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        focus: Math.floor(Math.random() * 30) + 70,
        sessions: Math.floor(Math.random() * 5) + 1,
        minutes: Math.floor(Math.random() * 120) + 30,
        distractions: Math.floor(Math.random() * 5),
      })),

    hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      count: Math.floor(Math.random() * 5),
      avgFocus: Math.floor(Math.random() * 30) + 70,
    })),

    peakHours: [
      { hour: 9, count: 12, label: "9:00" },
      { hour: 14, count: 10, label: "14:00" },
      { hour: 19, count: 8, label: "19:00" },
    ],

    topTags: [
      { tag: "Work", count: 15 },
      { tag: "Study", count: 12 },
      { tag: "Reading", count: 8 },
      { tag: "Writing", count: 5 },
      { tag: "Creative", count: 2 },
    ],

    sessionTypes: [
      { type: "focus", count: 30, minutes: 900 },
      { type: "pomodoro", count: 10, minutes: 250 },
      { type: "break", count: 2, minutes: 10 },
    ],

    bestDays: [
      { date: "2024-01-15", avgFocus: 98, sessions: 5 },
      { date: "2024-01-12", avgFocus: 95, sessions: 4 },
      { date: "2024-01-10", avgFocus: 92, sessions: 6 },
    ],

    insights: [
      "🔥 Great week streak!",
      "✨ Great focus overall!",
      "⏰ Most productive in the morning",
    ],
  };
}
