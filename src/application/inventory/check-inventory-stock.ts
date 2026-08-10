import type { ProductRepository } from "../../core/product/product.repository.js";
import type { InventoryRepository } from "../../core/inventory/inventory.repository.js";

export interface StockLine {
  sku: string;
  productName: string;
  unit: string | null;
  currentStock: number;
}

export interface CheckInventoryStockDeps {
  productRepository: ProductRepository;
  inventoryRepository: InventoryRepository;
}

/**
 * Read-only lookup — never writes anything. If `sku` is given, returns just that
 * product (empty array if the SKU doesn't exist or is inactive). If omitted, returns
 * every active product with its current stock.
 */
export async function checkInventoryStock(sku: string | undefined, deps: CheckInventoryStockDeps): Promise<StockLine[]> {
  const products = sku ? await lookupSingle(sku, deps.productRepository) : await deps.productRepository.findAllActive();

  if (products.length === 0) return [];

  const stockByProductId = await deps.inventoryRepository.getCurrentStockForMany(products.map((product) => product.id));

  return products.map((product) => ({
    sku: product.sku,
    productName: product.name,
    unit: product.unit,
    currentStock: stockByProductId.get(product.id) ?? 0,
  }));
}

async function lookupSingle(sku: string, productRepository: ProductRepository) {
  const product = await productRepository.findBySku(sku);
  return product && product.isActive ? [product] : [];
}
