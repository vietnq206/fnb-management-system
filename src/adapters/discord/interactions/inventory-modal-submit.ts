import type { ModalSubmitInteraction } from "discord.js";
import { previewInventoryUpdate } from "../../../application/inventory/preview-inventory-update.js";
import { resolveEmployeeByProvider } from "../../../application/employee/resolve-employee-by-provider.js";
import { inventoryModalInputCustomId } from "../commands/inventory-command.js";
import { inventorySessionStore } from "../inventory-session-store.js";
import { renderInventoryPreview } from "../render-inventory-preview.js";
import type { DiscordAdapterDeps } from "../dependencies.js";

export async function handleInventoryModalSubmit(interaction: ModalSubmitInteraction, deps: DiscordAdapterDeps): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const employee = await resolveEmployeeByProvider("discord", interaction.user.id, deps.employeeRepository);
  if (!employee) {
    await interaction.editReply(
      "Tài khoản Discord của bạn chưa được liên kết với một nhân viên nào. Vui lòng liên hệ quản lý.",
    );
    return;
  }

  const rawText = interaction.fields.getTextInputValue(inventoryModalInputCustomId);

  const preview = await previewInventoryUpdate(
    { rawText, employeeId: employee.id, storeId: employee.storeId },
    { productRepository: deps.productRepository, inventoryRepository: deps.inventoryRepository },
  );

  const sessionId = inventorySessionStore.create(preview);
  const message = renderInventoryPreview(preview, sessionId);
  await interaction.editReply(message);
}
