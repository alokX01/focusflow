// app/api/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateSessionSchema = z.object({
  targetDuration: z.number().min(1).max(240),
  sessionType: z.enum(["focus", "break", "pomodoro"]).default("focus"),
  cameraEnabled: z.boolean().default(false),
  task: z.string().max(200).optional(),
  tags: z.array(z.string()).max(10).default([]),
});

// --------------------------------------------
// DATE FILTER LOGIC
// --------------------------------------------

function getStartDateFromPeriod(period?: string | null): Date | undefined {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  switch (period) {
    case "week":
      now.setDate(now.getDate() - now.getDay());
      return now;

    case "month":
      now.setDate(1);
      return now;

    case "quarter":
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      now.setMonth(quarterStart, 1);
      return now;

    case "year":
      now.setMonth(0, 1);
      return now;

    default:
      return undefined;
  }
}

// --------------------------------------------
// GET ALL SESSIONS
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id || session.user.email;
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period");
    const archived = searchParams.get("archived");

    const db = await getDatabase();

    const query: any = { userId };

    // Archived filter
    if (archived === "true") query.isArchived = true;
    else query.isArchived = { $ne: true };

    // Time filtering
    const startDate = getStartDateFromPeriod(period);
    if (startDate) query.startTime = { $gte: startDate };

    // Fetch sessions
    const sessions = await db
      .collection("sessions")
      .find(query)
      .sort({ startTime: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({
      sessions: sessions.map((s) => ({ ...s, _id: s._id.toString() })),
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// CREATE NEW SESSION
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id || session.user.email;
    const body = await request.json();

    const validated = CreateSessionSchema.parse(body);
    const db = await getDatabase();

    const newSession: any = {
      userId,
      startTime: new Date(),
      endTime: null,
      duration: 0,

      targetDuration: validated.targetDuration * 60, // convert min → sec

      pausedDuration: 0,
      focusPercentage: 100,
      distractionCount: 0,
      focusScore: 0,

      sessionType: validated.sessionType,
      isCompleted: false,
      cameraEnabled: validated.cameraEnabled,

      task: validated.task || "",
      tags: validated.tags,
      goal: "",

      isArchived: false,
      timeline: [],

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("sessions").insertOne(newSession);

    await updateDailyStats(db, userId, "session_started");

    return NextResponse.json(
      {
        session: {
          ...newSession,
          _id: result.insertedId.toString(),
        },
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

// --------------------------------------------
// HELPER: Update Daily Stats
// --------------------------------------------

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
