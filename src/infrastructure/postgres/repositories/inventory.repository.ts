import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../client.js";
import { inventoryTransactions } from "../schema/index.js";
import type {
  InventoryTransaction,
  NewInventoryTransaction,
} from "../../../core/inventory/inventory-transaction.entity.js";
import type { InventoryRepository } from "../../../core/inventory/inventory.repository.js";

function toInventoryTransaction(row: typeof inventoryTransactions.$inferSelect): InventoryTransaction {
  return {
    id: row.id,
    productId: row.productId,
    quantityChange: row.quantityChange,
    transactionType: row.transactionType as InventoryTransaction["transactionType"],
    employeeId: row.employeeId,
    storeId: row.storeId,
    source: row.source,
    createdAt: row.createdAt,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  };
}

export function createInventoryRepository(db: Database): InventoryRepository {
  return {
    async createTransactions(transactions: NewInventoryTransaction[]) {
      if (transactions.length === 0) return [];
      const rows = await db
        .insert(inventoryTransactions)
        .values(
          transactions.map((tx) => ({
            productId: tx.productId,
            quantityChange: tx.quantityChange,
            transactionType: tx.transactionType,
            employeeId: tx.employeeId,
            storeId: tx.storeId,
            source: tx.source,
            metadata: tx.metadata ?? null,
          })),
        )
        .returning();
      return rows.map(toInventoryTransaction);
    },

    async getCurrentStock(productId: string) {
      const result = await db
        .select({ total: sql<number>`coalesce(sum(${inventoryTransactions.quantityChange}), 0)` })
        .from(inventoryTransactions)
        .where(eq(inventoryTransactions.productId, productId));
      return Number(result[0]?.total ?? 0);
    },

    async getCurrentStockForMany(productIds: string[]) {
      const map = new Map<string, number>();
      if (productIds.length === 0) return map;
      const uniqueIds = [...new Set(productIds)];

      const rows = await db
        .select({
          productId: inventoryTransactions.productId,
          total: sql<number>`coalesce(sum(${inventoryTransactions.quantityChange}), 0)`,
        })
        .from(inventoryTransactions)
        .where(inArray(inventoryTransactions.productId, uniqueIds))
        .groupBy(inventoryTransactions.productId);

      for (const row of rows) map.set(row.productId, Number(row.total));
      for (const id of uniqueIds) if (!map.has(id)) map.set(id, 0);
      return map;
    },
  };
}
