import * as t from "io-ts";
import { BasePluginType } from "knub";
import { tDelayString, MINUTES } from "src/utils";
import { GuildLogs } from "src/data/GuildLogs";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { SavedMessage } from "src/data/entities/SavedMessage";

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
