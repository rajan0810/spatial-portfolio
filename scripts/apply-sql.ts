/**
 * Applies a raw .sql file to the database.
 *
 * Drizzle manages table shape; it does not manage RLS policies, grants,
 * triggers or functions. Those live in lib/db/policies.sql and are applied
 * with this script. The file is idempotent, so re-running is always safe.
 *
 *   npm run db:policies
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import postgres from "postgres";

async function main() {
  const target = process.argv[2];

  if (!target) {
    throw new Error("usage: tsx scripts/apply-sql.ts <path-to.sql>");
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — is .env.local present?");
  }

  const sqlText = await readFile(resolve(process.cwd(), target), "utf8");

  // `.simple()` lets one connection run a multi-statement script, which the
  // extended protocol used for prepared statements refuses to do.
  const sql = postgres(connectionString, { max: 1, prepare: false });

  try {
    await sql.unsafe(sqlText).simple();
    console.log(`✓ applied ${target}`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("✗ failed applying SQL");
  console.error(error);
  process.exit(1);
});
