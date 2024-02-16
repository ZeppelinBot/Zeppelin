import { BasePluginType, guildPluginEventListener } from "knub";
import z from "zod";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildMutes } from "../../data/GuildMutes";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { zSnowflake } from "../../utils";

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
  max_censor: zBaseSingleSpamConfig.nullable(),
  max_messages: zBaseSingleSpamConfig.nullable(),
  max_mentions: zBaseSingleSpamConfig.nullable(),
  max_links: zBaseSingleSpamConfig.nullable(),
  max_attachments: zBaseSingleSpamConfig.nullable(),
  max_emojis: zBaseSingleSpamConfig.nullable(),
  max_newlines: zBaseSingleSpamConfig.nullable(),
  max_duplicates: zBaseSingleSpamConfig.nullable(),
  max_characters: zBaseSingleSpamConfig.nullable(),
  max_voice_moves: zBaseSingleSpamConfig.nullable(),
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

interface IRecentAction<T> {
  type: RecentActionType;
  userId: string;
  actionGroupId: string;
  extraData: T;
  timestamp: number;
  count: number;
}

export interface SpamPluginType extends BasePluginType {
  config: z.infer<typeof zSpamConfig>;
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
