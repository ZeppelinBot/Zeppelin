import { BasePluginType } from "knub";
import z from "zod";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { SavedMessage } from "../../data/entities/SavedMessage";
import { MINUTES, zDelayString } from "../../utils";
import Timeout = NodeJS.Timeout;

export const MAX_DELAY = 5 * MINUTES;

export interface IDeletionQueueItem {
  deleteAt: number;
  message: SavedMessage;
}

export const zAutoDeleteConfig = z.strictObject({
  enabled: z.boolean(),
  delay: zDelayString,
});

export interface AutoDeletePluginType extends BasePluginType {
  config: z.output<typeof zAutoDeleteConfig>;
  state: {
    guildSavedMessages: GuildSavedMessages;
    guildLogs: GuildLogs;

    deletionQueue: IDeletionQueueItem[];
    nextDeletion: number | null;
    nextDeletionTimeout: Timeout | null;

    maxDelayWarningSent: boolean;

    onMessageCreateFn;
    onMessageDeleteFn;
    onMessageDeleteBulkFn;
  };
}
