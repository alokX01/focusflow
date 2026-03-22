import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
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
    }, { projection: { timeline: 1, duration: 1, focusPercentage: 1, distractionCount: 1 } });
    if (!s) {
      return NextResponse.json({ ok: false, timeline: [] }, { status: 404 });
    }

    // Timeline format: [{ t: number, focused: boolean, confidence?: number }, ...]
    const raw = Array.isArray(s.timeline) ? s.timeline : [];
    const timeline =
      raw.length > 0
        ? downsampleTimeline(raw)
        : buildSyntheticTimeline(
            Number(s.duration || 0),
            Number(s.focusPercentage || 0),
            Number(s.distractionCount || 0)
          );

    return NextResponse.json({ ok: true, timeline });
  } catch (e: any) {
    console.error("timeline error:", e);
    return NextResponse.json({ ok: false, timeline: [] }, { status: 500 });
  }
}

function downsampleTimeline(timeline: any[]) {
  const maxPoints = 1200;
  const step =
    timeline.length > maxPoints ? Math.ceil(timeline.length / maxPoints) : 1;
  return step > 1
    ? timeline.filter((_: any, i: number) => i % step === 0)
    : timeline;
}

function buildSyntheticTimeline(
  durationSec: number,
  focusPercentage: number,
  distractionCount: number
) {
  const duration = Math.max(60, Math.round(durationSec || 0));
  const points = Math.min(300, Math.max(20, Math.ceil(duration / 5)));
  const step = Math.max(1, Math.floor(duration / points));
  const focusedTarget = Math.round(
    (Math.max(0, Math.min(100, focusPercentage)) / 100) * points
  );
  const offBlocks = Math.max(1, Math.min(points, distractionCount || 1));
  const offStride = Math.max(2, Math.floor(points / offBlocks));

  const samples: Array<{ t: number; focused: boolean; confidence: number }> =
    [];
  for (let i = 0; i < points; i++) {
    const t = Math.min(duration, i * step);
    const inFocusBudget = i < focusedTarget;
    const distractorPulse =
      (i % offStride === 0 && i > 0) || (i % offStride === 1 && i > 0);
    const focused = inFocusBudget && !distractorPulse;

    samples.push({
      t,
      focused,
      confidence: focused ? 0.8 : 0.3,
    });
  }

  return samples;
}
