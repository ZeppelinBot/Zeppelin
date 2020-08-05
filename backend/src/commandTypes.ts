import {
  convertDelayStringToMS,
  disableCodeBlocks,
  disableInlineCode,
  isSnowflake,
  resolveMember,
  resolveUser,
  UnknownUser,
} from "./utils";
import { GuildChannel, Member, TextChannel, User } from "eris";
import { baseTypeConverters, baseTypeHelpers, CommandContext, TypeConversionError } from "knub";
import { createTypeHelper } from "knub-command-manager";
import { getChannelIdFromMessageId } from "./data/getChannelIdFromMessageId";

export interface MessageTarget {
  channel: TextChannel;
  messageId: string;
}

const channelAndMessageIdRegex = /^(\d+)[\-\/](\d+)$/;
const messageLinkRegex = /^https:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/\d+\/(\d+)\/(\d+)$/i;

export const commandTypes = {
  ...baseTypeConverters,

  delay(value) {
    const result = convertDelayStringToMS(value);
    if (result == null) {
      throw new TypeConversionError(`Could not convert ${value} to a delay`);
    }

    return result;
  },

  async resolvedUser(value, context: CommandContext<any>) {
    const result = await resolveUser(context.pluginData.client, value);
    if (result == null || result instanceof UnknownUser) {
      throw new TypeConversionError(`User \`${disableCodeBlocks(value)}\` was not found`);
    }
    return result;
  },

  async resolvedUserLoose(value, context: CommandContext<any>) {
    const result = await resolveUser(context.pluginData.client, value);
    if (result == null) {
      throw new TypeConversionError(`Invalid user: \`${disableCodeBlocks(value)}\``);
    }
    return result;
  },

  async resolvedMember(value, context: CommandContext<any>) {
    if (!(context.message.channel instanceof GuildChannel)) return null;

    const result = await resolveMember(context.pluginData.client, context.message.channel.guild, value);
    if (result == null) {
      throw new TypeConversionError(
        `Member \`${disableCodeBlocks(value)}\` was not found or they have left the server`,
      );
    }
    return result;
  },

  async messageTarget(value: string, context: CommandContext<any>) {
    value = String(value).trim();

    const result = await (async () => {
      if (isSnowflake(value)) {
        const channelId = await getChannelIdFromMessageId(value);
        if (!channelId) {
          throw new TypeConversionError(`Could not find channel for message ID \`${disableInlineCode(value)}\``);
        }

        return {
          channelId,
          messageId: value,
        };
      }

      const channelAndMessageIdMatch = value.match(channelAndMessageIdRegex);
      if (channelAndMessageIdMatch) {
        return {
          channelId: channelAndMessageIdMatch[1],
          messageId: channelAndMessageIdMatch[2],
        };
      }

      const messageLinkMatch = value.match(messageLinkRegex);
      if (messageLinkMatch) {
        return {
          channelId: messageLinkMatch[1],
          messageId: messageLinkMatch[2],
        };
      }

      throw new TypeConversionError(`Invalid message ID \`${disableInlineCode(value)}\``);
    })();

    const channel = context.pluginData.guild.channels.get(result.channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      throw new TypeConversionError(`Invalid channel ID \`${disableInlineCode(result.channelId)}\``);
    }

    return {
      channel,
      messageId: result.messageId,
    };
  },
};

export const commandTypeHelpers = {
  ...baseTypeHelpers,

  delay: createTypeHelper<number>(commandTypes.delay),
  resolvedUser: createTypeHelper<Promise<User>>(commandTypes.resolvedUser),
  resolvedUserLoose: createTypeHelper<Promise<User | UnknownUser>>(commandTypes.resolvedUserLoose),
  resolvedMember: createTypeHelper<Promise<Member | null>>(commandTypes.resolvedMember),
  messageTarget: createTypeHelper<Promise<MessageTarget>>(commandTypes.messageTarget),
};
