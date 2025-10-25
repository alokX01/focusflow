import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // TODO: Replace with your DB logic
    const userSettings = {
      focusDuration: 25,
      breakDuration: 5,
      cameraEnabled: true,
    };

    return NextResponse.json({ settings: userSettings });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, ...settings } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // ✅ Save settings to DB (mock example)
    console.log("Saving settings for:", userId, settings);

    // You’d normally do:
    // await db.settings.update({ where: { userId }, data: settings })

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
