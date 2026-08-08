import { pgTable, uuid, integer, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { products } from "./products.js";
import { employees } from "./employees.js";

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantityChange: integer("quantity_change").notNull(),
  transactionType: varchar("transaction_type", { length: 16 }).notNull(), // STOCK_IN | STOCK_OUT | ADJUSTMENT
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),
  storeId: varchar("store_id", { length: 64 }),
  source: varchar("source", { length: 32 }).notNull(), // e.g. "discord"
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
