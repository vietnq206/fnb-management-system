import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { previewInventoryUpdate } from "../../../application/inventory/preview-inventory-update.js";
import { inventoryModalInputCustomId, inventoryCommandRequiredRole } from "../commands/inventory-command.js";
import { inventorySessionStore } from "../inventory-session-store.js";
import { renderInventoryPreview } from "../render-inventory-preview.js";
import { resolveAuthorizedEmployee } from "../authorize.js";
import type { DiscordAdapterDeps } from "../dependencies.js";

export async function handleInventoryModalSubmit(interaction: ModalSubmitInteraction, deps: DiscordAdapterDeps): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Re-check ở đây (không chỉ ở bước mở modal) vì modal có thể mất một lúc mới submit —
  // phòng trường hợp quyền của nhân viên bị đổi ngay trong lúc họ đang điền form.
  const employee = await resolveAuthorizedEmployee(interaction, inventoryCommandRequiredRole, deps);
  if (!employee) return;

  const rawText = interaction.fields.getTextInputValue(inventoryModalInputCustomId);

  const preview = await previewInventoryUpdate(
    { rawText, employeeId: employee.id, storeId: employee.storeId },
    { productRepository: deps.productRepository, inventoryRepository: deps.inventoryRepository },
  );

  const sessionId = inventorySessionStore.create(preview);
  const message = renderInventoryPreview(preview, sessionId);
  await interaction.editReply(message);
}
