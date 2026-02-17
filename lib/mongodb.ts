import { MongoClient, Db } from "mongodb";

// ======================================================
//  REQUIRED ENV VARIABLES
// ======================================================
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "focusflow";

if (!uri) {
  throw new Error('❌ Missing environment variable: "MONGODB_URI"');
}

// ======================================================
//  MONGO CLIENT OPTIONS (OPTIMIZED)
// ======================================================
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// ======================================================
//  GLOBAL DECLARATION (HMR SAFE)
// ======================================================
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // allow global var in TS
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// ======================================================
//  DEVELOPMENT MODE - USE GLOBAL CLIENT
// ======================================================
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);

    global._mongoClientPromise = client
      .connect()
      .then((client) => {
        console.log("✅ Connected to MongoDB Atlas (Development)");
        return client;
      })
      .catch((err) => {
        console.error("❌ MongoDB Dev Connection Error:", err);
        throw err;
      });
  }

  clientPromise = global._mongoClientPromise;
}

// ======================================================
//  PRODUCTION MODE - ALWAYS FRESH CLIENT
// ======================================================
else {
  client = new MongoClient(uri, options);

  clientPromise = client
    .connect()
    .then((client) => {
      console.log("🚀 Connected to MongoDB Atlas (Production)");
      return client;
    })
    .catch((err) => {
      console.error("❌ MongoDB Prod Connection Error:", err);
      throw err;
    });
}

// EXPORT CLIENT PROMISE
export default clientPromise;

// ======================================================
//  GET DATABASE INSTANCE
// ======================================================
export async function getDatabase(): Promise<Db> {
  try {
    const client = await clientPromise;
    const db = client.db(dbName);

    // Ping ensures connection is alive
    await db.command({ ping: 1 });

    return db;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw new Error("Failed to connect to database");
  }
}

// ======================================================
//  CLOSE DATABASE (USEFUL FOR TESTS / CLEANUP)
// ======================================================
export async function closeDatabase(): Promise<void> {
  try {
    const client = await clientPromise;
    await client.close();
    console.log("🟦 MongoDB connection closed");
  } catch (error) {
    console.error("❌ Error closing MongoDB:", error);
  }
}

// ======================================================
//  HEALTH CHECK
// ======================================================
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.admin().ping();
    return result.ok === 1;
  } catch (error) {
    console.error("❌ Database health check failed:", error);
    return false;
  }
}
