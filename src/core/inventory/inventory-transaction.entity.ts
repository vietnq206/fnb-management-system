export type InventoryTransactionType = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";

export interface InventoryTransaction {
  id: string;
  productId: string;
  quantityChange: number;
  transactionType: InventoryTransactionType;
  employeeId: string;
  storeId: string | null;
  source: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface NewInventoryTransaction {
  productId: string;
  quantityChange: number;
  transactionType: InventoryTransactionType;
  employeeId: string;
  storeId: string | null;
  source: string;
  metadata?: Record<string, unknown> | null;
}
