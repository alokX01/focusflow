import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getDatabase } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

// ============================================
// GET - Export User Data as CSV
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const userId = (session.user as any).id || session.user.email;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";
    const format = searchParams.get("format") || "csv";

    const db = await getDatabase();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "week":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "all":
        startDate.setFullYear(2020);
        break;
    }

    // Fetch sessions
    const sessions = await db
      .collection("sessions")
      .find({
        userId,
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .sort({ createdAt: -1 })
      .toArray();

    if (format === "json") {
      return NextResponse.json(sessions, {
        headers: {
          "Content-Disposition": `attachment; filename="focusflow-export-${period}.json"`,
          "Content-Type": "application/json",
        },
      });
    }

    // Generate CSV
    const csv = generateCSV(sessions);

    return new NextResponse(csv, {
      headers: {
        "Content-Disposition": `attachment; filename="focusflow-export-${period}.csv"`,
        "Content-Type": "text/csv",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return apiError("Failed to export data", 500);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateCSV(sessions: any[]): string {
  // CSV Headers
  const headers = [
    "Date",
    "Start Time",
    "End Time",
    "Duration (min)",
    "Focus Percentage",
    "Distractions",
    "Type",
    "Completed",
    "Goal",
    "Tags",
  ];

  // CSV Rows
  const rows = sessions.map((session) => {
    const startTime = new Date(session.startTime);
    const endTime = session.endTime ? new Date(session.endTime) : null;

    return [
      startTime.toLocaleDateString(),
      startTime.toLocaleTimeString(),
      endTime ? endTime.toLocaleTimeString() : "N/A",
      Math.round(session.duration / 60),
      session.focusPercentage,
      session.distractionCount,
      session.sessionType,
      session.isCompleted ? "Yes" : "No",
      session.goal || "",
      Array.isArray(session.tags) ? session.tags.join("; ") : "",
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
}
