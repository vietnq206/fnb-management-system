import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { checkInventoryStock } from "../../../application/inventory/check-inventory-stock.js";
import { renderInventoryCheck } from "../render-inventory-check.js";
import { resolveAuthorizedEmployee } from "../authorize.js";
import type { EmployeeRole } from "../../../core/employee/employee-role.js";
import type { DiscordAdapterDeps } from "../dependencies.js";

export const inventoryCheckCommandName = "inventory-check";

// Chỉ đọc, không rủi ro dữ liệu — mở cho cả staff.
export const inventoryCheckCommandRequiredRole: EmployeeRole = "staff";

export const inventoryCheckCommandData = new SlashCommandBuilder()
  .setName(inventoryCheckCommandName)
  .setDescription("Xem tồn kho hiện tại")
  .addStringOption((option) =>
    option.setName("sku").setDescription("Mã SKU cần tra (bỏ trống để xem tất cả)").setRequired(false),
  );

export async function handleInventoryCheckCommand(
  interaction: ChatInputCommandInteraction,
  deps: DiscordAdapterDeps,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const employee = await resolveAuthorizedEmployee(interaction, inventoryCheckCommandRequiredRole, deps);
  if (!employee) return;

  const skuOption = interaction.options.getString("sku")?.trim() || undefined;

  const results = await checkInventoryStock(skuOption, {
    productRepository: deps.productRepository,
    inventoryRepository: deps.inventoryRepository,
  });

  if (results.length === 0) {
    await interaction.editReply(
      skuOption ? `Không tìm thấy SKU "${skuOption.toUpperCase()}" (hoặc SKU đã ngừng hoạt động).` : "Chưa có sản phẩm nào đang hoạt động.",
    );
    return;
  }

  await interaction.editReply({ embeds: [renderInventoryCheck(results)] });
}
