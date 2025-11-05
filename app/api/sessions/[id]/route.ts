import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { apiResponse, apiError, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

// ============================================
// VALIDATION SCHEMA
// ============================================

// Schema for a single timeline sample (must match client-side definition)
const TimelineSampleSchema = z.object({
  t: z.number().min(0), // seconds since session start
  focused: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
});

const UpdateSessionSchema = z.object({
  duration: z.number().min(0).optional(),
  focusPercentage: z.number().min(0).max(100).optional(),
  distractionCount: z.number().min(0).optional(),
  isCompleted: z.boolean().optional(),
  endTime: z.string().datetime().optional(),
  // UPDATED: Changed 'goal' to 'task' to match your new logic and HistoryInterface
  task: z
    .string()
    .max(200)
    .optional()
    .transform((val) => (val !== undefined ? val.trim() : val)), // Added trim
  tags: z.array(z.string()).max(10).optional(),
  // ADDED: New field for soft delete (archiving)
  isArchived: z.boolean().optional(),
  timeline: z.array(TimelineSampleSchema).optional(),
});

// ============================================
// GET - Get Single Session
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    // Validate ObjectId
    if (!ObjectId.isValid(params.id)) {
      return apiError("Invalid session ID", 400);
    }

    const sessionData = await db.collection("sessions").findOne({
      _id: new ObjectId(params.id),
      userId,
    });

    if (!sessionData) {
      return apiError("Session not found", 404);
    }

    // Fetch distractions for this session
    const distractions = await db
      .collection("distractions")
      .find({ sessionId: new ObjectId(params.id) })
      .sort({ timestamp: 1 })
      .toArray();

    return apiResponse({
      session: {
        ...sessionData,
        _id: sessionData._id.toString(),
        distractions: distractions.map((d) => ({
          ...d,
          _id: d._id.toString(),
          sessionId: d.sessionId.toString(),
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// PATCH - Update Single Session
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const userId = (session.user as any).id || session.user.email;
    const body = await request.json();

    // Validate input
    // This will now accept { task: "..." } and { isArchived: true }
    // in addition to the session-end fields.
    const validated = UpdateSessionSchema.parse(body);

    const db = await getDatabase();

    // Validate ObjectId
    if (!ObjectId.isValid(params.id)) {
      return apiError("Invalid session ID", 400);
    }

    // Prepare update data
    // The 'validated' object will only contain the fields that were passed
    // and validated, so spreading it here is safe.
    const updateData: any = {
      ...validated,
      updatedAt: new Date(),
    };

    // Convert endTime string to Date if provided
    if (validated.endTime) {
      updateData.endTime = new Date(validated.endTime);
    }

    // Set completedAt if marking as completed
    if (validated.isCompleted && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }

    // Update session
    const result = await db.collection("sessions").findOneAndUpdate(
      {
        _id: new ObjectId(params.id),
        userId,
      },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) {
      return apiError("Session not found or update failed", 404);
    }

    // Update daily stats only if session is being marked as completed
    // This will NOT run if you are just archiving or changing the task.
    if (validated.isCompleted) {
      await updateDailyStats(db, userId);
    }

    return apiResponse(
      {
        session: {
          ...result,
          _id: result._id.toString(),
        },
      },
      200,
      "Session updated successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// DELETE - Delete Single Session
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    // Validate ObjectId
    if (!ObjectId.isValid(params.id)) {
      return apiError("Invalid session ID", 400);
    }

    // Delete session and associated distractions
    const [sessionResult, distractionsResult] = await Promise.all([
      db.collection("sessions").deleteOne({
        _id: new ObjectId(params.id),
        userId,
      }),
      db.collection("distractions").deleteMany({
        sessionId: new ObjectId(params.id),
      }),
    ]);

    if (sessionResult.deletedCount === 0) {
      return apiError("Session not found", 404);
    }

    return apiResponse(
      {
        deleted: {
          session: sessionResult.deletedCount,
          distractions: distractionsResult.deletedCount,
        },
      },
      200,
      "Session deleted successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function updateDailyStats(db: any, userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.collection("dailyStats").updateOne(
    { userId, date: today },
    {
      $inc: { sessionsCompleted: 1 },
      $set: { updatedAt: new Date() },
      $setOnInsert: {
        createdAt: new Date(),
        sessionsStarted: 0,
        totalFocusTime: 0,
        totalBreakTime: 0,
        totalDistractions: 0,
      },
    },
    { upsert: true }
  );
}
