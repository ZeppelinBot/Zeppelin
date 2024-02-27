import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand } from "knub";
import z from "zod";
import { GuildAutoReactions } from "../../data/GuildAutoReactions";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { AutoReaction } from "../../data/entities/AutoReaction";

export const zAutoReactionsConfig = z.strictObject({
  can_manage: z.boolean(),
});

export interface AutoReactionsPluginType extends BasePluginType {
  config: z.output<typeof zAutoReactionsConfig>;
  state: {
    logs: GuildLogs;
    savedMessages: GuildSavedMessages;
    autoReactions: GuildAutoReactions;
    cache: Map<string, AutoReaction | null>;
  };
}

export const autoReactionsCmd = guildPluginMessageCommand<AutoReactionsPluginType>();
export const autoReactionsEvt = guildPluginEventListener<AutoReactionsPluginType>();
