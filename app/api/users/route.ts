import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { apiResponse, apiError, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

// ============================================
// VALIDATION SCHEMA
// ============================================

const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  image: z.string().url().optional(),
  // Add other updatable fields
});

// ============================================
// GET - Get Current User
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    const user = await db.collection("users").findOne(
      { email: session.user.email },
      {
        projection: {
          hashedPassword: 0, // Don't send password hash
        },
      }
    );

    if (!user) {
      return apiError("User not found", 404);
    }

    return apiResponse({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// PUT - Update Current User
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const validated = UpdateUserSchema.parse(body);

    const db = await getDatabase();

    const result = await db.collection("users").findOneAndUpdate(
      { email: session.user.email },
      {
        $set: {
          ...validated,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        projection: {
          hashedPassword: 0,
        },
      }
    );

    if (!result) {
      return apiError("Failed to update user", 500);
    }

    return apiResponse(
      {
        user: {
          id: result._id.toString(),
          name: result.name,
          email: result.email,
          image: result.image,
          emailVerified: result.emailVerified,
        },
      },
      200,
      "Profile updated successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// DELETE - Delete Current User Account
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    // Delete user and all associated data
    await Promise.all([
      db.collection("users").deleteOne({ email: session.user.email }),
      db.collection("sessions").deleteMany({ userId }),
      db.collection("userSettings").deleteMany({ userId }),
      db.collection("distractions").deleteMany({ userId }),
      db.collection("dailyStats").deleteMany({ userId }),
      db.collection("dailyAnalytics").deleteMany({ userId }),
      db.collection("userAchievements").deleteMany({ userId }),
      db.collection("activityLogs").deleteMany({ userId }),
    ]);

    return apiResponse(null, 200, "Account deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
