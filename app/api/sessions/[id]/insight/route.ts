import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// Define the type for the summary object used by heuristic and LLMs
interface SessionSummary {
  durationMin: number;
  focusPct: number;
  distractions: number;
  baselineFocus: number;
  task: string;
}

// Ensure heuristic function is clearly defined
function heuristic(s: SessionSummary): string {
  if (s.focusPct < s.baselineFocus - 10) {
    return `Below your recent average (${s.focusPct.toFixed(2)}% vs ${
      s.baselineFocus
    }%). Try a shorter block and remove a top distraction (phone away, tighter to-do for ${
      s.task || "this task"
    }).`;
  }
  if (s.distractions >= 6) {
    return `Good effort, but ${s.distractions} distractions broke flow. Identify the main trigger and remove it next block (notifications off, door closed).`;
  }
  if (s.focusPct >= s.baselineFocus + 10) {
    return `Great result (${s.focusPct.toFixed(2)}% vs ${
      s.baselineFocus
    }% baseline). Repeat the same time and setup — you're onto a high-focus routine.`;
  }
  return `Solid focus. For the next block, make one small environmental upgrade (better lighting or fewer background motions) to push above ${Math.min(
    95,
    s.focusPct + 5
  )}%.`;
}

// Export dynamic setting
export const dynamic = "force-dynamic";

// Export the POST handler
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const sessionId = params.id;
    if (!ObjectId.isValid(sessionId)) {
      return NextResponse.json(
        { ok: false, insight: "Invalid session ID." },
        { status: 400 }
      );
    }

    // Use await for getServerSession
    const auth = await getServerSession(authOptions).catch(() => null);
    const userId = auth?.user ? (auth.user as any).id || auth.user.email : null;

    const db = await getDatabase();

    // lookup this session (scoped to user if logged in)
    const match: any = { _id: new ObjectId(sessionId) };
    if (userId) match.userId = userId;

    const s = await db.collection("sessions").findOne(match);
    if (!s) {
      return NextResponse.json(
        { ok: false, insight: "Session not found." },
        { status: 404 }
      );
    }

    // last 10 sessions for baseline (scoped to same user if possible)
    const recentMatch: any = {};
    if (userId) recentMatch.userId = userId;

    const recent = await db
      .collection("sessions")
      .find(recentMatch)
      .sort({ startTime: -1 })
      .limit(10)
      .toArray();

    // Ensure baseline calculation handles empty 'recent' array safely
    const totalFocus = recent.reduce(
      (sum, x) => sum + (x.focusPercentage || 0),
      0
    );
    const baselineFocus =
      recent.length > 0 ? Math.round(totalFocus / recent.length) : 0;

    const summary: SessionSummary = {
      durationMin: Math.round((s.duration || 0) / 60),
      focusPct: s.focusPercentage || 0,
      distractions: s.distractionCount || 0,
      task: s.task || "",
      baselineFocus,
    };

    // --- API Key Logic ---
    const openai_key = process.env.OPENAI_API_KEY;
    const google_key = process.env.GOOGLE_API_KEY;

    // 1. Try OpenAI first
    if (openai_key) {
      try {
        const prompt = `
You are a concise focus coach. Provide a 2-3 sentence actionable insight.
Session:
Duration: ${summary.durationMin} min
Focus score: ${summary.focusPct}%
Distractions: ${summary.distractions}
Task: ${summary.task || "N/A"}
Baseline focus (last 10 sessions): ${summary.baselineFocus}%
Guidelines: Be direct and positive, suggest 1 simple change.
`;
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openai_key}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a helpful, encouraging focus coach.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.5,
            max_tokens: 160,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const insight =
            data?.choices?.[0]?.message?.content?.trim() || heuristic(summary);
          return NextResponse.json({ ok: true, insight });
        } else {
          // Log specific OpenAI error status if possible
          console.error(
            `OpenAI call failed with status: ${resp.status}, falling back...`
          );
        }
      } catch (openaiError) {
        console.error("OpenAI fetch error:", openaiError);
      }
    }

    // 2. Try Google Gemini next
    if (google_key) {
      try {
        const systemPrompt =
          "You are a concise focus coach. Provide a 2-3 sentence actionable insight. Be direct and positive, suggest 1 simple change.";
        const userPrompt = `
Session:
- Duration: ${summary.durationMin} min
- Focus score: ${summary.focusPct}%
- Distractions: ${summary.distractions}
- Task: ${summary.task || "N/A"}
- Baseline focus (last 10 sessions): ${summary.baselineFocus}%
`;
        // --- FIXED MODEL NAME HERE ---
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${google_key}`;
        // --- END OF FIX ---

        const payload = {
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 160,
          },
        };
        const resp = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (resp.ok) {
          const data = await resp.json();
          const insight =
            data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            heuristic(summary);
          return NextResponse.json({ ok: true, insight });
        } else {
          // Log specific Google error status if possible
          console.error(
            `Google Gemini call failed with status: ${resp.status}, falling back to heuristic.`
          );
        }
      } catch (googleError) {
        console.error("Google Gemini fetch error:", googleError);
      }
    }

    // 3. Fallback to free heuristic
    console.log("Falling back to heuristic function.");
    return NextResponse.json({ ok: true, insight: heuristic(summary) });
  } catch (e: any) {
    console.error("General insight error:", e);
    // Return a generic error insight in case of unexpected crashes
    return NextResponse.json(
      {
        ok: false,
        insight: "Insight temporarily unavailable due to a server error.",
      },
      { status: 500 } // Use 500 status for internal errors
    );
  }
}
