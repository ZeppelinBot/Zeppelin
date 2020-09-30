import * as t from "io-ts";
import { BasePluginType, guildCommand, guildEventListener } from "knub";
import { tDelayString, MINUTES } from "../../utils";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { SavedMessage } from "../../data/entities/SavedMessage";

export const MAX_DELAY = 5 * MINUTES;

export interface IDeletionQueueItem {
  deleteAt: number;
  message: SavedMessage;
}

export const ConfigSchema = t.type({
  enabled: t.boolean,
  delay: tDelayString,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface AutoDeletePluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    guildSavedMessages: GuildSavedMessages;
    guildLogs: GuildLogs;

    deletionQueue: IDeletionQueueItem[];
    nextDeletion: number;
    nextDeletionTimeout;

    maxDelayWarningSent: boolean;

    onMessageCreateFn;
    onMessageDeleteFn;
    onMessageDeleteBulkFn;
  };
}
