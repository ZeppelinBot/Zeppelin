import {
  convertDelayStringToMS,
  deactivateMentions,
  disableCodeBlocks,
  resolveMember,
  resolveUser,
  UnknownUser,
} from "./utils";
import { Client, GuildChannel, Message } from "eris";
import { ICommandContext, TypeConversionError } from "knub";

export const customArgumentTypes = {
  delay(value) {
    const result = convertDelayStringToMS(value);
    if (result == null) {
      throw new TypeConversionError(`Could not convert ${value} to a delay`);
    }

    return result;
  },

  async resolvedUser(value, context: ICommandContext) {
    const result = await resolveUser(context.bot, value);
    if (result == null || result instanceof UnknownUser) {
      throw new TypeConversionError(`User \`${disableCodeBlocks(value)}\` was not found`);
    }
    return result;
  },

  async resolvedUserLoose(value, context: ICommandContext) {
    const result = await resolveUser(context.bot, value);
    if (result == null) {
      throw new TypeConversionError(`Invalid user: \`${disableCodeBlocks(value)}\``);
    }
    return result;
  },

  async resolvedMember(value, context: ICommandContext) {
    if (!(context.message.channel instanceof GuildChannel)) return null;

    const result = await resolveMember(context.bot, context.message.channel.guild, value);
    if (result == null) {
      throw new TypeConversionError(
        `Member \`${disableCodeBlocks(value)}\` was not found or they have left the server`,
      );
    }
    return result;
  },
};
