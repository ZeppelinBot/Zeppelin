// tslint:disable:no-console

import moment from "moment-timezone";
import { lazyMemoize, MINUTES } from "../../utils";
import { Tempban } from "../entities/Tempban";
import { emitGuildEvent, hasGuildEventListener } from "../GuildEvents";
import { Tempbans } from "../Tempbans";
import Timeout = NodeJS.Timeout;

const LOOP_INTERVAL = 15 * MINUTES;
const MAX_TRIES_PER_SERVER = 3;
const getBansRepository = lazyMemoize(() => new Tempbans());
const timeouts = new Map<string, Timeout>();

function tempbanToKey(tempban: Tempban) {
  return `${tempban.guild_id}/${tempban.user_id}`;
}

function broadcastExpiredTempban(tempban: Tempban, tries = 0) {
  console.log(`[EXPIRING TEMPBANS LOOP] Broadcasting expired tempban: ${tempban.guild_id}/${tempban.user_id}`);
  if (!hasGuildEventListener(tempban.guild_id, "expiredTempban")) {
    // If there are no listeners registered for the server yet, try again in a bit
    if (tries < MAX_TRIES_PER_SERVER) {
      timeouts.set(
        tempbanToKey(tempban),
        setTimeout(() => broadcastExpiredTempban(tempban, tries + 1), 1 * MINUTES),
      );
    }
    return;
  }
  emitGuildEvent(tempban.guild_id, "expiredTempban", [tempban]);
}

export async function runExpiringTempbansLoop() {
  console.log("[EXPIRING TEMPBANS LOOP] Clearing old timeouts");
  for (const timeout of timeouts.values()) {
    clearTimeout(timeout);
  }

  console.log("[EXPIRING TEMPBANS LOOP] Setting timeouts for expiring tempbans");
  const expiringTempbans = await getBansRepository().getSoonExpiringTempbans(LOOP_INTERVAL);
  for (const tempban of expiringTempbans) {
    const remaining = Math.max(0, moment.utc(tempban.expires_at!).diff(moment.utc()));
    timeouts.set(
      tempbanToKey(tempban),
      setTimeout(() => broadcastExpiredTempban(tempban), remaining),
    );
  }

  console.log("[EXPIRING TEMPBANS LOOP] Scheduling next loop");
  setTimeout(() => runExpiringTempbansLoop(), LOOP_INTERVAL);
}

export function registerExpiringTempban(tempban: Tempban) {
  clearExpiringTempban(tempban);

  console.log("[EXPIRING TEMPBANS LOOP] Registering new expiring tempban");
  const remaining = Math.max(0, moment.utc(tempban.expires_at).diff(moment.utc()));
  if (remaining > LOOP_INTERVAL) {
    return;
  }

  timeouts.set(
    tempbanToKey(tempban),
    setTimeout(() => broadcastExpiredTempban(tempban), remaining),
  );
}

export function clearExpiringTempban(tempban: Tempban) {
  console.log("[EXPIRING TEMPBANS LOOP] Clearing expiring tempban");
  if (timeouts.has(tempbanToKey(tempban))) {
    clearTimeout(timeouts.get(tempbanToKey(tempban))!);
  }
}
