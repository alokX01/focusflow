import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Auth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, timeline: [] }, { status: 401 });
    }
    const userId = (session.user as any).id || session.user.email;

    // Validate id
    const sessionId = params.id;
    if (!ObjectId.isValid(sessionId)) {
      return NextResponse.json({ ok: false, timeline: [] }, { status: 400 });
    }

    // DB fetch
    const db = await getDatabase();
    const s = await db.collection("sessions").findOne({
      _id: new ObjectId(sessionId),
      userId,
    });
    if (!s) {
      return NextResponse.json({ ok: false, timeline: [] }, { status: 404 });
    }

    // Timeline format: [{ t: number, focused: boolean, confidence?: number }, ...]
    const timeline = Array.isArray(s.timeline) ? s.timeline : [];
    return NextResponse.json({ ok: true, timeline });
  } catch (e: any) {
    console.error("timeline error:", e);
    return NextResponse.json({ ok: false, timeline: [] }, { status: 500 });
  }
}
