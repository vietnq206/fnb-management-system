import type { InventoryTransactionType } from "../../core/inventory/inventory-transaction.entity.js";
import type { ParsedInventoryLine, ParseIssue } from "./types.js";

const LINE_PATTERN = /^([A-Za-z0-9_-]+)\s+([+-]?\d+)$/;

/**
 * Parses free-text inventory input like:
 *   A1 5
 *   A2 2
 *   A1 3
 *
 * Rules (see Architecture.docx section 14):
 * - No sign  -> implicit stock-out (employee is taking items out of the warehouse).
 * - "+N"     -> explicit stock-in.
 * - "-N"     -> explicit stock-out.
 * - Duplicate SKUs are aggregated (net change), matching how employees jot multiple
 *   lines on the whiteboard throughout the day.
 */
export function parseInventoryInput(raw: string): {
  lines: ParsedInventoryLine[];
  issues: ParseIssue[];
} {
  const issues: ParseIssue[] = [];
  const totalsBySku = new Map<string, number>();
  const firstRawLineBySku = new Map<string, string>();

  const rawLines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const rawLine of rawLines) {
    const match = LINE_PATTERN.exec(rawLine);
    if (!match) {
      issues.push({ rawLine, reason: `Không parse được dòng "${rawLine}". Định dạng đúng: "SKU số_lượng", ví dụ "A1 5".` });
      continue;
    }

    const skuRaw = match[1];
    const quantityRaw = match[2];
    if (!skuRaw || !quantityRaw) {
      issues.push({ rawLine, reason: `Không parse được dòng "${rawLine}".` });
      continue;
    }
    const sku = skuRaw.toUpperCase();
    const hasExplicitSign = quantityRaw.startsWith("+") || quantityRaw.startsWith("-");
    const magnitude = Math.abs(Number.parseInt(quantityRaw, 10));

    if (!Number.isFinite(magnitude) || magnitude === 0) {
      issues.push({ rawLine, reason: `Số lượng không hợp lệ trong dòng "${rawLine}".` });
      continue;
    }

    const delta = hasExplicitSign && quantityRaw.startsWith("+") ? magnitude : -magnitude;
    // Explicit "-N" and implicit "N" both resolve to a negative delta (stock out).

    totalsBySku.set(sku, (totalsBySku.get(sku) ?? 0) + delta);
    if (!firstRawLineBySku.has(sku)) firstRawLineBySku.set(sku, rawLine);
  }

  const lines: ParsedInventoryLine[] = [];
  for (const [sku, quantityChange] of totalsBySku) {
    if (quantityChange === 0) {
      issues.push({
        rawLine: firstRawLineBySku.get(sku) ?? sku,
        reason: `SKU ${sku} có tổng thay đổi bằng 0, đã bỏ qua.`,
      });
      continue;
    }

    const transactionType: InventoryTransactionType = quantityChange > 0 ? "STOCK_IN" : "STOCK_OUT";
    lines.push({
      sku,
      quantityChange,
      transactionType,
      rawLine: firstRawLineBySku.get(sku) ?? sku,
    });
  }

  return { lines, issues };
}
