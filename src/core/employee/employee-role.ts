export type EmployeeRole = "staff" | "manager" | "admin";

/**
 * Higher number = more access. admin ⊇ manager ⊇ staff — each level automatically
 * includes everything the level(s) below it can do (Architecture.docx section 7:
 * "manager chỉ truy cập được những gì nó có thể + của staff").
 */
const ROLE_RANK: Record<EmployeeRole, number> = {
  staff: 1,
  manager: 2,
  admin: 3,
};

export function hasAtLeastRole(actual: EmployeeRole, required: EmployeeRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}
