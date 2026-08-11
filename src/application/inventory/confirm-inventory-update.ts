import type { InventoryRepository } from "../../core/inventory/inventory.repository.js";
import type { NewInventoryTransaction, InventoryTransaction } from "../../core/inventory/inventory-transaction.entity.js";
import type { AuditLogRepository } from "../../core/audit/audit-log.repository.js";
import type { InventoryPreview } from "./types.js";

export interface ConfirmInventoryUpdateDeps {
  inventoryRepository: InventoryRepository;
  auditLogRepository: AuditLogRepository;
}

/**
 * HUMAN CONFIRM -> DATABASE step. Only called after the employee explicitly
 * clicks Confirm on the preview shown by the adapter (Architecture.docx section 12).
 * A preview with unresolved issues (unknown SKU, etc.) must not reach this step.
 */
export async function confirmInventoryUpdate(
  preview: InventoryPreview,
  source: string,
  deps: ConfirmInventoryUpdateDeps,
): Promise<InventoryTransaction[]> {
  if (preview.lines.length === 0) {
    throw new Error("Không có dòng hợp lệ nào để lưu.");
  }

  const newTransactions: NewInventoryTransaction[] = preview.lines.map((line) => ({
    productId: line.productId,
    quantityChange: line.quantityChange,
    transactionType: line.transactionType,
    employeeId: preview.employeeId,
    storeId: preview.storeId,
    source,
    metadata: { rawLine: line.rawLine },
  }));

  const transactions = await deps.inventoryRepository.createTransactions(newTransactions);

  await deps.auditLogRepository.record({
    employeeId: preview.employeeId,
    action: "INVENTORY_UPDATE_CONFIRMED",
    entityType: "inventory_transaction",
    payload: {
      transactionIds: transactions.map((tx) => tx.id),
      lines: preview.lines.map((line) => ({
        sku: line.sku,
        productId: line.productId,
        quantityChange: line.quantityChange,
      })),
    },
    source,
  });

  return transactions;
}
