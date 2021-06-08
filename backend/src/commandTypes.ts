import { GuildChannel, GuildMember, User } from "discord.js";
import { baseCommandParameterTypeHelpers, baseTypeConverters, CommandContext, TypeConversionError } from "knub";
import { createTypeHelper } from "knub-command-manager";
import {
  channelMentionRegex,
  convertDelayStringToMS,
  disableCodeBlocks,
  disableInlineCode,
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
    if (!(context.message.channel instanceof GuildChannel)) {
      throw new TypeConversionError(`Cannot resolve member for non-guild channels`);
    }

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

    const result = await resolveMessageTarget(context.pluginData, value);
    if (!result) {
      throw new TypeConversionError(`Unknown message \`${disableInlineCode(value)}\``);
    }

    return result;
  },

  async anyId(value: string, context: CommandContext<any>) {
    const userId = resolveUserId(context.pluginData.client, value);
    if (userId) return userId;

    const channelIdMatch = value.match(channelMentionRegex);
    if (channelIdMatch) return channelIdMatch[1];

    const roleIdMatch = value.match(roleMentionRegex);
    if (roleIdMatch) return roleIdMatch[1];

    if (isValidSnowflake(value)) {
      return value;
    }

    throw new TypeConversionError(`Could not parse ID: \`${disableInlineCode(value)}\``);
  },

  regex(value: string, context: CommandContext<any>): RegExp {
    try {
      return inputPatternToRegExp(value);
    } catch (e) {
      throw new TypeConversionError(`Could not parse RegExp: \`${disableInlineCode(e.message)}\``);
    }
  },

  timezone(value: string) {
    if (!isValidTimezone(value)) {
      throw new TypeConversionError(`Invalid timezone: ${disableInlineCode(value)}`);
    }

    return value;
  },
};

export const commandTypeHelpers = {
  ...baseCommandParameterTypeHelpers,

  delay: createTypeHelper<number>(commandTypes.delay),
  resolvedUser: createTypeHelper<Promise<User>>(commandTypes.resolvedUser),
  resolvedUserLoose: createTypeHelper<Promise<User | UnknownUser>>(commandTypes.resolvedUserLoose),
  resolvedMember: createTypeHelper<Promise<GuildMember>>(commandTypes.resolvedMember),
  messageTarget: createTypeHelper<Promise<MessageTarget>>(commandTypes.messageTarget),
  anyId: createTypeHelper<Promise<string>>(commandTypes.anyId),
  regex: createTypeHelper<RegExp>(commandTypes.regex),
  timezone: createTypeHelper<string>(commandTypes.timezone),
};
