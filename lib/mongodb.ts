import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim() || "focusflow";

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

function requireMongoUri(): string {
  if (!uri) {
    throw new Error('Missing required environment variable: "MONGODB_URI"');
  }
  return uri;
}

export function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(requireMongoUri(), options);
    globalForMongo._mongoClientPromise = client.connect();
  }

  return globalForMongo._mongoClientPromise;
}

export default getMongoClient;

export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

export async function closeDatabase(): Promise<void> {
  if (!globalForMongo._mongoClientPromise) {
    return;
  }

  const client = await globalForMongo._mongoClientPromise;
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
