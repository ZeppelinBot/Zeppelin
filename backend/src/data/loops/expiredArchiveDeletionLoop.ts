// tslint:disable:no-console

import { lazyMemoize, MINUTES } from "../../utils";
import { Archives } from "../Archives";

const LOOP_INTERVAL = 15 * MINUTES;
const getArchivesRepository = lazyMemoize(() => new Archives());

export async function runExpiredArchiveDeletionLoop() {
  console.log("[EXPIRED ARCHIVE DELETION LOOP] Deleting expired archives");
  await getArchivesRepository().deleteExpiredArchives();
  setTimeout(() => runExpiredArchiveDeletionLoop(), LOOP_INTERVAL);
}
