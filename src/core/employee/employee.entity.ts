import type { EmployeeRole } from "./employee-role.js";

export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  storeId: string | null;
  position: string | null;
  /** Access level for command authorization — see employee-role.ts. Separate from
   *  `position`, which is just a free-text job title, not used for permission checks. */
  role: EmployeeRole;
  status: EmployeeStatus;
}
