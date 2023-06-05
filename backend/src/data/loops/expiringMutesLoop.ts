// tslint:disable:no-console

import moment from "moment-timezone";
import { lazyMemoize, MINUTES, SECONDS } from "../../utils";
import { Mute } from "../entities/Mute";
import { emitGuildEvent, hasGuildEventListener } from "../GuildEvents";
import { Mutes, TIMEOUT_RENEWAL_THRESHOLD } from "../Mutes";
import Timeout = NodeJS.Timeout;

const LOOP_INTERVAL = 15 * MINUTES;
const MAX_TRIES_PER_SERVER = 3;
const getMutesRepository = lazyMemoize(() => new Mutes());
const timeouts = new Map<string, Timeout>();

function muteToKey(mute: Mute) {
  return `${mute.guild_id}/${mute.user_id}`;
}

async function broadcastExpiredMute(guildId: string, userId: string, tries = 0) {
  const mute = await getMutesRepository().findMute(guildId, userId);
  if (!mute) {
    // Mute was already cleared
    return;
  }
  if (!mute.expires_at || moment(mute.expires_at).diff(moment()) > 10 * SECONDS) {
    // Mute duration was changed and it's no longer expiring now
    return;
  }

  console.log(`[EXPIRING MUTES LOOP] Broadcasting expired mute: ${mute.guild_id}/${mute.user_id}`);
  if (!hasGuildEventListener(mute.guild_id, "expiredMute")) {
    // If there are no listeners registered for the server yet, try again in a bit
    if (tries < MAX_TRIES_PER_SERVER) {
      timeouts.set(
        muteToKey(mute),
        setTimeout(() => broadcastExpiredMute(guildId, userId, tries + 1), 1 * MINUTES),
      );
    }
    return;
  }
  emitGuildEvent(mute.guild_id, "expiredMute", [mute]);
}

function broadcastTimeoutMuteToRenew(mute: Mute, tries = 0) {
  console.log(`[EXPIRING MUTES LOOP] Broadcasting timeout mute to renew: ${mute.guild_id}/${mute.user_id}`);
  if (!hasGuildEventListener(mute.guild_id, "timeoutMuteToRenew")) {
    // If there are no listeners registered for the server yet, try again in a bit
    if (tries < MAX_TRIES_PER_SERVER) {
      timeouts.set(
        muteToKey(mute),
        setTimeout(() => broadcastTimeoutMuteToRenew(mute, tries + 1), 1 * MINUTES),
      );
    }
    return;
  }
  emitGuildEvent(mute.guild_id, "timeoutMuteToRenew", [mute]);
}

export async function runExpiringMutesLoop() {
  console.log("[EXPIRING MUTES LOOP] Clearing old timeouts");
  for (const timeout of timeouts.values()) {
    clearTimeout(timeout);
  }

  console.log("[EXPIRING MUTES LOOP] Clearing old expired mutes");
  await getMutesRepository().clearOldExpiredMutes();

  console.log("[EXPIRING MUTES LOOP] Setting timeouts for expiring mutes");
  const expiringMutes = await getMutesRepository().getSoonExpiringMutes(LOOP_INTERVAL);
  for (const mute of expiringMutes) {
    const remaining = Math.max(0, moment.utc(mute.expires_at!).diff(moment.utc()));
    timeouts.set(
      muteToKey(mute),
      setTimeout(() => broadcastExpiredMute(mute.guild_id, mute.user_id), remaining),
    );
  }

  console.log("[EXPIRING MUTES LOOP] Broadcasting timeout mutes to renew");
  const timeoutMutesToRenew = await getMutesRepository().getTimeoutMutesToRenew(TIMEOUT_RENEWAL_THRESHOLD);
  for (const mute of timeoutMutesToRenew) {
    broadcastTimeoutMuteToRenew(mute);
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
    setTimeout(() => broadcastExpiredMute(mute.guild_id, mute.user_id), remaining),
  );
}

export function clearExpiringMute(mute: Mute) {
  console.log("[EXPIRING MUTES LOOP] Clearing expiring mute");
  if (timeouts.has(muteToKey(mute))) {
    clearTimeout(timeouts.get(muteToKey(mute))!);
  }
}
