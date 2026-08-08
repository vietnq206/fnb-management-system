import "dotenv/config";
import { eq } from "drizzle-orm";
import { createDatabase } from "../src/infrastructure/postgres/client.js";
import { products, employees, externalAccounts } from "../src/infrastructure/postgres/schema/index.js";

const SAMPLE_PRODUCTS = [
  { sku: "A1", name: "Coca Cola", unit: "lon" },
  { sku: "A2", name: "Pepsi", unit: "lon" },
  { sku: "A3", name: "Fanta", unit: "lon" },
  { sku: "B1", name: "Water 500ml", unit: "chai" },
  { sku: "B2", name: "Water 1L", unit: "chai" },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const seedDiscordUserId = process.env.SEED_DISCORD_USER_ID;

  const { db, pool } = createDatabase(databaseUrl);

  await db.insert(products).values(SAMPLE_PRODUCTS).onConflictDoNothing({ target: products.sku });
  console.log(`Seeded ${SAMPLE_PRODUCTS.length} sample products.`);

  const inserted = await db
    .insert(employees)
    .values({ employeeCode: "EMP001", name: "Nguyen Van A", storeId: "STORE01", position: "staff" })
    .onConflictDoNothing({ target: employees.employeeCode })
    .returning();

  const employee = inserted[0] ?? (await db.select().from(employees).where(eq(employees.employeeCode, "EMP001")))[0];

  if (seedDiscordUserId && employee) {
    await db
      .insert(externalAccounts)
      .values({ employeeId: employee.id, provider: "discord", providerUserId: seedDiscordUserId })
      .onConflictDoNothing({ target: [externalAccounts.provider, externalAccounts.providerUserId] });
    console.log(`Mapped EMP001 -> Discord user ${seedDiscordUserId}`);
  } else {
    console.log("SEED_DISCORD_USER_ID not set in .env — skipping Discord mapping.");
  }

  await pool.end();
  console.log("Seed complete.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
