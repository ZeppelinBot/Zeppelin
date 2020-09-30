import * as t from "io-ts";
import { BasePluginType, guildCommand, guildEventListener } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildAutoReactions } from "../../data/GuildAutoReactions";

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

export const autoReactionsCmd = guildCommand<AutoReactionsPluginType>();
export const autoReactionsEvt = guildEventListener<AutoReactionsPluginType>();
