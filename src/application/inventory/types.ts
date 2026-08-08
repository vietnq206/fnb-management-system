import type { InventoryTransactionType } from "../../core/inventory/inventory-transaction.entity.js";

export interface ParsedInventoryLine {
  sku: string;
  quantityChange: number; // signed: negative = stock out, positive = stock in
  transactionType: InventoryTransactionType;
  rawLine: string;
}

export interface ParseIssue {
  rawLine: string;
  reason: string;
}

export interface ValidatedInventoryLine extends ParsedInventoryLine {
  productId: string;
  productName: string;
  unit: string | null;
}

export interface PreviewInventoryLine extends ValidatedInventoryLine {
  currentStock: number;
  projectedStock: number;
}

export interface InventoryPreview {
  employeeId: string;
  storeId: string | null;
  lines: PreviewInventoryLine[];
  issues: ParseIssue[];
}
