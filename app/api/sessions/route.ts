import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { z } from "zod";
import type {
  Session,
  CreateSessionInput,
  SessionsResponse,
} from "@/lib/models";

export const dynamic = "force-dynamic";

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

const CreateSessionSchema = z.object({
  targetDuration: z.number().min(1).max(240), // 1-240 minutes
  sessionType: z.enum(["focus", "break", "pomodoro"]).default("focus"),
  cameraEnabled: z.boolean().default(false),
  goal: z.string().max(200).optional(),
  tags: z.array(z.string()).max(10).default([]),
});

const SessionFiltersSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minFocus: z.number().min(0).max(100).optional(),
  sessionType: z.enum(["focus", "break", "pomodoro"]).optional(),
});

// ============================================
// GET - Fetch Sessions with Filtering
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user.email;
    const { searchParams } = new URL(request.url);

    // Parse and validate filters
    const filters = SessionFiltersSchema.parse({
      limit: parseInt(searchParams.get("limit") || "50"),
      offset: parseInt(searchParams.get("offset") || "0"),
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      minFocus: searchParams.get("minFocus")
        ? parseInt(searchParams.get("minFocus")!)
        : undefined,
      sessionType: searchParams.get("sessionType") || undefined,
    });

    const db = await getDatabase();

    // Build MongoDB query
    const query: any = { userId };

    if (filters.startDate || filters.endDate) {
      query.startTime = {};
      if (filters.startDate) query.startTime.$gte = new Date(filters.startDate);
      if (filters.endDate) query.startTime.$lte = new Date(filters.endDate);
    }

    if (filters.minFocus !== undefined) {
      query.focusPercentage = { $gte: filters.minFocus };
    }

    if (filters.sessionType) {
      query.sessionType = filters.sessionType;
    }

    // Fetch sessions with pagination
    const sessions = await db
      .collection<Session>("sessions")
      .find(query)
      .sort({ startTime: -1 })
      .limit(filters.limit)
      .skip(filters.offset)
      .toArray();

    // Get total count
    const totalCount = await db.collection("sessions").countDocuments(query);

    // Calculate statistics
    const stats = {
      totalSessions: totalCount,
      totalMinutes: Math.round(
        sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60
      ),
      averageFocus:
        sessions.length > 0
          ? Math.round(
              sessions.reduce((acc, s) => acc + s.focusPercentage, 0) /
                sessions.length
            )
          : 0,
      completionRate:
        sessions.length > 0
          ? Math.round(
              (sessions.filter((s) => s.isCompleted).length / sessions.length) *
                100
            )
          : 0,
    };

    const response: SessionsResponse = {
      sessions: sessions.map((s) => ({
        ...s,
        _id: s._id.toString() as any,
      })),
      stats,
      pagination: {
        total: totalCount,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < totalCount,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid filters", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create New Session
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user.email;
    const body = await request.json();

    // Validate input
    const validated = CreateSessionSchema.parse(body);

    const db = await getDatabase();

    const newSession: Session = {
      _id: new ObjectId(),
      userId,

      // Time tracking
      startTime: new Date(),
      endTime: null,
      duration: 0,
      targetDuration: validated.targetDuration * 60, // Convert to seconds

      // Focus metrics
      focusPercentage: 100,
      distractionCount: 0,
      focusScore: 0,

      // Session configuration
      sessionType: validated.sessionType,
      isCompleted: false,
      cameraEnabled: validated.cameraEnabled,
      goal: validated.goal,
      tags: validated.tags,

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("sessions").insertOne(newSession);

    // Update daily stats
    await updateDailyStats(db, userId, "session_started");

    return NextResponse.json(
      {
        session: { ...newSession, _id: newSession._id.toString() },
        message: "Session created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function updateDailyStats(
  db: any,
  userId: string,
  action: "session_started" | "session_completed"
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.collection("dailyStats").updateOne(
    { userId, date: today },
    {
      $inc: {
        sessionsStarted: action === "session_started" ? 1 : 0,
        sessionsCompleted: action === "session_completed" ? 1 : 0,
      },
      $set: { updatedAt: new Date() },
      $setOnInsert: {
        createdAt: new Date(),
        totalFocusTime: 0,
        totalBreakTime: 0,
        totalDistractions: 0,
      },
    },
    { upsert: true }
  );
}
