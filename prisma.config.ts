import { config } from "dotenv";
// Default to the local DB; prod operations must opt in with DATABASE_TARGET=prod.
const envFile = process.env.DATABASE_TARGET === "prod" ? ".env.prod" : ".env.local";
config({ path: envFile });
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma/schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  // Used by `prisma db seed` and `prisma migrate reset`.
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
