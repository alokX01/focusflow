import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id
      ? String((session.user as any).id)
      : "";
    const email = session.user.email?.toLowerCase() || "";
    const canonicalUserId = userId || email;

    const db = await getDatabase();

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let settings = canonicalUserId
      ? await db.collection("userSettings").findOne({ userId: canonicalUserId })
      : null;

    if (!settings && email && email !== canonicalUserId) {
      settings = await db.collection("userSettings").findOne({ userId: email });
    }

    const preferences = {
      ...(user.preferences || {}),
      focusGoal: Number(
        settings?.focusDuration ?? user.preferences?.focusGoal ?? 25
      ),
      breakDuration: Number(
        settings?.shortBreakDuration ?? user.preferences?.breakDuration ?? 5
      ),
      dailyTarget: Number(user.preferences?.dailyTarget ?? 4),
    };

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image || user.avatar || null,
        createdAt: user.createdAt || null,
        updatedAt: user.updatedAt || null,
        preferences,
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
    const userId = (session.user as any).id
      ? String((session.user as any).id)
      : "";
    const email = session.user.email?.toLowerCase() || "";
    const canonicalUserId = userId || email;

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

    const updates: Promise<any>[] = [
      db.collection("users").updateOne(
        { email: session.user.email },
        { $set: updateData }
      ),
    ];

    const settingsUpdate: Record<string, number> = {};
    if (typeof focusGoal === "number") {
      settingsUpdate.focusDuration = Math.max(5, Math.min(120, focusGoal));
    }
    if (typeof breakDuration === "number") {
      settingsUpdate.shortBreakDuration = Math.max(
        1,
        Math.min(30, breakDuration)
      );
    }

    if (canonicalUserId && Object.keys(settingsUpdate).length > 0) {
      updates.push(
        db.collection("userSettings").updateOne(
          { userId: canonicalUserId },
          {
            $set: {
              ...settingsUpdate,
              userId: canonicalUserId,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        )
      );
    }

    const [result] = await Promise.all(updates);

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
