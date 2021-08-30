import { MessageEmbed, MessageMentionTypes, MessageOptions, Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { allowTimeout } from "../../../RegExpRunner";
import { createChunkedEmbedMessage, createChunkedMessage, noop } from "../../../utils";
import { ILogTypeData, LogsPluginType, ParsedMessageType, TLogChannelMap } from "../types";
import { getLogMessage } from "./getLogMessage";
import { TypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { LogType } from "../../../data/LogType";

const excludedUserProps = ["user", "member", "mod"];
const excludedRoleProps = ["message.member.roles", "member.roles"];

function isRoleArray(value: any): value is string[] {
  return Array.isArray(value);
}

interface ExclusionData {
  userId?: Snowflake | null;
  bot?: boolean | null;
  roles?: Snowflake[] | null;
  channel?: Snowflake | null;
  category?: Snowflake | null;
  messageTextContent?: string | null;
}

export async function log<TLogType extends keyof ILogTypeData>(
  pluginData: GuildPluginData<LogsPluginType>,
  type: TLogType,
  data: TypedTemplateSafeValueContainer<ILogTypeData[TLogType]>,
  exclusionData: ExclusionData = {},
) {
  const logChannels: TLogChannelMap = pluginData.config.get().channels;
  const typeStr = LogType[type];

  logChannelLoop: for (const [channelId, opts] of Object.entries(logChannels)) {
    const channel = pluginData.guild.channels.cache.get(channelId as Snowflake);
    if (!channel || !(channel instanceof TextChannel)) continue;

    if ((opts.include && opts.include.includes(typeStr)) || (opts.exclude && !opts.exclude.includes(typeStr))) {
      // If this log entry is about an excluded user, skip it
      // TODO: Quick and dirty solution, look into changing at some point
      if (opts.excluded_users && exclusionData.userId && opts.excluded_users.includes(exclusionData.userId)) {
        continue;
      }

      // If we're excluding bots and the logged user is a bot, skip it
      if (opts.exclude_bots && exclusionData.bot) {
        continue;
      }

      if (opts.excluded_roles && exclusionData.roles) {
        for (const role of exclusionData.roles) {
          if (opts.excluded_roles.includes(role)) {
            continue logChannelLoop;
          }
        }
      }

      if (opts.excluded_channels && exclusionData.channel && opts.excluded_channels.includes(exclusionData.channel)) {
        continue;
      }

      if (
        opts.excluded_categories &&
        exclusionData.category &&
        opts.excluded_categories.includes(exclusionData.category)
      ) {
        continue;
      }

      if (opts.excluded_message_regexes && exclusionData.messageTextContent) {
        for (const regex of opts.excluded_message_regexes) {
          const matches = await pluginData.state.regexRunner
            .exec(regex, exclusionData.messageTextContent)
            .catch(allowTimeout);
          if (matches) {
            continue logChannelLoop;
          }
        }
      }
      const message = await getLogMessage(pluginData, type, data, {
        format: opts.format,
        include_embed_timestamp: opts.include_embed_timestamp,
        timestamp_format: opts.timestamp_format,
      });

      if (message) {
        // Default to batched unless explicitly disabled
        const batched = opts.batched ?? true;
        const batchTime = opts.batch_time ?? 1000;
        const cfg = pluginData.config.get();
        const parse: MessageMentionTypes[] = cfg.allow_user_mentions ? ["users"] : [];

        if (batched) {
          // If we're batching log messages, gather all log messages within the set batch_time into a single message
          if (!pluginData.state.batches.has(channel.id)) {
            pluginData.state.batches.set(channel.id, []);
            setTimeout(async () => {
              const batch = pluginData.state.batches.get(channel.id);
              if (!batch) return;

              const chunks: ParsedMessageType[] = [];
              for (const msg of batch) {
                if (typeof msg === "string") {
                  // check if the latest chunk is a string, if not, make it one
                  if (typeof chunks[chunks.length - 1] === "string") {
                    chunks[chunks.length - 1] += `\n${msg}`;
                  } else {
                    chunks.push(msg);
                  }
                } else {
                  const msgEmbeds = msg.embeds;
                  const lastEntry = chunks.length > 0 ? chunks[chunks.length - 1] : null;

                  if (!msgEmbeds || msgEmbeds.length === 0) continue;
                  // check if the latest chunk is an embed, if not, make it one
                  if (typeof lastEntry !== "string" && lastEntry?.embeds) {
                    (chunks[chunks.length - 1] as MessageOptions).embeds!.push(...msgEmbeds);
                  } else {
                    chunks.push({ embeds: msgEmbeds });
                  }
                }
              }
              for (const chunk of chunks) {
                if (typeof chunk === "string") {
                  await createChunkedMessage(channel, chunk, { parse });
                } else if (chunk.embeds) {
                  await createChunkedEmbedMessage(channel, chunk.embeds, { parse });
                }
              }

              pluginData.state.batches.delete(channel.id);
            }, batchTime);
          }

          pluginData.state.batches.get(channel.id)!.push(message);
        } else {
          // If we're not batching log messages, just send them immediately
          if (typeof message === "string") {
            await createChunkedMessage(channel, message, { parse }).catch(noop);
          } else {
            await channel.send({ embeds: message.embeds, allowedMentions: { parse } });
          }
        }
      }
    }
  }
}
