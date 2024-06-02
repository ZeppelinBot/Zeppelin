// tslint:disable:no-console

import { MINUTES } from "../../utils.js";
import { cleanupMessages } from "../cleanup/messages.js";

const LOOP_INTERVAL = 5 * MINUTES;

export async function runSavedMessageCleanupLoop() {
  try {
    console.log("[SAVED MESSAGE CLEANUP LOOP] Deleting old/deleted messages from the database");
    const deleted = await cleanupMessages();
    console.log(`[SAVED MESSAGE CLEANUP LOOP] Deleted ${deleted} old/deleted messages from the database`);
  } finally {
    setTimeout(() => runSavedMessageCleanupLoop(), LOOP_INTERVAL);
  }
}
