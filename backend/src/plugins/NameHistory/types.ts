import * as t from "io-ts";
import { BasePluginType, command, eventListener } from "knub";
import { GuildNicknameHistory } from "src/data/GuildNicknameHistory";
import { UsernameHistory } from "src/data/UsernameHistory";
import { Queue } from "src/Queue";

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

export const nameHistoryCmd = command<NameHistoryPluginType>();
export const nameHistoryEvt = eventListener<NameHistoryPluginType>();
