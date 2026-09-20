import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://admin:password123@localhost:27017/claims_db?authSource=admin";
const dbName = process.env.MONGODB_DB_NAME || "claims_db";

interface GlobalWithMongo {
  _mongoClientPromise?: Promise<MongoClient>;
}

declare const global: GlobalWithMongo;

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri, {
    maxPoolSize: 50,
    minPoolSize: 5,
  });
  clientPromise = client.connect();
}

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function ensureIndexes(): Promise<void> {
  try {
    const db = await getDatabase();

    // claims indexes
    await db.collection("claims").createIndex({ claim_id: 1 }, { unique: true });
    await db.collection("claims").createIndex({ idempotency_key: 1 }, { unique: true, sparse: true });
    await db.collection("claims").createIndex({ policy_id: 1, incident_date: -1 });
    await db.collection("claims").createIndex({ customer_id: 1, status: 1 });
    await db.collection("claims").createIndex({ status: 1, updated_at: 1 });
    await db.collection("claims").createIndex({ graph_sync_status: 1 });

    // claim_events indexes
    await db.collection("claim_events").createIndex({ event_id: 1 }, { unique: true });
    await db.collection("claim_events").createIndex({ claim_id: 1, timestamp: 1 });
    await db.collection("claim_events").createIndex({ event_type: 1, timestamp: -1 });

    // policies indexes
    await db.collection("policies").createIndex({ policy_id: 1 }, { unique: true });
    await db.collection("policies").createIndex({ customer_id: 1 });

    // customers indexes
    await db.collection("customers").createIndex({ customer_id: 1 }, { unique: true });

    // service_providers indexes
    await db.collection("service_providers").createIndex({ provider_id: 1 }, { unique: true });
  } catch (error) {
    console.error("[MongoDB] Failed to ensure indexes:", error);
  }
}

export default clientPromise;
