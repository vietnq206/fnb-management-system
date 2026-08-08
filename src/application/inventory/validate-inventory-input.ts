import type { ProductRepository } from "../../core/product/product.repository.js";
import type { ParsedInventoryLine, ParseIssue, ValidatedInventoryLine } from "./types.js";

export async function validateInventoryInput(
  parsedLines: ParsedInventoryLine[],
  productRepository: ProductRepository,
): Promise<{ lines: ValidatedInventoryLine[]; issues: ParseIssue[] }> {
  const issues: ParseIssue[] = [];
  if (parsedLines.length === 0) return { lines: [], issues };

  const skus = parsedLines.map((line) => line.sku);
  const products = await productRepository.findManyBySkus(skus);
  const productBySku = new Map(products.map((product) => [product.sku.toUpperCase(), product]));

  const lines: ValidatedInventoryLine[] = [];
  for (const parsedLine of parsedLines) {
    const product = productBySku.get(parsedLine.sku);
    if (!product) {
      issues.push({ rawLine: parsedLine.rawLine, reason: `Không tìm thấy SKU "${parsedLine.sku}".` });
      continue;
    }
    if (!product.isActive) {
      issues.push({ rawLine: parsedLine.rawLine, reason: `SKU "${parsedLine.sku}" (${product.name}) hiện không hoạt động.` });
      continue;
    }

    lines.push({
      ...parsedLine,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
    });
  }

  return { lines, issues };
}
