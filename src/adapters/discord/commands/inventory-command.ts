import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, type ChatInputCommandInteraction } from "discord.js";

export const inventoryCommandName = "inventory-update";
export const inventoryModalCustomId = "inventory-update-modal";
export const inventoryModalInputCustomId = "lines";

export const inventoryCommandData = new SlashCommandBuilder()
  .setName(inventoryCommandName)
  .setDescription("Cập nhật tồn kho (nhập SKU + số lượng)");

export async function handleInventoryCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const modal = new ModalBuilder().setCustomId(inventoryModalCustomId).setTitle("Cập nhật tồn kho");

  const linesInput = new TextInputBuilder()
    .setCustomId(inventoryModalInputCustomId)
    .setLabel("Mỗi dòng: SKU số_lượng (vd: A1 5)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("A1 5\nA2 2\nB3 4")
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(linesInput));
  await interaction.showModal(modal);
}
