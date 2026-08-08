export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  storeId: string | null;
  position: string | null;
  status: EmployeeStatus;
}
