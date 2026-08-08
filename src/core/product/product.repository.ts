import type { Product } from "./product.entity.js";

export interface ProductRepository {
  findBySku(sku: string): Promise<Product | null>;
  findManyBySkus(skus: string[]): Promise<Product[]>;
}
