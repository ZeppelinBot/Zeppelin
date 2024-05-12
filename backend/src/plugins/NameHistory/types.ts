import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { Queue } from "../../Queue";
import { GuildNicknameHistory } from "../../data/GuildNicknameHistory";
import { UsernameHistory } from "../../data/UsernameHistory";
import { CommonPlugin } from "../Common/CommonPlugin";

export const zNameHistoryConfig = z.strictObject({
  can_view: z.boolean(),
});

export interface NameHistoryPluginType extends BasePluginType {
  config: z.infer<typeof zNameHistoryConfig>;
  state: {
    nicknameHistory: GuildNicknameHistory;
    usernameHistory: UsernameHistory;
    updateQueue: Queue;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const nameHistoryCmd = guildPluginMessageCommand<NameHistoryPluginType>();
export const nameHistoryEvt = guildPluginEventListener<NameHistoryPluginType>();
