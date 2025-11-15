import { GuildBasedChannel, Message, OmitPartialGroupDMChannel, Snowflake, TextBasedChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { humanizeDurationShort } from "../../../humanizeDuration.js";
import { allowTimeout } from "../../../RegExpRunner.js";
import { DAYS, getInviteCodesInString } from "../../../utils.js";
import { snowflakeToTimestamp } from "../../../utils/snowflakeToTimestamp.js";
import { UtilityPluginType } from "../types.js";

const MAX_CLEAN_COUNT = 300;
const MAX_CLEAN_TIME = 1 * DAYS;
const MAX_CLEAN_API_REQUESTS = 20;

export interface FetchChannelMessagesToCleanOpts {
  count: number;
  beforeId: string;
  upToId?: string;
  authorId?: string;
  includePins?: boolean;
  onlyBotMessages?: boolean;
  onlyWithInvites?: boolean;
  matchContent?: RegExp;
}

export interface SuccessResult {
  messages: SavedMessage[];
  note: string;
}

export interface ErrorResult {
  error: string;
}

export type FetchChannelMessagesToCleanResult = SuccessResult | ErrorResult;

export async function fetchChannelMessagesToClean(
  pluginData: GuildPluginData<UtilityPluginType>,
  targetChannel: GuildBasedChannel & TextBasedChannel,
  opts: FetchChannelMessagesToCleanOpts,
): Promise<FetchChannelMessagesToCleanResult> {
  if (opts.count > MAX_CLEAN_COUNT || opts.count <= 0) {
    return { error: `Clean count must be between 1 and ${MAX_CLEAN_COUNT}` };
  }

  const result: FetchChannelMessagesToCleanResult = {
    messages: [],
    note: "",
  };

  const timestampCutoff = snowflakeToTimestamp(opts.beforeId) - MAX_CLEAN_TIME;
  let foundId = false;

  let pinIds: Set<Snowflake> = new Set();
  if (!opts.includePins) {
    pinIds = new Set((await targetChannel.messages.fetchPinned()).keys());
  }

  const rawMessagesToClean: Array<OmitPartialGroupDMChannel<Message<true>>> = [];
  let beforeId = opts.beforeId;
  let requests = 0;
  while (rawMessagesToClean.length < opts.count) {
    const potentialMessages = await targetChannel.messages.fetch({
      before: beforeId,
      limit: 100,
    });
    if (potentialMessages.size === 0) break;

    requests++;

    const filtered: Array<OmitPartialGroupDMChannel<Message<true>>> = [];
    for (const message of potentialMessages.values()) {
      const contentString = message.content || "";
      if (opts.authorId && message.author.id !== opts.authorId) continue;
      if (opts.onlyBotMessages && !message.author.bot) continue;
      if (pinIds.has(message.id)) continue;
      if (opts.onlyWithInvites && getInviteCodesInString(contentString).length === 0) continue;
      if (opts.upToId && message.id < opts.upToId) {
        foundId = true;
        break;
      }
      if (message.createdTimestamp < timestampCutoff) continue;
      if (
        opts.matchContent &&
        !(await pluginData.state.regexRunner.exec(opts.matchContent, contentString).catch(allowTimeout))
      ) {
        continue;
      }

      filtered.push(message);
    }
    const remaining = opts.count - rawMessagesToClean.length;
    const withoutOverflow = filtered.slice(0, remaining);
    rawMessagesToClean.push(...withoutOverflow);

    beforeId = potentialMessages.lastKey()!;

    if (foundId) {
      break;
    }

    if (rawMessagesToClean.length < opts.count) {
      if (potentialMessages.last()!.createdTimestamp < timestampCutoff) {
        result.note = `stopped looking after reaching ${humanizeDurationShort(MAX_CLEAN_TIME)} old messages`;
        break;
      }

      if (requests >= MAX_CLEAN_API_REQUESTS) {
        result.note = `stopped looking after ${requests * 100} messages`;
        break;
      }
    }
  }

  // Discord messages -> SavedMessages
  if (rawMessagesToClean.length > 0) {
    const existingStored = await pluginData.state.savedMessages.getMultiple(rawMessagesToClean.map((m) => m.id));
    const alreadyStored = existingStored.map((stored) => stored.id);
    const messagesToStore = rawMessagesToClean.filter((potentialMsg) => !alreadyStored.includes(potentialMsg.id));
    await pluginData.state.savedMessages.createFromMessages(messagesToStore);

    result.messages = await pluginData.state.savedMessages.getMultiple(rawMessagesToClean.map((m) => m.id));
  }

  return result;
}
