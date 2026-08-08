import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { InventoryPreview } from "../../application/inventory/types.js";

export function renderInventoryPreview(preview: InventoryPreview, sessionId: string) {
  const embed = new EmbedBuilder().setTitle("📦 Inventory Update — Preview").setColor(preview.lines.length > 0 ? 0x5865f2 : 0xed4245);

  if (preview.lines.length > 0) {
    const lineText = preview.lines
      .map((line) => {
        const sign = line.quantityChange > 0 ? "+" : "";
        return `**${line.sku}** ${line.productName} ${sign}${line.quantityChange} → còn ${line.projectedStock}`;
      })
      .join("\n");
    embed.addFields({ name: "Thay đổi", value: lineText });
  }

  if (preview.issues.length > 0) {
    embed.addFields({
      name: "⚠️ Vấn đề",
      value: preview.issues.map((issue) => `\`${issue.rawLine}\`: ${issue.reason}`).join("\n"),
    });
  }

  if (preview.lines.length === 0) {
    embed.setDescription("Không có dòng hợp lệ nào để lưu. Vui lòng sửa lại và thử lại.");
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`inventory:confirm:${sessionId}`)
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success)
      .setDisabled(preview.lines.length === 0),
    new ButtonBuilder().setCustomId(`inventory:cancel:${sessionId}`).setLabel("Cancel").setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}
