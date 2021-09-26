import { lazyMemoize, memoize, MINUTES } from "../../utils";
import { Mutes } from "../Mutes";
import Timeout = NodeJS.Timeout;
import moment from "moment-timezone";
import { Mute } from "../entities/Mute";
import { emitGuildEvent, hasGuildEventListener } from "../GuildEvents";

const LOOP_INTERVAL = 15 * MINUTES;
const MAX_TRIES_PER_SERVER = 3;
const getMutesRepository = lazyMemoize(() => new Mutes());
const timeouts = new Map<string, Timeout>();

function muteToKey(mute: Mute) {
  return `${mute.guild_id}/${mute.user_id}`;
}

function broadcastExpiredMute(mute: Mute, tries = 0) {
  console.log(`[EXPIRING MUTES LOOP] Broadcasting expired mute: ${mute.guild_id}/${mute.user_id}`);
  if (!hasGuildEventListener(mute.guild_id, "expiredMute")) {
    // If there are no listeners registered for the server yet, try again in a bit
    if (tries < MAX_TRIES_PER_SERVER) {
      timeouts.set(
        muteToKey(mute),
        setTimeout(() => broadcastExpiredMute(mute, tries + 1), 1 * MINUTES),
      );
    }
    return;
  }
  emitGuildEvent(mute.guild_id, "expiredMute", [mute]);
}

export async function runExpiringMutesLoop() {
  console.log("[EXPIRING MUTES LOOP] Clearing old timeouts");
  for (const timeout of timeouts.values()) {
    clearTimeout(timeout);
  }

  console.log("[EXPIRING MUTES LOOP] Setting timeouts for expiring mutes");
  const expiringMutes = await getMutesRepository().getSoonExpiringMutes(LOOP_INTERVAL);
  for (const mute of expiringMutes) {
    const remaining = Math.max(0, moment.utc(mute.expires_at!).diff(moment.utc()));
    timeouts.set(
      muteToKey(mute),
      setTimeout(() => broadcastExpiredMute(mute), remaining),
    );
  }

  console.log("[EXPIRING MUTES LOOP] Scheduling next loop");
  setTimeout(() => runExpiringMutesLoop(), LOOP_INTERVAL);
}

export function registerExpiringMute(mute: Mute) {
  clearExpiringMute(mute);

  if (mute.expires_at === null) {
    return;
  }

  console.log("[EXPIRING MUTES LOOP] Registering new expiring mute");
  const remaining = Math.max(0, moment.utc(mute.expires_at).diff(moment.utc()));
  if (remaining > LOOP_INTERVAL) {
    return;
  }

  timeouts.set(
    muteToKey(mute),
    setTimeout(() => broadcastExpiredMute(mute), remaining),
  );
}

export function clearExpiringMute(mute: Mute) {
  console.log("[EXPIRING MUTES LOOP] Clearing expiring mute");
  if (timeouts.has(muteToKey(mute))) {
    clearTimeout(timeouts.get(muteToKey(mute))!);
  }
}
