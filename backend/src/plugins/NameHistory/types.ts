import * as t from "io-ts";
import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand } from "knub";
import { Queue } from "../../Queue";
import { GuildNicknameHistory } from "../../data/GuildNicknameHistory";
import { UsernameHistory } from "../../data/UsernameHistory";

export const ConfigSchema = t.type({
  can_view: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface NameHistoryPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    nicknameHistory: GuildNicknameHistory;
    usernameHistory: UsernameHistory;
    updateQueue: Queue;
  };
}

export const nameHistoryCmd = guildPluginMessageCommand<NameHistoryPluginType>();
export const nameHistoryEvt = guildPluginEventListener<NameHistoryPluginType>();
