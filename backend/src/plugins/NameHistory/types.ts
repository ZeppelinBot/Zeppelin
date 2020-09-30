import * as t from "io-ts";
import { BasePluginType, guildCommand, guildEventListener } from "knub";
import { GuildNicknameHistory } from "../../data/GuildNicknameHistory";
import { UsernameHistory } from "../../data/UsernameHistory";
import { Queue } from "../../Queue";

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

export const nameHistoryCmd = guildCommand<NameHistoryPluginType>();
export const nameHistoryEvt = guildEventListener<NameHistoryPluginType>();
