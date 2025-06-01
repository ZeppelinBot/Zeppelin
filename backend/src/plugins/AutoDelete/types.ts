import { BasePluginType } from "knub";
import z from "zod/v4";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { SavedMessage } from "../../data/entities/SavedMessage.js";
import { MINUTES, zDelayString } from "../../utils.js";

export const MAX_DELAY = 5 * MINUTES;

export interface IDeletionQueueItem {
  deleteAt: number;
  message: SavedMessage;
}

export const zAutoDeleteConfig = z.strictObject({
  enabled: z.boolean().default(false),
  delay: zDelayString.default("5s"),
});

export interface AutoDeletePluginType extends BasePluginType {
  configSchema: typeof zAutoDeleteConfig;
  state: {
    guildSavedMessages: GuildSavedMessages;
    guildLogs: GuildLogs;

    deletionQueue: IDeletionQueueItem[];
    nextDeletion: number | null;
    nextDeletionTimeout: NodeJS.Timeout | null;

    maxDelayWarningSent: boolean;

    onMessageCreateFn;
    onMessageDeleteFn;
    onMessageDeleteBulkFn;
  };
}
