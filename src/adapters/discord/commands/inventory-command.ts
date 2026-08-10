import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, type ChatInputCommandInteraction } from "discord.js";
import { resolveAuthorizedEmployee } from "../authorize.js";
import type { EmployeeRole } from "../../../core/employee/employee-role.js";
import type { DiscordAdapterDeps } from "../dependencies.js";

export const inventoryCommandName = "inventory-update";
export const inventoryModalCustomId = "inventory-update-modal";
export const inventoryModalInputCustomId = "lines";

// Mức quyền tối thiểu cho lệnh này. Cập nhật tồn kho là việc làm hàng ngày của nhân
// viên kho (Architecture.docx mục 13/14) nên để "staff" — mở cho cả 3 mức (staff ⊆
// manager ⊆ admin). Đổi thành "manager" hoặc "admin" nếu sau này muốn giới hạn lại.
export const inventoryCommandRequiredRole: EmployeeRole = "staff";

export const inventoryCommandData = new SlashCommandBuilder()
  .setName(inventoryCommandName)
  .setDescription("Cập nhật tồn kho (nhập SKU + số lượng)");

export async function handleInventoryCommand(interaction: ChatInputCommandInteraction, deps: DiscordAdapterDeps): Promise<void> {
  const employee = await resolveAuthorizedEmployee(interaction, inventoryCommandRequiredRole, deps);
  if (!employee) return;

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
