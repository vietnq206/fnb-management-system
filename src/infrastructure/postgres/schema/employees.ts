import { pgTable, pgEnum, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

// Postgres-level enum: the database itself rejects any value other than these 3,
// on top of the TypeScript type check (core/employee/employee-role.ts).
export const employeeRoleEnum = pgEnum("employee_role", ["staff", "manager", "admin"]);

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeCode: varchar("employee_code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  storeId: varchar("store_id", { length: 64 }),
  position: varchar("position", { length: 64 }),
  role: employeeRoleEnum("role").notNull().default("staff"),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
