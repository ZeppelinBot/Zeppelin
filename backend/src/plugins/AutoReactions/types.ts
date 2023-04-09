import * as t from "io-ts";
import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand } from "knub";
import { AutoReaction } from "../../data/entities/AutoReaction";
import { GuildAutoReactions } from "../../data/GuildAutoReactions";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";

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
    cache: Map<string, AutoReaction | null>;
  };
}

export const autoReactionsCmd = guildPluginMessageCommand<AutoReactionsPluginType>();
export const autoReactionsEvt = guildPluginEventListener<AutoReactionsPluginType>();
