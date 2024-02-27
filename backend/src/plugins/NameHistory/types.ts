import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand } from "knub";
import z from "zod";
import { Queue } from "../../Queue";
import { GuildNicknameHistory } from "../../data/GuildNicknameHistory";
import { UsernameHistory } from "../../data/UsernameHistory";

export const zNameHistoryConfig = z.strictObject({
  can_view: z.boolean(),
});

export interface NameHistoryPluginType extends BasePluginType {
  config: z.infer<typeof zNameHistoryConfig>;
  state: {
    nicknameHistory: GuildNicknameHistory;
    usernameHistory: UsernameHistory;
    updateQueue: Queue;
  };
}

export const nameHistoryCmd = guildPluginMessageCommand<NameHistoryPluginType>();
export const nameHistoryEvt = guildPluginEventListener<NameHistoryPluginType>();
