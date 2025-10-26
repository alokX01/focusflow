import { getDatabase } from "./mongodb";

/**
 * Create all necessary database indexes for optimal performance
 */
export async function createIndexes() {
  const db = await getDatabase();

  console.log("📊 Creating database indexes...");

  try {
    // ============================================
    // USERS COLLECTION
    // ============================================
    await db.collection("users").createIndexes([
      { key: { email: 1 }, unique: true, name: "email_unique" },
      { key: { createdAt: -1 }, name: "created_at_desc" },
    ]);

    // ============================================
    // SESSIONS COLLECTION
    // ============================================
    await db.collection("sessions").createIndexes([
      // Primary queries
      { key: { userId: 1, startTime: -1 }, name: "user_sessions" },
      { key: { userId: 1, isCompleted: 1 }, name: "user_completed" },
      { key: { userId: 1, sessionType: 1 }, name: "user_session_type" },

      // Date range queries
      { key: { userId: 1, createdAt: -1 }, name: "user_created" },
      { key: { startTime: -1 }, name: "start_time_desc" },

      // Analytics queries
      { key: { userId: 1, focusPercentage: -1 }, name: "user_focus_score" },

      // Compound for filtering
      {
        key: { userId: 1, isCompleted: 1, createdAt: -1 },
        name: "user_completed_date",
      },

      // TTL index for auto-deletion (optional)
      // { key: { createdAt: 1 }, expireAfterSeconds: 31536000, name: 'ttl_1year' }, // 1 year
    ]);

    // ============================================
    // USER SETTINGS COLLECTION
    // ============================================
    await db
      .collection("userSettings")
      .createIndexes([
        { key: { userId: 1 }, unique: true, name: "user_id_unique" },
      ]);

    // ============================================
    // DISTRACTIONS COLLECTION
    // ============================================
    await db.collection("distractions").createIndexes([
      { key: { sessionId: 1 }, name: "session_id" },
      { key: { userId: 1, timestamp: -1 }, name: "user_timestamp" },
      { key: { type: 1 }, name: "distraction_type" },
    ]);

    // ============================================
    // DAILY STATS COLLECTION
    // ============================================
    await db.collection("dailyStats").createIndexes([
      {
        key: { userId: 1, date: -1 },
        unique: true,
        name: "user_date_unique",
      },
      { key: { date: -1 }, name: "date_desc" },
    ]);

    // ============================================
    // DAILY ANALYTICS COLLECTION
    // ============================================
    await db.collection("dailyAnalytics").createIndexes([
      {
        key: { userId: 1, date: -1 },
        unique: true,
        name: "user_date_unique",
      },
    ]);

    // ============================================
    // ACHIEVEMENTS COLLECTION
    // ============================================
    await db.collection("userAchievements").createIndexes([
      {
        key: { userId: 1, achievementId: 1 },
        unique: true,
        name: "user_achievement_unique",
      },
      { key: { userId: 1, unlockedAt: -1 }, name: "user_unlocked" },
    ]);

    // ============================================
    // ACTIVITY LOGS COLLECTION
    // ============================================
    await db.collection("activityLogs").createIndexes([
      { key: { userId: 1, timestamp: -1 }, name: "user_timestamp" },
      { key: { action: 1 }, name: "action" },
      { key: { sessionId: 1 }, name: "session_id", sparse: true },

      // TTL index for auto-deletion (keep logs for 90 days)
      {
        key: { timestamp: 1 },
        expireAfterSeconds: 7776000,
        name: "ttl_90days",
      },
    ]);

    console.log("✅ Database indexes created successfully");
    return true;
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    throw error;
  }
}

/**
 * Drop all indexes (for testing/migration)
 */
export async function dropAllIndexes() {
  const db = await getDatabase();

  const collections = [
    "users",
    "sessions",
    "userSettings",
    "distractions",
    "dailyStats",
    "dailyAnalytics",
    "userAchievements",
    "activityLogs",
  ];

  for (const collectionName of collections) {
    try {
      await db.collection(collectionName).dropIndexes();
      console.log(`✅ Dropped indexes for ${collectionName}`);
    } catch (error) {
      console.log(`⚠️ No indexes to drop for ${collectionName}`);
    }
  }
}

/**
 * Get index information for all collections
 */
export async function getIndexInfo() {
  const db = await getDatabase();

  const collections = [
    "users",
    "sessions",
    "userSettings",
    "distractions",
    "dailyStats",
    "userAchievements",
    "activityLogs",
  ];

  const indexInfo: Record<string, any[]> = {};

  for (const collectionName of collections) {
    try {
      const indexes = await db.collection(collectionName).indexes();
      indexInfo[collectionName] = indexes;
    } catch (error) {
      indexInfo[collectionName] = [];
    }
  }

  return indexInfo;
}
