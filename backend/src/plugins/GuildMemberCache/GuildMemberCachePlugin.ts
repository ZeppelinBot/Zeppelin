import { guildPlugin } from "vety";
import { GuildMemberCache } from "../../data/GuildMemberCache.js";
import { makePublicFn } from "../../pluginUtils.js";
import { SECONDS } from "../../utils.js";
import { cancelDeletionOnMemberJoin } from "./events/cancelDeletionOnMemberJoin.js";
import { removeMemberCacheOnMemberLeave } from "./events/removeMemberCacheOnMemberLeave.js";
import { updateMemberCacheOnMemberUpdate } from "./events/updateMemberCacheOnMemberUpdate.js";
import { updateMemberCacheOnMessage } from "./events/updateMemberCacheOnMessage.js";
import { updateMemberCacheOnRoleChange } from "./events/updateMemberCacheOnRoleChange.js";
import { updateMemberCacheOnVoiceStateUpdate } from "./events/updateMemberCacheOnVoiceStateUpdate.js";
import { getCachedMemberData } from "./functions/getCachedMemberData.js";
import { GuildMemberCachePluginType, zGuildMemberCacheConfig } from "./types.js";

const PENDING_SAVE_INTERVAL = 30 * SECONDS;

export const GuildMemberCachePlugin = guildPlugin<GuildMemberCachePluginType>()({
  name: "guild_member_cache",

  configSchema: zGuildMemberCacheConfig,

  events: [
    updateMemberCacheOnMemberUpdate,
    updateMemberCacheOnMessage,
    updateMemberCacheOnVoiceStateUpdate,
    updateMemberCacheOnRoleChange,
    removeMemberCacheOnMemberLeave,
    cancelDeletionOnMemberJoin,
  ],

  public(pluginData) {
    return {
      getCachedMemberData: makePublicFn(pluginData, getCachedMemberData),
    };
  },

  beforeLoad(pluginData) {
    pluginData.state.memberCache = GuildMemberCache.getGuildInstance(pluginData.guild.id);
    // This won't leak memory... too much #trust
    pluginData.state.initialUpdatedMembers = new Set();
  },

  afterLoad(pluginData) {
    pluginData.state.saveInterval = setInterval(
      () => pluginData.state.memberCache.savePendingUpdates(),
      PENDING_SAVE_INTERVAL,
    );
  },

  async beforeUnload(pluginData) {
    clearInterval(pluginData.state.saveInterval);
    await pluginData.state.memberCache.savePendingUpdates();
  },
});
