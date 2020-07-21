import * as t from "io-ts";
import { BasePluginType, command, eventListener } from "knub";
import { GuildLogs } from "src/data/GuildLogs";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildAutoReactions } from "src/data/GuildAutoReactions";

export const ConfigSchema = t.type({
  can_manage: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface AutoReactionsPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    logs: GuildLogs;
    savedMessages: GuildSavedMessages;
    autoReactions: GuildAutoReactions;
  };
}

export const autoReactionsCmd = command<AutoReactionsPluginType>();
export const autoReactionsEvt = eventListener<AutoReactionsPluginType>();
