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

const DistractionSchema = z.object({
  type: z.enum(["away", "phone", "browser", "manual", "other"]),
  severity: z.number().min(1).max(10),
  note: z.string().max(200).optional(),
  timestamp: z.string().datetime().optional(),
});

// ============================================
// POST - Add Distraction to Session
// ============================================

export async function POST(
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
    const validated = DistractionSchema.parse(body);

    const db = await getDatabase();

    // Validate ObjectId
    if (!ObjectId.isValid(params.id)) {
      return apiError("Invalid session ID", 400);
    }

    // Verify session belongs to user
    const sessionData = await db.collection("sessions").findOne({
      _id: new ObjectId(params.id),
      userId,
    });

    if (!sessionData) {
      return apiError("Session not found", 404);
    }

    // Create distraction record
    const distraction = {
      _id: new ObjectId(),
      sessionId: new ObjectId(params.id),
      userId,
      type: validated.type,
      severity: validated.severity,
      note: validated.note,
      timestamp: validated.timestamp
        ? new Date(validated.timestamp)
        : new Date(),
      duration: 0, // Will be calculated later
      confidence: 80, // Default confidence
      createdAt: new Date(),
    };

    await db.collection("distractions").insertOne(distraction);

    // Update session distraction count
    await db.collection("sessions").updateOne(
      { _id: new ObjectId(params.id) },
      {
        $inc: { distractionCount: 1 },
        $set: { updatedAt: new Date() },
      }
    );

    return apiResponse(
      {
        distraction: {
          ...distraction,
          _id: distraction._id.toString(),
          sessionId: distraction.sessionId.toString(),
        },
      },
      201,
      "Distraction logged"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// GET - Get All Distractions for Session
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

    if (!ObjectId.isValid(params.id)) {
      return apiError("Invalid session ID", 400);
    }

    const db = await getDatabase();

    // Verify session belongs to user
    const sessionData = await db.collection("sessions").findOne({
      _id: new ObjectId(params.id),
      userId,
    });

    if (!sessionData) {
      return apiError("Session not found", 404);
    }

    // Get all distractions for this session
    const distractions = await db
      .collection("distractions")
      .find({ sessionId: new ObjectId(params.id) })
      .sort({ timestamp: 1 })
      .toArray();

    return apiResponse({
      distractions: distractions.map((d) => ({
        ...d,
        _id: d._id.toString(),
        sessionId: d.sessionId.toString(),
      })),
      count: distractions.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
