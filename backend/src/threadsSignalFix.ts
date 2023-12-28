/**
 * Hack for wiping out the threads signal handlers
 * See: https://github.com/andywer/threads.js/issues/388
 * Make sure:
 * - This is imported before any real imports from "threads"
 * - This is imported as early as possible to avoid removing our own signal handlers
 */
import "threads";
import { env } from "./env";
if (!env.DEBUG) {
  process.removeAllListeners("SIGINT");
  process.removeAllListeners("SIGTERM");
}
