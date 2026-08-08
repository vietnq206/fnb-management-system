import type { InventoryRepository } from "../../core/inventory/inventory.repository.js";
import type { NewInventoryTransaction, InventoryTransaction } from "../../core/inventory/inventory-transaction.entity.js";
import type { InventoryPreview } from "./types.js";

export interface ConfirmInventoryUpdateDeps {
  inventoryRepository: InventoryRepository;
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

  return deps.inventoryRepository.createTransactions(newTransactions);
}
