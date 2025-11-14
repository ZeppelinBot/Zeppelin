import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { Queue } from "../../Queue.js";
import { GuildNicknameHistory } from "../../data/GuildNicknameHistory.js";
import { UsernameHistory } from "../../data/UsernameHistory.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zNameHistoryConfig = z.strictObject({
  can_view: z.boolean().default(false),
});

export interface NameHistoryPluginType extends BasePluginType {
  configSchema: typeof zNameHistoryConfig;
  state: {
    nicknameHistory: GuildNicknameHistory;
    usernameHistory: UsernameHistory;
    updateQueue: Queue;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const nameHistoryCmd = guildPluginMessageCommand<NameHistoryPluginType>();
export const nameHistoryEvt = guildPluginEventListener<NameHistoryPluginType>();
