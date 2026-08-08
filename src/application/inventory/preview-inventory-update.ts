import type { ProductRepository } from "../../core/product/product.repository.js";
import type { InventoryRepository } from "../../core/inventory/inventory.repository.js";
import { parseInventoryInput } from "./parse-inventory-input.js";
import { validateInventoryInput } from "./validate-inventory-input.js";
import type { InventoryPreview } from "./types.js";

export interface PreviewInventoryUpdateDeps {
  productRepository: ProductRepository;
  inventoryRepository: InventoryRepository;
}

export interface PreviewInventoryUpdateInput {
  rawText: string;
  employeeId: string;
  storeId: string | null;
}

/**
 * INPUT -> PARSE -> VALIDATE -> PREVIEW step of the required workflow
 * (Architecture.docx section 12). Nothing is written to the database here.
 */
export async function previewInventoryUpdate(
  input: PreviewInventoryUpdateInput,
  deps: PreviewInventoryUpdateDeps,
): Promise<InventoryPreview> {
  const { lines: parsedLines, issues: parseIssues } = parseInventoryInput(input.rawText);
  const { lines: validatedLines, issues: validationIssues } = await validateInventoryInput(
    parsedLines,
    deps.productRepository,
  );

  const currentStockByProductId = await deps.inventoryRepository.getCurrentStockForMany(
    validatedLines.map((line) => line.productId),
  );

  const lines = validatedLines.map((line) => {
    const currentStock = currentStockByProductId.get(line.productId) ?? 0;
    return {
      ...line,
      currentStock,
      projectedStock: currentStock + line.quantityChange,
    };
  });

  return {
    employeeId: input.employeeId,
    storeId: input.storeId,
    lines,
    issues: [...parseIssues, ...validationIssues],
  };
}
