import type { ButtonInteraction } from "discord.js";
import { confirmInventoryUpdate } from "../../../application/inventory/confirm-inventory-update.js";
import { inventorySessionStore } from "../inventory-session-store.js";
import type { DiscordAdapterDeps } from "../dependencies.js";

const CUSTOM_ID_PREFIX = "inventory:";

export function isInventoryButton(customId: string): boolean {
  return customId.startsWith(CUSTOM_ID_PREFIX);
}

export async function handleInventoryButton(interaction: ButtonInteraction, deps: DiscordAdapterDeps): Promise<void> {
  const [, action, sessionId] = interaction.customId.split(":");
  if (!action || !sessionId) {
    await interaction.update({ content: "⚠️ Yêu cầu không hợp lệ.", embeds: [], components: [] });
    return;
  }

  const preview = inventorySessionStore.get(sessionId);
  if (!preview) {
    await interaction.update({ content: "⚠️ Phiên đã hết hạn, vui lòng chạy lại /inventory-update.", embeds: [], components: [] });
    return;
  }

  if (action === "cancel") {
    inventorySessionStore.delete(sessionId);
    await interaction.update({ content: "❌ Đã huỷ.", embeds: [], components: [] });
    return;
  }

  if (action === "confirm") {
    try {
      const transactions = await confirmInventoryUpdate(preview, "discord", {
        inventoryRepository: deps.inventoryRepository,
        auditLogRepository: deps.auditLogRepository,
      });
      inventorySessionStore.delete(sessionId);

      const summary = transactions
        .map((tx) => {
          const line = preview.lines.find((l) => l.productId === tx.productId);
          return `**${line?.sku ?? tx.productId}** ${line?.productName ?? ""} ${tx.quantityChange > 0 ? "+" : ""}${tx.quantityChange}`;
        })
        .join("\n");

      await interaction.update({ content: `✅ Đã lưu vào PostgreSQL:\n${summary}`, embeds: [], components: [] });
    } catch (error) {
      console.error("Failed to confirm inventory update:", error);
      await interaction.update({ content: "❌ Lưu thất bại, vui lòng thử lại.", embeds: [], components: [] });
    }
    return;
  }
}
