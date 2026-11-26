import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set (see .env.example)");
  }
  // Session pooler (5432): the transaction pooler (6543) hangs on the
  // pipelined queries postgres.js sends. prepare:false keeps either working.
  const client = postgres(databaseUrl, { prepare: false, max: 5 });
  return drizzle(client, { schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;

// Reuse the instance across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: Db };

/**
 * Lazily created so that importing this module never needs DATABASE_URL
 * (e.g. during `next build` in Docker, where it is only a runtime variable).
 */
export function getDb(): Db {
  if (!globalForDb.db) globalForDb.db = createDb();
  return globalForDb.db;
}
