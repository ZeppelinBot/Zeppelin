// tslint:disable:no-console

import { HOURS, lazyMemoize } from "../../utils";
import { MemberCache } from "../MemberCache";

const LOOP_INTERVAL = 6 * HOURS;
const getMemberCacheRepository = lazyMemoize(() => new MemberCache());

export async function runExpiredMemberCacheDeletionLoop() {
  console.log("[EXPIRED MEMBER CACHE DELETION LOOP] Deleting stale member cache entries");
  await getMemberCacheRepository().deleteStaleData();
  setTimeout(() => runExpiredMemberCacheDeletionLoop(), LOOP_INTERVAL);
}
