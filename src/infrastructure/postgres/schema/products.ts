import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: varchar("sku", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 32 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
