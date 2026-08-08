import type { InventoryTransaction, NewInventoryTransaction } from "./inventory-transaction.entity.js";

export interface InventoryRepository {
  /** Persists a batch of transactions (one Discord submission = one atomic batch). */
  createTransactions(transactions: NewInventoryTransaction[]): Promise<InventoryTransaction[]>;
  /** Current stock is derived from the transaction ledger (sum of quantity_change). */
  getCurrentStock(productId: string): Promise<number>;
  getCurrentStockForMany(productIds: string[]): Promise<Map<string, number>>;
}
