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

const SettingsSchema = z.object({
  // Timer
  focusDuration: z.number().min(5).max(120).optional(),
  shortBreakDuration: z.number().min(1).max(30).optional(),
  longBreakDuration: z.number().min(5).max(60).optional(),
  autoStartBreaks: z.boolean().optional(),
  autoStartPomodoros: z.boolean().optional(),

  // Pomodoro rhythm
  pomodorosBeforeLongBreak: z.number().min(1).max(12).optional(),

  // Focus Detection
  cameraEnabled: z.boolean().optional(),
  distractionThreshold: z.number().min(1).max(10).optional(),
  pauseOnDistraction: z.boolean().optional(),

  previewEnabled: z.boolean().optional(),
  overlayEnabled: z.boolean().optional(),
  mirrorVideo: z.boolean().optional(),

  minFocusConfidence: z.number().min(0).max(100).optional(),
  focusGainPerSec: z.number().min(0).max(20).optional(),
  defocusLossPerSec: z.number().min(0).max(40).optional(),
  noFaceLossPerSec: z.number().min(0).max(40).optional(),

  // Notifications
  soundEnabled: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
  breakReminders: z.boolean().optional(),
  eyeStrainReminders: z.boolean().optional(),

  // Privacy
  dataRetention: z.number().min(7).max(365).optional(),
  localProcessing: z.boolean().optional(),
  analyticsSharing: z.boolean().optional(),

  // Appearance
  theme: z.enum(["light", "dark", "system"]).optional(),
  reducedMotion: z.boolean().optional(),
});

// ============================================
// GET - Fetch User Settings
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const userId = (session.user as any).id
      ? String((session.user as any).id)
      : "";
    const email = session.user.email?.toLowerCase();
    const db = await getDatabase();

    let settings = userId
      ? await db.collection("userSettings").findOne({ userId })
      : null;

    if (!settings && email) {
      settings = await db.collection("userSettings").findOne({ userId: email });

      // Migrate legacy email-based settings to id-based
      if (settings && userId) {
        await db
          .collection("userSettings")
          .updateOne(
            { _id: settings._id },
            { $set: { userId, updatedAt: new Date() } }
          );
        settings = { ...settings, userId };
      }
    }

    if (!settings) {
      return apiError("Settings not found", 404);
    }

    // Remove MongoDB _id and metadata
    const { _id, createdAt, updatedAt, ...userSettings } = settings;

    return apiResponse({ settings: userSettings });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// PUT - Update User Settings
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const userId = (session.user as any).id
      ? String((session.user as any).id)
      : "";
    const email = session.user.email?.toLowerCase();
    const body = await request.json();

    // Validate input
    const validated = SettingsSchema.parse(body);

    const db = await getDatabase();

    let existing = userId
      ? await db.collection("userSettings").findOne({ userId })
      : null;

    if (!existing && email) {
      existing = await db.collection("userSettings").findOne({ userId: email });
    }

    const canonicalUserId = userId || email;
    if (!canonicalUserId) {
      return apiError("User identifier missing", 400);
    }

    // Update settings
    const result = await db.collection("userSettings").findOneAndUpdate(
      existing ? { _id: existing._id } : { userId: canonicalUserId },
      {
        $set: {
          ...validated,
          userId: canonicalUserId,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    if (!result) {
      return apiError("Failed to update settings", 500);
    }

    const { _id, createdAt, updatedAt, ...userSettings } = result;

    return apiResponse(
      { settings: userSettings },
      200,
      "Settings updated successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// DELETE - Reset Settings to Default
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const userId = (session.user as any).id
      ? String((session.user as any).id)
      : "";
    const email = session.user.email?.toLowerCase();
    const canonicalUserId = userId || email;
    if (!canonicalUserId) {
      return apiError("User identifier missing", 400);
    }
    const db = await getDatabase();

    // Delete existing settings
    if (userId) {
      await db.collection("userSettings").deleteOne({ userId });
    }
    if (email && email !== userId) {
      await db.collection("userSettings").deleteOne({ userId: email });
    }

    // Create default settings
    const defaultSettings = {
      userId: canonicalUserId,
      // Timer
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      autoStartBreaks: false,
      autoStartPomodoros: false,

      // Focus Detection
      cameraEnabled: false,
      distractionThreshold: 3,
      pauseOnDistraction: true,

      previewEnabled: true,
      overlayEnabled: true,
      mirrorVideo: true,
      minFocusConfidence: 35,
      focusGainPerSec: 1.2,
      defocusLossPerSec: 4.0,
      noFaceLossPerSec: 6.0,

      // Notifications
      soundEnabled: true,
      desktopNotifications: true,
      breakReminders: true,
      eyeStrainReminders: true,

      // Privacy
      dataRetention: 30,
      localProcessing: true,
      analyticsSharing: false,

      // Appearance
      theme: "system",
      reducedMotion: false,

      // Pomodoro rhythm
      pomodorosBeforeLongBreak: 4,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("userSettings").insertOne(defaultSettings);

    const { createdAt, updatedAt, ...userSettings } = defaultSettings;

    return apiResponse(
      { settings: userSettings },
      200,
      "Settings reset to defaults"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
