import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ============================================
// VALIDATION SCHEMA
// ============================================

const DailyAnalyticsSchema = z.object({
  userId: z.string().optional(), // Optional for backward compatibility
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD
});

// ============================================
// GET DAILY ANALYTICS
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user.email;
    const { searchParams } = new URL(request.url);

    // Validate input
    const params = DailyAnalyticsSchema.parse({
      date: searchParams.get("date") || undefined,
    });

    // Parse target date
    const targetDate = params.date ? new Date(params.date) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const db = await getDatabase();

    // Aggregate all daily stats in single query
    const pipeline = [
      {
        $match: {
          userId,
          createdAt: { $gte: dayStart, $lte: dayEnd },
        },
      },
      {
        $facet: {
          // Session statistics
          stats: [
            {
              $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                completedSessions: {
                  $sum: { $cond: ["$isCompleted", 1, 0] },
                },
                totalFocusTime: { $sum: "$duration" },
                totalDistractions: { $sum: "$distractionCount" },
                avgFocusPercentage: { $avg: "$focusPercentage" },
                maxFocusPercentage: { $max: "$focusPercentage" },
                longestSession: { $max: "$duration" },
              },
            },
          ],

          // Hourly breakdown
          hourlyBreakdown: [
            {
              $group: {
                _id: { $hour: "$startTime" },
                sessions: { $sum: 1 },
                avgFocus: { $avg: "$focusPercentage" },
                totalTime: { $sum: "$duration" },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // Session types
          sessionTypes: [
            {
              $group: {
                _id: "$sessionType",
                count: { $sum: 1 },
                totalTime: { $sum: "$duration" },
              },
            },
          ],

          // Tags used
          topTags: [
            { $unwind: { path: "$tags", preserveNullAndEmptyArrays: false } },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ];

    const results = await db
      .collection("sessions")
      .aggregate(pipeline)
      .toArray();
    const data = results[0];

    const stats = data.stats[0] || {
      totalSessions: 0,
      completedSessions: 0,
      totalFocusTime: 0,
      totalDistractions: 0,
      avgFocusPercentage: 0,
      maxFocusPercentage: 0,
      longestSession: 0,
    };

    // Get user's daily goal
    const userSettings = await db
      .collection("userSettings")
      .findOne({ userId });
    const dailyGoalSeconds = (userSettings?.dailyGoal || 25) * 60;

    // Check if stored in analytics collection
    const existingAnalytics = await db.collection("dailyAnalytics").findOne({
      userId,
      date: dayStart,
    });

    const dailyAnalytics = {
      userId,
      date: dayStart,

      // Core stats
      totalSessions: stats.totalSessions,
      completedSessions: stats.completedSessions,
      totalFocusTime: stats.totalFocusTime,
      totalDistractions: stats.totalDistractions,

      // Averages
      averageFocusPercentage: Math.round(stats.avgFocusPercentage || 0),
      maxFocusPercentage: stats.maxFocusPercentage || 0,
      longestSession: stats.longestSession || 0,

      // Goals
      dailyGoal: dailyGoalSeconds,
      goalAchieved: stats.totalFocusTime >= dailyGoalSeconds,
      goalProgress: Math.min(
        Math.round((stats.totalFocusTime / dailyGoalSeconds) * 100),
        100
      ),

      // Breakdowns
      hourlyBreakdown: data.hourlyBreakdown.map((h: any) => ({
        hour: h._id,
        sessions: h.sessions,
        avgFocus: Math.round(h.avgFocus),
        totalTime: h.totalTime,
      })),

      sessionTypes: data.sessionTypes.map((st: any) => ({
        type: st._id,
        count: st.count,
        totalTime: st.totalTime,
      })),

      topTags: data.topTags.map((t: any) => ({
        tag: t._id,
        count: t.count,
      })),

      // Metadata
      updatedAt: new Date(),
      ...(!existingAnalytics && { createdAt: new Date() }),
    };

    // Upsert analytics record for caching
    await db
      .collection("dailyAnalytics")
      .updateOne(
        { userId, date: dayStart },
        { $set: dailyAnalytics },
        { upsert: true }
      );

    // Get comparison with previous day
    const previousDay = new Date(dayStart);
    previousDay.setDate(previousDay.getDate() - 1);

    const previousDayAnalytics = await db.collection("dailyAnalytics").findOne({
      userId,
      date: previousDay,
    });

    const comparison = previousDayAnalytics
      ? {
          sessionsChange:
            stats.totalSessions - previousDayAnalytics.totalSessions,
          focusTimeChange:
            stats.totalFocusTime - previousDayAnalytics.totalFocusTime,
          focusPercentageChange: Math.round(
            stats.avgFocusPercentage -
              previousDayAnalytics.averageFocusPercentage
          ),
          distractionsChange:
            stats.totalDistractions - previousDayAnalytics.totalDistractions,
        }
      : null;

    return NextResponse.json({
      dailyAnalytics,
      comparison,
      insights: generateInsights(dailyAnalytics),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error fetching daily analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily analytics" },
      { status: 500 }
    );
  }
}

// ============================================
// INSIGHTS GENERATOR
// ============================================

function generateInsights(analytics: any): string[] {
  const insights: string[] = [];

  // Goal achievement
  if (analytics.goalAchieved) {
    insights.push("🎉 Daily goal achieved!");
  } else if (analytics.goalProgress >= 80) {
    insights.push("💪 Almost there! Keep going!");
  }

  // Focus quality
  if (analytics.averageFocusPercentage >= 90) {
    insights.push("🌟 Excellent focus quality today!");
  } else if (analytics.averageFocusPercentage < 60) {
    insights.push("💡 Try reducing distractions for better focus");
  }

  // Session count
  if (analytics.totalSessions === 0) {
    insights.push("🚀 Start your first session today!");
  } else if (analytics.totalSessions >= 5) {
    insights.push("🔥 Great productivity today!");
  }

  // Distractions
  if (analytics.totalDistractions === 0 && analytics.totalSessions > 0) {
    insights.push("✨ Zero distractions - perfect focus!");
  } else if (analytics.totalDistractions > 10) {
    insights.push("⚠️ High distraction count - consider Do Not Disturb mode");
  }

  // Time-based insights
  const peakHours = analytics.hourlyBreakdown
    ?.sort((a: any, b: any) => b.avgFocus - a.avgFocus)
    .slice(0, 2);

  if (peakHours?.length > 0) {
    const hour = peakHours[0].hour;
    const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    insights.push(`⏰ You're most focused in the ${period}`);
  }

  return insights;
}
