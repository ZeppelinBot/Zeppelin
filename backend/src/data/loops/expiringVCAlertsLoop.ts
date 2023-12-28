// tslint:disable:no-console

import moment from "moment-timezone";
import { lazyMemoize, MINUTES } from "../../utils";
import { VCAlert } from "../entities/VCAlert";
import { emitGuildEvent, hasGuildEventListener } from "../GuildEvents";
import { VCAlerts } from "../VCAlerts";
import Timeout = NodeJS.Timeout;

const LOOP_INTERVAL = 15 * MINUTES;
const MAX_TRIES_PER_SERVER = 3;
const getVCAlertsRepository = lazyMemoize(() => new VCAlerts());
const timeouts = new Map<number, Timeout>();

function broadcastExpiredVCAlert(alert: VCAlert, tries = 0) {
  console.log(`[EXPIRING VCALERTS LOOP] Broadcasting expired vcalert: ${alert.guild_id}/${alert.user_id}`);
  if (!hasGuildEventListener(alert.guild_id, "expiredVCAlert")) {
    // If there are no listeners registered for the server yet, try again in a bit
    if (tries < MAX_TRIES_PER_SERVER) {
      timeouts.set(
        alert.id,
        setTimeout(() => broadcastExpiredVCAlert(alert, tries + 1), 1 * MINUTES),
      );
    }
    return;
  }
  emitGuildEvent(alert.guild_id, "expiredVCAlert", [alert]);
}

export async function runExpiringVCAlertsLoop() {
  console.log("[EXPIRING VCALERTS LOOP] Clearing old timeouts");
  for (const timeout of timeouts.values()) {
    clearTimeout(timeout);
  }

  console.log("[EXPIRING VCALERTS LOOP] Setting timeouts for expiring vcalerts");
  const expiringVCAlerts = await getVCAlertsRepository().getSoonExpiringAlerts(LOOP_INTERVAL);
  for (const alert of expiringVCAlerts) {
    const remaining = Math.max(0, moment.utc(alert.expires_at!).diff(moment.utc()));
    timeouts.set(
      alert.id,
      setTimeout(() => broadcastExpiredVCAlert(alert), remaining),
    );
  }

  console.log("[EXPIRING VCALERTS LOOP] Scheduling next loop");
  setTimeout(() => runExpiringVCAlertsLoop(), LOOP_INTERVAL);
}

export function registerExpiringVCAlert(alert: VCAlert) {
  clearExpiringVCAlert(alert);

  console.log("[EXPIRING VCALERTS LOOP] Registering new expiring vcalert");
  const remaining = Math.max(0, moment.utc(alert.expires_at).diff(moment.utc()));
  if (remaining > LOOP_INTERVAL) {
    return;
  }

  timeouts.set(
    alert.id,
    setTimeout(() => broadcastExpiredVCAlert(alert), remaining),
  );
}

export function clearExpiringVCAlert(alert: VCAlert) {
  console.log("[EXPIRING VCALERTS LOOP] Clearing expiring vcalert");
  if (timeouts.has(alert.id)) {
    clearTimeout(timeouts.get(alert.id)!);
  }
}
