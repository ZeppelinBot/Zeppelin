import * as t from "io-ts";
import { BasePluginType, typedGuildEventListener } from "knub";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildMutes } from "../../data/GuildMutes";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { tNullable } from "../../utils";

const BaseSingleSpamConfig = t.type({
  interval: t.number,
  count: t.number,
  mute: tNullable(t.boolean),
  mute_time: tNullable(t.number),
  remove_roles_on_mute: tNullable(t.union([t.boolean, t.array(t.string)])),
  restore_roles_on_mute: tNullable(t.union([t.boolean, t.array(t.string)])),
  clean: tNullable(t.boolean),
});
export type TBaseSingleSpamConfig = t.TypeOf<typeof BaseSingleSpamConfig>;

export const ConfigSchema = t.type({
  max_censor: tNullable(BaseSingleSpamConfig),
  max_messages: tNullable(BaseSingleSpamConfig),
  max_mentions: tNullable(BaseSingleSpamConfig),
  max_links: tNullable(BaseSingleSpamConfig),
  max_attachments: tNullable(BaseSingleSpamConfig),
  max_emojis: tNullable(BaseSingleSpamConfig),
  max_newlines: tNullable(BaseSingleSpamConfig),
  max_duplicates: tNullable(BaseSingleSpamConfig),
  max_characters: tNullable(BaseSingleSpamConfig),
  max_voice_moves: tNullable(BaseSingleSpamConfig),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

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
  config: TConfigSchema;
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

export const spamEvt = typedGuildEventListener<SpamPluginType>();
