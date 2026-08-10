import { Client, GatewayIntentBits, REST, Routes, Events, MessageFlags, type Interaction } from "discord.js";
import { inventoryCommandData, inventoryCommandName, inventoryModalCustomId, handleInventoryCommand } from "./commands/inventory-command.js";
import { inventoryCheckCommandData, inventoryCheckCommandName, handleInventoryCheckCommand } from "./commands/inventory-check-command.js";
import { handleInventoryModalSubmit } from "./interactions/inventory-modal-submit.js";
import { handleInventoryButton, isInventoryButton } from "./interactions/inventory-confirm-button.js";
import type { DiscordAdapterDeps } from "./dependencies.js";

export interface DiscordBotConfig {
  token: string;
  clientId: string;
  guildId?: string;
}

export async function registerCommands(config: DiscordBotConfig): Promise<void> {
  const rest = new REST().setToken(config.token);
  const body = [inventoryCommandData.toJSON(), inventoryCheckCommandData.toJSON()];

  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body });
  }
}

export function createDiscordBot(config: DiscordBotConfig, deps: DiscordAdapterDeps): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord bot logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === inventoryCommandName) {
        await handleInventoryCommand(interaction, deps);
        return;
      }

      if (interaction.isChatInputCommand() && interaction.commandName === inventoryCheckCommandName) {
        await handleInventoryCheckCommand(interaction, deps);
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId === inventoryModalCustomId) {
        await handleInventoryModalSubmit(interaction, deps);
        return;
      }

      if (interaction.isButton() && isInventoryButton(interaction.customId)) {
        await handleInventoryButton(interaction, deps);
        return;
      }
    } catch (error) {
      console.error("Unhandled interaction error:", error);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: "Đã có lỗi xảy ra, vui lòng thử lại.", flags: MessageFlags.Ephemeral })
          .catch(() => {});
      }
    }
  });

  return client;
}
