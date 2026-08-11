import type { EmployeeRepository } from "../../core/employee/employee.repository.js";
import type { ProductRepository } from "../../core/product/product.repository.js";
import type { InventoryRepository } from "../../core/inventory/inventory.repository.js";
import type { AuditLogRepository } from "../../core/audit/audit-log.repository.js";

/**
 * Everything the Discord adapter needs from the backend. The adapter only ever
 * talks to application use-cases / these ports — never to Drizzle/pg directly.
 */
export interface DiscordAdapterDeps {
  employeeRepository: EmployeeRepository;
  productRepository: ProductRepository;
  inventoryRepository: InventoryRepository;
  auditLogRepository: AuditLogRepository;
}
