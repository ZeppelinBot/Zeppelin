import { Guild } from "discord.js";
import { HOURS, noop } from "../../utils";

const MEMBER_REFRESH_FREQUENCY = 1 * HOURS; // How often to do a full member refresh when using commands that need it
const memberRefreshLog = new Map<string, { time: number; promise: Promise<void> }>();

export async function refreshMembersIfNeeded(guild: Guild) {
  const lastRefresh = memberRefreshLog.get(guild.id);
  if (lastRefresh && Date.now() < lastRefresh.time + MEMBER_REFRESH_FREQUENCY) {
    return lastRefresh.promise;
  }

  const loadPromise = guild.members.fetch().then(noop);
  memberRefreshLog.set(guild.id, {
    time: Date.now(),
    promise: loadPromise,
  });

  return loadPromise;
}
