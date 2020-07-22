import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, MutesPluginType } from "./types";
import { CasesPlugin } from "../Cases/CasesPlugin";
import { GuildMutes } from "../../data/GuildMutes";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildArchives } from "../../data/GuildArchives";
import { clearExpiredMutes } from "./functions/clearExpiredMutes";
import { MutesCmd } from "./commands/MutesCmd";
import { ClearBannedMutesCmd } from "./commands/ClearBannedMutesCmd";
import { ClearActiveMuteOnRoleRemovalEvt } from "./events/ClearActiveMuteOnRoleRemovalEvt";
import { ClearMutesWithoutRoleCmd } from "./commands/ClearMutesWithoutRoleCmd";
import { ClearMutesCmd } from "./commands/ClearMutesCmd";

const defaultOptions = {
  config: {
    mute_role: null,
    move_to_voice_channel: null,

    dm_on_mute: false,
    dm_on_update: false,
    message_on_mute: false,
    message_on_update: false,
    message_channel: null,
    mute_message: "You have been muted on the {guildName} server. Reason given: {reason}",
    timed_mute_message: "You have been muted on the {guildName} server for {time}. Reason given: {reason}",
    update_mute_message: "Your mute on the {guildName} server has been updated to {time}.",

    can_view_list: false,
    can_cleanup: false,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_view_list: true,
      },
    },
    {
      level: ">=100",
      config: {
        can_cleanup: true,
      },
    },
  ],
};

const EXPIRED_MUTE_CHECK_INTERVAL = 60 * 1000;
let FIRST_CHECK_TIME = Date.now();
const FIRST_CHECK_INCREMENT = 5 * 1000;

export const MutesPlugin = zeppelinPlugin<MutesPluginType>()("mutes", {
  configSchema: ConfigSchema,
  defaultOptions,

  dependencies: [CasesPlugin],

  commands: [MutesCmd, ClearBannedMutesCmd, ClearMutesWithoutRoleCmd, ClearMutesCmd],

  events: [ClearActiveMuteOnRoleRemovalEvt],

  onLoad(pluginData) {
    pluginData.state.mutes = GuildMutes.getGuildInstance(pluginData.guild.id);
    pluginData.state.cases = GuildCases.getGuildInstance(pluginData.guild.id);
    pluginData.state.serverLogs = new GuildLogs(pluginData.guild.id);
    pluginData.state.archives = GuildArchives.getGuildInstance(pluginData.guild.id);

    // Check for expired mutes every 5s
    const firstCheckTime = Math.max(Date.now(), FIRST_CHECK_TIME) + FIRST_CHECK_INCREMENT;
    FIRST_CHECK_TIME = firstCheckTime;

    setTimeout(() => {
      clearExpiredMutes(pluginData);
      pluginData.state.muteClearIntervalId = setInterval(
        () => clearExpiredMutes(pluginData),
        EXPIRED_MUTE_CHECK_INTERVAL,
      );
    }, firstCheckTime - Date.now());
  },

  onUnload(pluginData) {
    clearInterval(pluginData.state.muteClearIntervalId);
  },
});
