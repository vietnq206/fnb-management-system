import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeCode: varchar("employee_code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  storeId: varchar("store_id", { length: 64 }),
  position: varchar("position", { length: 64 }),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
