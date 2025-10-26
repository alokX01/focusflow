import { NextRequest } from "next/server";
import { getDatabase, checkDatabaseHealth } from "@/lib/mongodb";
import { createIndexes, getIndexInfo } from "@/lib/mongodb-indexes";
import { apiResponse, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

// ============================================
// GET - Test MongoDB Connection
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Health check
    const isHealthy = await checkDatabaseHealth();

    if (!isHealthy) {
      return apiError("Database connection failed", 500);
    }

    const db = await getDatabase();

    // Perform action if specified
    let actionResult = null;

    if (action === "create-indexes") {
      await createIndexes();
      actionResult = "Indexes created successfully";
    } else if (action === "index-info") {
      actionResult = await getIndexInfo();
    } else if (action === "collections") {
      const collections = await db.listCollections().toArray();
      actionResult = collections.map((c) => c.name);
    } else if (action === "stats") {
      const stats = await db.stats();
      actionResult = {
        database: stats.db,
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
      };
    }

    return apiResponse({
      status: "connected",
      healthy: isHealthy,
      database: db.databaseName,
      action: action || "none",
      result: actionResult,
    });
  } catch (error: any) {
    console.error("Database test error:", error);
    return apiError(error.message, 500);
  }
}
