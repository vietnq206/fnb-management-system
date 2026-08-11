import { loadEnv } from "./infrastructure/config/env.js";
import { createDatabase } from "./infrastructure/postgres/client.js";
import { createEmployeeRepository } from "./infrastructure/postgres/repositories/employee.repository.js";
import { createProductRepository } from "./infrastructure/postgres/repositories/product.repository.js";
import { createInventoryRepository } from "./infrastructure/postgres/repositories/inventory.repository.js";
import { createAuditLogRepository } from "./infrastructure/postgres/repositories/audit-log.repository.js";
import { createDiscordBot, registerCommands } from "./adapters/discord/bot.js";
import type { DiscordAdapterDeps } from "./adapters/discord/dependencies.js";

async function main() {
  const env = loadEnv();
  const { db } = createDatabase(env.DATABASE_URL);

  const deps: DiscordAdapterDeps = {
    employeeRepository: createEmployeeRepository(db),
    productRepository: createProductRepository(db),
    inventoryRepository: createInventoryRepository(db),
    auditLogRepository: createAuditLogRepository(db),
  };

  const botConfig = { token: env.DISCORD_TOKEN, clientId: env.DISCORD_CLIENT_ID, guildId: env.DISCORD_GUILD_ID };

  await registerCommands(botConfig);
  console.log("Slash commands registered.");

  const bot = createDiscordBot(botConfig, deps);
  await bot.login(env.DISCORD_TOKEN);
}

main().catch((error) => {
  console.error("Fatal error during startup:", error);
  process.exit(1);
});
