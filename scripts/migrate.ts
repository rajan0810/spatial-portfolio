/**
 * Applies pending Drizzle migrations from lib/db/migrations.
 *
 *   npm run db:generate   # after changing lib/db/schema.ts
 *   npm run db:migrate
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — is .env.local present?");
  }

  const sql = postgres(connectionString, { max: 1, prepare: false });

  try {
    await migrate(drizzle(sql), { migrationsFolder: "lib/db/migrations" });
    console.log("✓ migrations applied");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("✗ migration failed");
  console.error(error);
  process.exit(1);
});
