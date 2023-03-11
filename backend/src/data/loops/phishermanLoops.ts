// tslint:disable:no-console

import { MINUTES } from "../../utils";
import {
  deleteStalePhishermanCacheEntries,
  deleteStalePhishermanKeyCacheEntries,
  reportTrackedDomainsToPhisherman,
} from "../Phisherman";

const CACHE_CLEANUP_LOOP_INTERVAL = 15 * MINUTES;
const REPORT_LOOP_INTERVAL = 15 * MINUTES;

export async function runPhishermanCacheCleanupLoop() {
  console.log("[PHISHERMAN] Deleting stale cache entries");
  await deleteStalePhishermanCacheEntries().catch((err) => console.warn(err));

  console.log("[PHISHERMAN] Deleting stale key cache entries");
  await deleteStalePhishermanKeyCacheEntries().catch((err) => console.warn(err));

  setTimeout(() => runPhishermanCacheCleanupLoop(), CACHE_CLEANUP_LOOP_INTERVAL);
}

export async function runPhishermanReportingLoop() {
  console.log("[PHISHERMAN] Reporting tracked domains");
  await reportTrackedDomainsToPhisherman().catch((err) => console.warn(err));

  setTimeout(() => runPhishermanReportingLoop(), REPORT_LOOP_INTERVAL);
}
