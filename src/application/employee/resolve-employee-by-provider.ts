import type { Employee } from "../../core/employee/employee.entity.js";
import type { EmployeeRepository } from "../../core/employee/employee.repository.js";

/**
 * Never use a Discord/Telegram/Slack user id as the employee identity directly.
 * Always resolve through external_accounts first (Architecture.docx section 6).
 */
export async function resolveEmployeeByProvider(
  provider: string,
  providerUserId: string,
  employeeRepository: EmployeeRepository,
): Promise<Employee | null> {
  return employeeRepository.findByExternalAccount(provider, providerUserId);
}
