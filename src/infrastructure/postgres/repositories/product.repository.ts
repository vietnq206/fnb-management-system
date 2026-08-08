import { eq, inArray } from "drizzle-orm";
import type { Database } from "../client.js";
import { products } from "../schema/index.js";
import type { Product } from "../../../core/product/product.entity.js";
import type { ProductRepository } from "../../../core/product/product.repository.js";

function toProduct(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    unit: row.unit,
    isActive: row.isActive,
  };
}

export function createProductRepository(db: Database): ProductRepository {
  return {
    async findBySku(sku) {
      const rows = await db.select().from(products).where(eq(products.sku, sku.toUpperCase())).limit(1);
      const row = rows[0];
      return row ? toProduct(row) : null;
    },

    async findManyBySkus(skus) {
      if (skus.length === 0) return [];
      const normalized = [...new Set(skus.map((sku) => sku.toUpperCase()))];
      const rows = await db.select().from(products).where(inArray(products.sku, normalized));
      return rows.map(toProduct);
    },
  };
}
