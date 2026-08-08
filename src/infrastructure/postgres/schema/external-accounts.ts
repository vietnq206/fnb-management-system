import { pgTable, uuid, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { employees } from "./employees.js";

export const externalAccounts = pgTable(
  "external_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(), // "discord" | "telegram" | "slack"
    providerUserId: varchar("provider_user_id", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("external_accounts_provider_user_unique").on(table.provider, table.providerUserId)],
);
