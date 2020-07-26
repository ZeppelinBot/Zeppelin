import { PluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "src/data/LogType";
import { verboseUserMention, verboseUserName, verboseChannelMention, messageSummary, resolveMember } from "src/utils";
import { SavedMessage } from "src/data/entities/SavedMessage";
import { renderTemplate, TemplateParseError } from "src/templateFormatter";
import { logger } from "src/logger";
import moment from "moment-timezone";

export async function getLogMessage(pluginData: PluginData<LogsPluginType>, type, data): Promise<string> {
  const config = pluginData.config.get();
  const format = config.format[LogType[type]] || "";
  if (format === "") return;

  let formatted;
  try {
    const values = {
      ...data,
      userMention: async inputUserOrMember => {
        if (!inputUserOrMember) return "";

        const usersOrMembers = Array.isArray(inputUserOrMember) ? inputUserOrMember : [inputUserOrMember];

        const mentions = [];
        for (const userOrMember of usersOrMembers) {
          let user;
          let member;

          if (userOrMember.user) {
            member = await resolveMember(pluginData.client, pluginData.guild, userOrMember.id);
            user = member.user;
          } else {
            user = userOrMember;
            member = await resolveMember(pluginData.client, pluginData.guild, user.id);
          }

          const memberConfig = pluginData.config.getMatchingConfig({ member, userId: user.id }) || ({} as any);

          mentions.push(memberConfig.ping_user ? verboseUserMention(user) : verboseUserName(user));
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

    formatted = await renderTemplate(format, values);
  } catch (e) {
    if (e instanceof TemplateParseError) {
      logger.error(`Error when parsing template:\nError: ${e.message}\nTemplate: ${format}`);
      return;
    } else {
      throw e;
    }
  }

  formatted = formatted.trim();

  const timestampFormat = config.format.timestamp;
  if (timestampFormat) {
    const timestamp = moment().format(timestampFormat);
    return `\`[${timestamp}]\` ${formatted}`;
  } else {
    return formatted;
  }
}
