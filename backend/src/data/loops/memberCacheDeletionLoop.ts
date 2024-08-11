// tslint:disable:no-console

import { lazyMemoize, MINUTES } from "../../utils.js";
import { MemberCache } from "../MemberCache.js";

const LOOP_INTERVAL = 5 * MINUTES;
const getMemberCacheRepository = lazyMemoize(() => new MemberCache());

export async function runMemberCacheDeletionLoop() {
  console.log("[MEMBER CACHE DELETION LOOP] Deleting entries marked to be deleted");
  await getMemberCacheRepository().deleteMarkedToBeDeletedEntries();
  setTimeout(() => runMemberCacheDeletionLoop(), LOOP_INTERVAL);
}
