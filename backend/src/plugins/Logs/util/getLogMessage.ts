import { MessageOptions } from "discord.js";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { logger } from "../../../logger";
import { renderTemplate, TemplateParseError } from "../../../templateFormatter";
import {
  messageSummary,
  renderRecursively,
  resolveMember,
  verboseChannelMention,
  verboseUserMention,
  verboseUserName,
} from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { FORMAT_NO_TIMESTAMP, LogsPluginType, TLogChannel } from "../types";

export async function getLogMessage(
  pluginData: GuildPluginData<LogsPluginType>,
  type: LogType,
  data: any,
  opts?: Pick<TLogChannel, "format" | "timestamp_format" | "include_embed_timestamp">,
): Promise<MessageOptions | null> {
  const config = pluginData.config.get();
  const format = opts?.format?.[LogType[type]] || config.format[LogType[type]] || "";
  if (format === "" || format == null) return null;

  // See comment on FORMAT_NO_TIMESTAMP in types.ts
  const timestampFormat =
    opts?.timestamp_format ??
    (config.format.timestamp !== FORMAT_NO_TIMESTAMP ? config.format.timestamp : null) ??
    config.timestamp_format;

  const includeEmbedTimestamp = opts?.include_embed_timestamp ?? config.include_embed_timestamp;

  const time = pluginData.getPlugin(TimeAndDatePlugin).inGuildTz();
  const isoTimestamp = time.toISOString();
  const timestamp = timestampFormat ? time.format(timestampFormat) : "";

  const values = {
    ...data,
    timestamp,
    userMention: async inputUserOrMember => {
      if (!inputUserOrMember) return "";

      const usersOrMembers = Array.isArray(inputUserOrMember) ? inputUserOrMember : [inputUserOrMember];

      const mentions: string[] = [];
      for (const userOrMember of usersOrMembers) {
        let user;
        let member;

        if (userOrMember.user) {
          member = userOrMember;
          user = member.user;
        } else {
          user = userOrMember;
          member = await resolveMember(pluginData.client, pluginData.guild, user.id);
        }

        const memberConfig = (await pluginData.config.getMatchingConfig({ member, userId: user.id })) || ({} as any);

        // Revert to old behavior (verbose name w/o ping if allow_user_mentions is enabled (for whatever reason))
        if (config.allow_user_mentions) {
          mentions.push(memberConfig.ping_user ? verboseUserMention(user) : verboseUserName(user));
        } else {
          mentions.push(verboseUserMention(user));
        }
      }

      return mentions.join(", ");
    },
    channelMention: channel => {
      if (!channel) return "";
      return verboseChannelMention(channel);
    },
    messageSummary: (msg: SavedMessage) => {
      if (!msg) return "";
      return messageSummary(msg);
    },
  };

  if (type === LogType.BOT_ALERT) {
    const valuesWithoutTmplEval = { ...values };
    values.tmplEval = str => {
      return renderTemplate(str, valuesWithoutTmplEval);
    };
  }

  const renderLogString = str => renderTemplate(str, values);

  let formatted;
  try {
    formatted =
      typeof format === "string" ? await renderLogString(format) : await renderRecursively(format, renderLogString);
  } catch (e) {
    if (e instanceof TemplateParseError) {
      logger.error(`Error when parsing template:\nError: ${e.message}\nTemplate: ${format}`);
      return null;
    } else {
      throw e;
    }
  }

  if (typeof formatted === "string") {
    formatted = formatted.trim();
    if (timestamp) {
      formatted = `\`[${timestamp}]\` ${formatted}`;
    }
  } else if (formatted != null && formatted.embed && includeEmbedTimestamp) {
    formatted.embed.timestamp = isoTimestamp;
  }

  return formatted;
}
