import { MongoClient, Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client
      .connect()
      .then((client) => {
        console.log("✅ Connected to MongoDB Atlas (Development)");
        return client;
      })
      .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err);
        throw err;
      });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client
    .connect()
    .then((client) => {
      console.log("✅ Connected to MongoDB Atlas (Production)");
      return client;
    })
    .catch((err) => {
      console.error("❌ MongoDB Connection Error:", err);
      throw err;
    });
}

// Export a module-scoped MongoClient promise.
export default clientPromise;

/**
 * Get database instance
 * @returns Promise<Db>
 */
export async function getDatabase(): Promise<Db> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || "focusflow");

    // Test the connection
    await db.command({ ping: 1 });

    return db;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw new Error("Failed to connect to database");
  }
}

/**
 * Close database connection (for testing/cleanup)
 */
export async function closeDatabase(): Promise<void> {
  try {
    const client = await clientPromise;
    await client.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("Error closing database:", error);
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.admin().ping();
    return result.ok === 1;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}
