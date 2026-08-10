import { MessageFlags, type ChatInputCommandInteraction, type ModalSubmitInteraction, type ButtonInteraction } from "discord.js";
import { resolveEmployeeByProvider } from "../../application/employee/resolve-employee-by-provider.js";
import { hasAtLeastRole, type EmployeeRole } from "../../core/employee/employee-role.js";
import type { Employee } from "../../core/employee/employee.entity.js";
import type { DiscordAdapterDeps } from "./dependencies.js";

type AuthorizableInteraction = ChatInputCommandInteraction | ModalSubmitInteraction | ButtonInteraction;

async function replyDenied(interaction: AuthorizableInteraction, content: string): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(content);
  } else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
}

/**
 * Backend permission check (Architecture.docx section 7 — "Backend permission check"
 * step, run AFTER Discord itself but BEFORE any business logic). Resolves the Discord
 * user to an internal employee, then checks role hierarchy: admin ⊇ manager ⊇ staff.
 *
 * Every command handler that touches business data must call this before doing
 * anything else. Returns null (and already replies to the user) if denied — callers
 * should just `return` when they get null back.
 */
export async function resolveAuthorizedEmployee(
  interaction: AuthorizableInteraction,
  requiredRole: EmployeeRole,
  deps: DiscordAdapterDeps,
): Promise<Employee | null> {
  const employee = await resolveEmployeeByProvider("discord", interaction.user.id, deps.employeeRepository);

  if (!employee) {
    await replyDenied(interaction, "Tài khoản Discord của bạn chưa được liên kết với nhân viên nào. Vui lòng liên hệ quản lý.");
    return null;
  }

  if (!hasAtLeastRole(employee.role, requiredRole)) {
    await replyDenied(
      interaction,
      `⛔ Bạn không có quyền thực hiện thao tác này (yêu cầu quyền tối thiểu **${requiredRole}**, quyền hiện tại của bạn: **${employee.role}**).`,
    );
    return null;
  }

  return employee;
}
