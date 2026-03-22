import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "focusflow";

if (!uri) {
  throw new Error('Missing required environment variable: "MONGODB_URI"');
}

const options = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (!globalForMongo._mongoClientPromise) {
  const client = new MongoClient(uri, options);
  globalForMongo._mongoClientPromise = client.connect();
}

const clientPromise = globalForMongo._mongoClientPromise;

export default clientPromise;

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function closeDatabase(): Promise<void> {
  const client = await clientPromise;
  await client.close();
  globalForMongo._mongoClientPromise = undefined;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.admin().ping();
    return result.ok === 1;
  } catch {
    return false;
  }
}
