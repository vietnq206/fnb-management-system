import { randomUUID } from "node:crypto";
import type { InventoryPreview } from "../../application/inventory/types.js";

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * MVP-only in-memory store for "pending preview, waiting for Confirm click".
 * Fine for a single-instance modular monolith. If the app ever runs more than
 * one instance, move this to Postgres/Redis so sessions survive across instances.
 */
class InventorySessionStore {
  private sessions = new Map<string, { preview: InventoryPreview; timer: NodeJS.Timeout }>();

  create(preview: InventoryPreview): string {
    const sessionId = randomUUID();
    const timer = setTimeout(() => this.sessions.delete(sessionId), SESSION_TTL_MS);
    timer.unref();
    this.sessions.set(sessionId, { preview, timer });
    return sessionId;
  }

  get(sessionId: string): InventoryPreview | undefined {
    return this.sessions.get(sessionId)?.preview;
  }

  delete(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (entry) clearTimeout(entry.timer);
    this.sessions.delete(sessionId);
  }
}

export const inventorySessionStore = new InventorySessionStore();
