import { MessageCreateOptions } from "discord.js";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { LogType } from "../../../data/LogType.js";
import { logger } from "../../../logger.js";
import {
  renderTemplate,
  TemplateParseError,
  TemplateSafeValueContainer,
  TypedTemplateSafeValueContainer,
} from "../../../templateFormatter.js";
import {
  messageSummary,
  renderRecursively,
  resolveMember,
  validateAndParseMessageContent,
  verboseChannelMention,
  verboseUserMention,
  verboseUserName,
} from "../../../utils.js";
import {
  getTemplateSafeMemberLevel,
  memberToTemplateSafeMember,
  TemplateSafeMember,
  TemplateSafeUser,
} from "../../../utils/templateSafeObjects.js";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin.js";
import { ILogTypeData, LogsPluginType, TLogChannel } from "../types.js";

export async function getLogMessage<TLogType extends keyof ILogTypeData>(
  pluginData: GuildPluginData<LogsPluginType>,
  type: TLogType,
  data: TypedTemplateSafeValueContainer<ILogTypeData[TLogType]>,
  opts?: Pick<TLogChannel, "format" | "timestamp_format" | "include_embed_timestamp">,
): Promise<MessageCreateOptions | null> {
  const config = pluginData.config.get();
  const format = opts?.format?.[LogType[type]] || config.format[LogType[type]] || "";
  if (format === "" || format == null) return null;

  // See comment on FORMAT_NO_TIMESTAMP in types.ts
  const timestampFormat = opts?.timestamp_format ?? config.timestamp_format;

  const includeEmbedTimestamp = opts?.include_embed_timestamp ?? config.include_embed_timestamp;

  const time = pluginData.getPlugin(TimeAndDatePlugin).inGuildTz();
  const isoTimestamp = time.toISOString();
  const timestamp = timestampFormat ? time.format(timestampFormat) : "";

  const values = new TemplateSafeValueContainer({
    ...data,
    timestamp,
    userMention: async (inputUserOrMember: unknown) => {
      if (!inputUserOrMember) {
        return "";
      }

      const inputArray = Array.isArray(inputUserOrMember) ? inputUserOrMember : [inputUserOrMember];
      // TODO: Resolve IDs to users/members
      const usersOrMembers = inputArray.filter(
        (v) => v instanceof TemplateSafeUser || v instanceof TemplateSafeMember,
      ) as Array<TemplateSafeUser | TemplateSafeMember>;

      const mentions: string[] = [];
      for (const userOrMember of usersOrMembers) {
        let user;
        let member: TemplateSafeMember | null = null;

        if (userOrMember.user) {
          member = userOrMember as TemplateSafeMember;
          user = member.user;
        } else {
          user = userOrMember;
          const apiMember = await resolveMember(pluginData.client, pluginData.guild, user.id);
          if (apiMember) {
            member = memberToTemplateSafeMember(apiMember);
          }
        }

        const level = member ? getTemplateSafeMemberLevel(pluginData, member) : 0;
        const memberConfig =
          (await pluginData.config.getMatchingConfig({
            level,
            memberRoles: member ? member.roles.map((r) => r.id) : [],
            userId: user.id,
          })) || ({} as any);

        // Revert to old behavior (verbose name w/o ping if allow_user_mentions is enabled (for whatever reason))
        if (config.allow_user_mentions) {
          mentions.push(memberConfig.ping_user ? verboseUserMention(user) : verboseUserName(user));
        } else {
          mentions.push(verboseUserMention(user));
        }
      }

      return mentions.join(", ");
    },
    channelMention: (channel) => {
      if (!channel) return "";
      return verboseChannelMention(channel);
    },
    messageSummary: (msg: SavedMessage) => {
      if (!msg) return "";
      return messageSummary(msg);
    },
  });

  if (type === LogType.BOT_ALERT) {
    const valuesWithoutTmplEval = { ...values };
    values.tmplEval = (str) => {
      return renderTemplate(str, valuesWithoutTmplEval);
    };
  }

  const renderLogString = (str) => renderTemplate(str, values);

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
  } else if (formatted != null) {
    formatted = validateAndParseMessageContent(formatted);

    if (formatted.embeds && Array.isArray(formatted.embeds) && includeEmbedTimestamp) {
      for (const embed of formatted.embeds) {
        embed.timestamp = isoTimestamp;
      }
    }
  }

  return formatted;
}
