import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { apiResponse, apiError, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Timeline schema
const TimelineSampleSchema = z.object({
  t: z.number().min(0),
  focused: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
});

// Session update schema
const UpdateSessionSchema = z.object({
  duration: z.number().min(0).optional(),
  focusPercentage: z.number().min(0).max(100).optional(),
  distractionCount: z.number().min(0).optional(),
  isCompleted: z.boolean().optional(),
  endTime: z.string().datetime().optional(),
  task: z.string().max(200).optional().transform((v) => (v ? v.trim() : v)),
  tags: z.array(z.string()).max(10).optional(),
  isArchived: z.boolean().optional(),
  timeline: z.array(TimelineSampleSchema).optional(),
});

// GET SINGLE SESSION
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return apiError("Unauthorized", 401);

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    if (!ObjectId.isValid(params.id)) return apiError("Invalid session ID", 400);

    const sessionData = await db.collection("sessions").findOne({
      _id: new ObjectId(params.id),
      userId,
    });

    if (!sessionData) return apiError("Session not found", 404);

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

// PATCH – UPDATE SESSION
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return apiError("Unauthorized", 401);

    const userId = (session.user as any).id || session.user.email;
    const body = await req.json();

    const validated = UpdateSessionSchema.parse(body);
    const db = await getDatabase();

    if (!ObjectId.isValid(params.id)) return apiError("Invalid session ID", 400);

    const updateData: any = { ...validated, updatedAt: new Date() };

    if (validated.endTime) updateData.endTime = new Date(validated.endTime);

    if (validated.isCompleted && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }

    const result = await db.collection("sessions").findOneAndUpdate(
      { _id: new ObjectId(params.id), userId },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) return apiError("Session not found", 404);

    if (validated.isCompleted) await updateDailyStats(db, userId);

    return apiResponse({
      session: { ...result, _id: result._id.toString() },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE SESSION
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return apiError("Unauthorized", 401);

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    if (!ObjectId.isValid(params.id)) return apiError("Invalid session ID", 400);

    const [sessionResult, distractionsResult] = await Promise.all([
      db.collection("sessions").deleteOne({ _id: new ObjectId(params.id), userId }),
      db.collection("distractions").deleteMany({ sessionId: new ObjectId(params.id) }),
    ]);

    if (sessionResult.deletedCount === 0) return apiError("Session not found", 404);

    return apiResponse({
      deleted: {
        session: sessionResult.deletedCount,
        distractions: distractionsResult.deletedCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Helper: update daily stats
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
