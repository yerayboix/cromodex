import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set (see .env.example)");
}

// Reuse the client across hot reloads in development.
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

// Transaction pooler (port 6543) does not support prepared statements.
const client =
  globalForDb.pgClient ?? postgres(databaseUrl, { prepare: false, max: 5 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Db = typeof db;
