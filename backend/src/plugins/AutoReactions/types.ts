import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand } from "knub";
import z from "zod";
import { GuildAutoReactions } from "../../data/GuildAutoReactions.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { AutoReaction } from "../../data/entities/AutoReaction.js";

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
