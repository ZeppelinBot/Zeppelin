// tslint:disable:no-console

import moment from "moment-timezone";
import { lazyMemoize, MINUTES } from "../../utils";
import { Reminder } from "../entities/Reminder";
import { emitGuildEvent, hasGuildEventListener } from "../GuildEvents";
import { Reminders } from "../Reminders";
import Timeout = NodeJS.Timeout;

const LOOP_INTERVAL = 15 * MINUTES;
const MAX_TRIES_PER_SERVER = 3;
const getRemindersRepository = lazyMemoize(() => new Reminders());
const timeouts = new Map<number, Timeout>();

function broadcastReminder(reminder: Reminder, tries = 0) {
  if (!hasGuildEventListener(reminder.guild_id, "reminder")) {
    // If there are no listeners registered for the server yet, try again in a bit
    if (tries < MAX_TRIES_PER_SERVER) {
      timeouts.set(
        reminder.id,
        setTimeout(() => broadcastReminder(reminder, tries + 1), 1 * MINUTES),
      );
    }
    return;
  }
  emitGuildEvent(reminder.guild_id, "reminder", [reminder]);
}

export async function runUpcomingRemindersLoop() {
  console.log("[REMINDERS LOOP] Clearing old timeouts");
  for (const timeout of timeouts.values()) {
    clearTimeout(timeout);
  }

  console.log("[REMINDERS LOOP] Setting timeouts for upcoming reminders");
  const remindersDueSoon = await getRemindersRepository().getRemindersDueSoon(LOOP_INTERVAL);
  for (const reminder of remindersDueSoon) {
    const remaining = Math.max(0, moment.utc(reminder.remind_at!).diff(moment.utc()));
    timeouts.set(
      reminder.id,
      setTimeout(() => broadcastReminder(reminder), remaining),
    );
  }

  console.log("[REMINDERS LOOP] Scheduling next loop");
  setTimeout(() => runUpcomingRemindersLoop(), LOOP_INTERVAL);
}

export function registerUpcomingReminder(reminder: Reminder) {
  clearUpcomingReminder(reminder);

  console.log("[REMINDERS LOOP] Registering new upcoming reminder");
  const remaining = Math.max(0, moment.utc(reminder.remind_at).diff(moment.utc()));
  if (remaining > LOOP_INTERVAL) {
    return;
  }

  timeouts.set(
    reminder.id,
    setTimeout(() => broadcastReminder(reminder), remaining),
  );
}

export function clearUpcomingReminder(reminder: Reminder) {
  console.log("[REMINDERS LOOP] Clearing upcoming reminder");
  if (timeouts.has(reminder.id)) {
    clearTimeout(timeouts.get(reminder.id)!);
  }
}
