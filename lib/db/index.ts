import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Direct Postgres connection used for every server-side read and write.
 *
 * IMPORTANT — how this interacts with RLS. This connection authenticates as a
 * privileged Postgres role, so it *bypasses* Row Level Security entirely.
 * Security on this path therefore comes from the query filters in lib/data
 * (`published = true and deleted_at is null`) and from the auth checks in
 * lib/actions — never from RLS.
 *
 * RLS still matters, and is not optional: the anon key ships in the client
 * bundle, so Supabase's PostgREST endpoint is publicly reachable no matter what
 * this app does. The policies in lib/db/policies.sql are what protect *that*
 * surface. Two doors, two locks.
 *
 * `prepare: false` is required when the connection string points at Supabase's
 * transaction-mode pooler (port 6543), and harmless when it does not.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — see .env.local");
}

const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

// Reused across hot reloads in dev so we don't exhaust the connection pool.
const sql =
  globalForDb.sql ??
  postgres(connectionString, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}

export const db = drizzle(sql, { schema });
