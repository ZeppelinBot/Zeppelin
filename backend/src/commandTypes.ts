import { GuildChannel, GuildMember, Snowflake, Util, User, GuildTextBasedChannel } from "discord.js";
import { baseCommandParameterTypeHelpers, baseTypeConverters, CommandContext, TypeConversionError } from "knub";
import { createTypeHelper } from "knub-command-manager";
import {
  channelMentionRegex,
  convertDelayStringToMS,
  isValidSnowflake,
  resolveMember,
  resolveUser,
  resolveUserId,
  roleMentionRegex,
  UnknownUser,
} from "./utils";
import { isValidTimezone } from "./utils/isValidTimezone";
import { MessageTarget, resolveMessageTarget } from "./utils/resolveMessageTarget";
import { inputPatternToRegExp } from "./validatorUtils";
import { getChannelId } from "knub/dist/utils";
import { disableCodeBlocks } from "knub/dist/helpers";

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
      throw new TypeConversionError(`User \`${Util.escapeCodeBlock(value)}\` was not found`);
    }
    return result;
  },

  async resolvedUserLoose(value, context: CommandContext<any>) {
    const result = await resolveUser(context.pluginData.client, value);
    if (result == null) {
      throw new TypeConversionError(`Invalid user: \`${Util.escapeCodeBlock(value)}\``);
    }
    return result;
  },

  async resolvedMember(value, context: CommandContext<any>) {
    if (!(context.message.channel instanceof GuildChannel)) {
      throw new TypeConversionError(`Cannot resolve member for non-guild channels`);
    }

    const result = await resolveMember(context.pluginData.client, context.message.channel.guild, value);
    if (result == null) {
      throw new TypeConversionError(
        `Member \`${Util.escapeCodeBlock(value)}\` was not found or they have left the server`,
      );
    }
    return result;
  },

  async messageTarget(value: string, context: CommandContext<any>) {
    value = String(value).trim();

    const result = await resolveMessageTarget(context.pluginData, value);
    if (!result) {
      throw new TypeConversionError(`Unknown message \`${Util.escapeInlineCode(value)}\``);
    }

    return result;
  },

  async anyId(value: string, context: CommandContext<any>) {
    const userId = resolveUserId(context.pluginData.client, value);
    if (userId) return userId as Snowflake;

    const channelIdMatch = value.match(channelMentionRegex);
    if (channelIdMatch) return channelIdMatch[1] as Snowflake;

    const roleIdMatch = value.match(roleMentionRegex);
    if (roleIdMatch) return roleIdMatch[1] as Snowflake;

    if (isValidSnowflake(value)) {
      return value as Snowflake;
    }

    throw new TypeConversionError(`Could not parse ID: \`${Util.escapeInlineCode(value)}\``);
  },

  regex(value: string, context: CommandContext<any>): RegExp {
    try {
      return inputPatternToRegExp(value);
    } catch (e) {
      throw new TypeConversionError(`Could not parse RegExp: \`${Util.escapeInlineCode(e.message)}\``);
    }
  },

  timezone(value: string) {
    if (!isValidTimezone(value)) {
      throw new TypeConversionError(`Invalid timezone: ${Util.escapeInlineCode(value)}`);
    }

    return value;
  },

  guildTextBasedChannel(value: string, context: CommandContext<any>) {
    // FIXME: Remove once Knub's types have been fixed
    return baseTypeConverters.textChannel(value, context) as GuildTextBasedChannel;
  },
};

export const commandTypeHelpers = {
  ...baseCommandParameterTypeHelpers,

  delay: createTypeHelper<number>(commandTypes.delay),
  resolvedUser: createTypeHelper<Promise<User>>(commandTypes.resolvedUser),
  resolvedUserLoose: createTypeHelper<Promise<User | UnknownUser>>(commandTypes.resolvedUserLoose),
  resolvedMember: createTypeHelper<Promise<GuildMember>>(commandTypes.resolvedMember),
  messageTarget: createTypeHelper<Promise<MessageTarget>>(commandTypes.messageTarget),
  anyId: createTypeHelper<Promise<Snowflake>>(commandTypes.anyId),
  regex: createTypeHelper<RegExp>(commandTypes.regex),
  timezone: createTypeHelper<string>(commandTypes.timezone),
  guildTextBasedChannel: createTypeHelper<GuildTextBasedChannel>(commandTypes.guildTextBasedChannel),
};
