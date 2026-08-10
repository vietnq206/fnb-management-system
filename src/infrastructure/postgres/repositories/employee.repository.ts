import { eq, and } from "drizzle-orm";
import type { Database } from "../client.js";
import { employees, externalAccounts } from "../schema/index.js";
import type { Employee } from "../../../core/employee/employee.entity.js";
import type { EmployeeRepository } from "../../../core/employee/employee.repository.js";

function toEmployee(row: typeof employees.$inferSelect): Employee {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    name: row.name,
    storeId: row.storeId,
    position: row.position,
    role: row.role,
    status: row.status as Employee["status"],
  };
}

export function createEmployeeRepository(db: Database): EmployeeRepository {
  return {
    async findByExternalAccount(provider, providerUserId) {
      const rows = await db
        .select({ employee: employees })
        .from(externalAccounts)
        .innerJoin(employees, eq(externalAccounts.employeeId, employees.id))
        .where(and(eq(externalAccounts.provider, provider), eq(externalAccounts.providerUserId, providerUserId)))
        .limit(1);

      const row = rows[0];
      return row ? toEmployee(row.employee) : null;
    },

    async findById(employeeId) {
      const rows = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      const row = rows[0];
      return row ? toEmployee(row) : null;
    },
  };
}
