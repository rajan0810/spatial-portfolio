import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so it does not pick up .env.local by itself.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Supabase owns these; drizzle should never try to drop them.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
