import { BasePluginType, guildPluginEventListener } from "vety";
import { z } from "zod";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildMutes } from "../../data/GuildMutes.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { zSnowflake } from "../../utils.js";

const zBaseSingleSpamConfig = z.strictObject({
  interval: z.number(),
  count: z.number(),
  mute: z.boolean().default(false),
  mute_time: z.number().nullable().default(null),
  remove_roles_on_mute: z.union([z.boolean(), z.array(zSnowflake)]).default(false),
  restore_roles_on_mute: z.union([z.boolean(), z.array(zSnowflake)]).default(false),
  clean: z.boolean().default(false),
});
export type TBaseSingleSpamConfig = z.infer<typeof zBaseSingleSpamConfig>;

export const zSpamConfig = z.strictObject({
  max_censor: zBaseSingleSpamConfig.nullable().default(null),
  max_messages: zBaseSingleSpamConfig.nullable().default(null),
  max_mentions: zBaseSingleSpamConfig.nullable().default(null),
  max_links: zBaseSingleSpamConfig.nullable().default(null),
  max_attachments: zBaseSingleSpamConfig.nullable().default(null),
  max_emojis: zBaseSingleSpamConfig.nullable().default(null),
  max_newlines: zBaseSingleSpamConfig.nullable().default(null),
  max_duplicates: zBaseSingleSpamConfig.nullable().default(null),
  max_characters: zBaseSingleSpamConfig.nullable().default(null),
  max_voice_moves: zBaseSingleSpamConfig.nullable().default(null),
});

export enum RecentActionType {
  Message = 1,
  Mention,
  Link,
  Attachment,
  Emoji,
  Newline,
  Censor,
  Character,
  VoiceChannelMove,
}

export interface IRecentAction<T> {
  type: RecentActionType;
  userId: string;
  actionGroupId: string;
  extraData: T;
  timestamp: number;
  count: number;
}

export interface SpamPluginType extends BasePluginType {
  configSchema: typeof zSpamConfig;
  state: {
    logs: GuildLogs;
    archives: GuildArchives;
    savedMessages: GuildSavedMessages;
    mutes: GuildMutes;

    onMessageCreateFn;

    // Handle spam detection with a queue so we don't have overlapping detections on the same user
    spamDetectionQueue: Promise<void>;

    // List of recent potentially-spammy actions
    recentActions: Array<IRecentAction<any>>;

    // A map of userId => channelId => msgId
    // Keeps track of the last handled (= spam detected and acted on) message ID per user, per channel
    // TODO: Prevent this from growing infinitely somehow
    lastHandledMsgIds: Map<string, Map<string, string>>;

    expiryInterval;
  };
}

export const spamEvt = guildPluginEventListener<SpamPluginType>();
