import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { hash } from "bcryptjs";
import { z } from "zod";
import { apiResponse, apiError, handleApiError } from "@/lib/api";

// ============================================
// VALIDATION SCHEMA
// ============================================

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// ============================================
// POST - Register New User
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validated = RegisterSchema.parse(body);

    const db = await getDatabase();

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({
      email: validated.email.toLowerCase(),
    });

    if (existingUser) {
      return apiError("User with this email already exists", 409);
    }

    // Hash password
    const hashedPassword = await hash(validated.password, 12);

    // Create user
    const newUser = {
      name: validated.name,
      email: validated.email.toLowerCase(),
      hashedPassword,
      emailVerified: null,
      image: null,
      provider: "credentials",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    // Create default settings
    await db.collection("userSettings").insertOne({
      userId: validated.email.toLowerCase(),
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      cameraEnabled: false,
      distractionThreshold: 3,
      pauseOnDistraction: true,
      soundEnabled: true,
      desktopNotifications: true,
      breakReminders: true,
      eyeStrainReminders: true,
      dataRetention: 30,
      localProcessing: true,
      analyticsSharing: false,
      theme: "system",
      reducedMotion: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return apiResponse(
      {
        user: {
          id: result.insertedId.toString(),
          name: newUser.name,
          email: newUser.email,
        },
      },
      201,
      "User registered successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
