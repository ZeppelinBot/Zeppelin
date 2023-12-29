import * as t from "io-ts";
import { GuildMemberCache } from "../../data/GuildMemberCache";
import { makeIoTsConfigParser, mapToPublicFn } from "../../pluginUtils";
import { SECONDS } from "../../utils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { cancelDeletionOnMemberJoin } from "./events/cancelDeletionOnMemberJoin";
import { removeMemberCacheOnMemberLeave } from "./events/removeMemberCacheOnMemberLeave";
import { updateMemberCacheOnMemberUpdate } from "./events/updateMemberCacheOnMemberUpdate";
import { updateMemberCacheOnMessage } from "./events/updateMemberCacheOnMessage";
import { updateMemberCacheOnRoleChange } from "./events/updateMemberCacheOnRoleChange";
import { updateMemberCacheOnVoiceStateUpdate } from "./events/updateMemberCacheOnVoiceStateUpdate";
import { getCachedMemberData } from "./functions/getCachedMemberData";
import { GuildMemberCachePluginType } from "./types";

const PENDING_SAVE_INTERVAL = 30 * SECONDS;

export const GuildMemberCachePlugin = zeppelinGuildPlugin<GuildMemberCachePluginType>()({
  name: "guild_member_cache",
  showInDocs: false,

  configParser: makeIoTsConfigParser(t.type({})),

  events: [
    updateMemberCacheOnMemberUpdate,
    updateMemberCacheOnMessage,
    updateMemberCacheOnVoiceStateUpdate,
    updateMemberCacheOnRoleChange,
    removeMemberCacheOnMemberLeave,
    cancelDeletionOnMemberJoin,
  ],

  public: {
    getCachedMemberData: mapToPublicFn(getCachedMemberData),
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
