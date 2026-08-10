import { EmbedBuilder } from "discord.js";
import type { StockLine } from "../../application/inventory/check-inventory-stock.js";

export function renderInventoryCheck(lines: StockLine[]) {
  const embed = new EmbedBuilder().setTitle("📦 Tồn kho hiện tại").setColor(0x5865f2);

  const description = lines
    .map((line) => `**${line.sku}** ${line.productName}${line.unit ? ` (${line.unit})` : ""}: ${line.currentStock}`)
    .join("\n");

  embed.setDescription(description);
  return embed;
}
