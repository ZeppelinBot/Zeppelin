import {
  convertDelayStringToMS,
  deactivateMentions,
  disableCodeBlocks,
  resolveMember,
  resolveUser,
  UnknownUser,
} from "./utils";
import { Client, GuildChannel, Member, Message, User } from "eris";
import { baseTypeHelpers, CommandContext, TypeConversionError } from "knub";
import { createTypeHelper } from "knub-command-manager";

export const customArgumentTypes = {
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
};

export const customArgumentHelpers = {
  delay: createTypeHelper<number>(customArgumentTypes.delay),
  resolvedUser: createTypeHelper<Promise<User>>(customArgumentTypes.resolvedUser),
  resolvedUserLoose: createTypeHelper<Promise<User | UnknownUser>>(customArgumentTypes.resolvedUserLoose),
  resolvedMember: createTypeHelper<Promise<Member | null>>(customArgumentTypes.resolvedMember),
};
