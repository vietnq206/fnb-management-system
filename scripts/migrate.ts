import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "../src/infrastructure/postgres/client.js";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const { db, pool } = createDatabase(databaseUrl);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
