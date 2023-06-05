import { AuditLogEvent, Guild, GuildAuditLogsEntry } from "discord.js";
import { SECONDS, sleep } from "../utils";

const BATCH_DEBOUNCE_TIME = 2 * SECONDS;
const BATCH_FETCH_COUNT_INCREMENT = 10;

type Batch = {
  _waitUntil: number;
  _fetchCount: number;
  _promise: Promise<GuildAuditLogsEntry[]>;
  join: () => Promise<GuildAuditLogsEntry[]>;
};

const batches = new Map<string, Batch>();

/**
 * Find a recent audit log entry matching the given criteria.
 * This function will debounce and batch simultaneous calls into one audit log request.
 */
export async function findMatchingAuditLogEntry(
  guild: Guild,
  action?: AuditLogEvent,
  targetId?: string,
): Promise<GuildAuditLogsEntry | undefined> {
  let candidates: GuildAuditLogsEntry[];

  if (batches.has(guild.id)) {
    candidates = await batches.get(guild.id)!.join();
  } else {
    const batch: Batch = {
      _waitUntil: Date.now(),
      _fetchCount: 0,
      _promise: new Promise(async (resolve) => {
        await sleep(BATCH_DEBOUNCE_TIME);

        do {
          await sleep(Math.max(0, batch._waitUntil - Date.now()));
        } while (Date.now() < batch._waitUntil);

        const result = await guild
          .fetchAuditLogs({
            limit: batch._fetchCount,
          })
          .catch((err) => {
            // tslint:disable-next-line:no-console
            console.warn(`[DEBUG] Audit log error in ${guild.id} (${guild.name}): ${err.message}`);
            return null;
          });
        const _candidates = Array.from(result?.entries.values() ?? []);

        batches.delete(guild.id);
        // TODO: Figure out the type
        resolve(_candidates as any);
      }),
      join() {
        batch._waitUntil = Date.now() + BATCH_DEBOUNCE_TIME;
        batch._fetchCount = Math.min(100, batch._fetchCount + BATCH_FETCH_COUNT_INCREMENT);
        return batch._promise;
      },
    };
    batches.set(guild.id, batch);
    candidates = await batch.join();
  }

  return candidates.find(
    (entry) =>
      (action == null || entry.action === action) && (targetId == null || (entry.target as any)?.id === targetId),
  );
}
