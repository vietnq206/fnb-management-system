# FnB Management System

Internal business hub. Discord is an interface/adapter only — all business logic and
data live in this backend (TypeScript + Fastify-ready + PostgreSQL via Drizzle ORM).

Design rationale, diagrams, and the full roadmap live in **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**
— that file is the living, editable version of the original `Architecture.docx` and gets
updated whenever the design changes (also tracks what's implemented vs. still planned,
e.g. the upcoming inventory reorder alert feature).

## Milestone 1

Employee sends inventory lines via a Discord slash command, backend validates SKUs
against PostgreSQL, bot shows a preview, employee clicks Confirm, transaction is
persisted to `inventory_transactions`.

## Local setup

1. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`,
   `DISCORD_GUILD_ID` (a dev/test guild id — commands register instantly there).
2. Install deps: `pnpm install`
3. Start Postgres only: `docker compose up -d postgres`
4. Generate + apply schema: `pnpm db:generate && pnpm db:migrate`
5. Seed sample products + map your Discord user to a sample employee:
   set `SEED_DISCORD_USER_ID` in `.env` to your Discord user id, then `pnpm db:seed`
6. Run the bot: `pnpm dev`
7. In Discord, run `/inventory-update`, paste lines like:
   ```
   A1 5
   A2 2
   B3 4
   ```
   Review the preview, click Confirm.

## Folder structure

- `src/core` — domain entities + repository port interfaces. No framework/DB imports.
- `src/application` — use-cases orchestrating core + ports (parse/validate/preview/confirm).
- `src/adapters/discord` — Discord-specific rendering only. Never contains business logic.
- `src/infrastructure` — Drizzle schema, Postgres client, repository implementations, env config.

## Principles

See section 22 of `ARCHITECTURE.md`. Key ones: Discord is an adapter; backend owns
business logic; PostgreSQL is source of truth; never trust platform permissions alone;
AI/OCR output must be human-confirmed before writing to the database.
