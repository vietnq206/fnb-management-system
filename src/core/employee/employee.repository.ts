import type { Employee } from "./employee.entity.js";

/**
 * Port. Implemented in src/infrastructure/postgres/repositories.
 * Core/application code depends only on this interface, never on Drizzle/pg directly.
 */
export interface EmployeeRepository {
  findByExternalAccount(provider: string, providerUserId: string): Promise<Employee | null>;
  findById(employeeId: string): Promise<Employee | null>;
}
