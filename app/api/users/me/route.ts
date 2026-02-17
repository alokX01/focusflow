import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user.email;
    const db = await getDatabase();

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image || user.avatar || null,
        createdAt: user.createdAt || null,
        updatedAt: user.updatedAt || null,
        preferences: user.preferences || {},
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, focusGoal, breakDuration, dailyTarget } = body;

    const db = await getDatabase();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (typeof name === "string" && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (typeof focusGoal === "number") {
      updateData["preferences.focusGoal"] = focusGoal;
    }
    if (typeof breakDuration === "number") {
      updateData["preferences.breakDuration"] = breakDuration;
    }
    if (typeof dailyTarget === "number") {
      updateData["preferences.dailyTarget"] = dailyTarget;
    }

    const result = await db
      .collection("users")
      .updateOne({ email: session.user.email }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
