import { convertDelayStringToMS, disableCodeBlocks, resolveMember, resolveUser, UnknownUser } from "./utils";
import { GuildChannel, Member, User } from "eris";
import { baseTypeConverters, baseTypeHelpers, CommandContext, TypeConversionError } from "knub";
import { createTypeHelper } from "knub-command-manager";

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
};

export const commandTypeHelpers = {
  ...baseTypeHelpers,

  delay: createTypeHelper<number>(commandTypes.delay),
  resolvedUser: createTypeHelper<Promise<User>>(commandTypes.resolvedUser),
  resolvedUserLoose: createTypeHelper<Promise<User | UnknownUser>>(commandTypes.resolvedUserLoose),
  resolvedMember: createTypeHelper<Promise<Member | null>>(commandTypes.resolvedMember),
};
