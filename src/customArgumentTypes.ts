import { convertDelayStringToMS, resolveMember, resolveUser, UnknownUser } from "./utils";
import { CommandArgumentTypeError } from "knub";
import { Client, GuildChannel, Message } from "eris";

export const customArgumentTypes = {
  delay(value) {
    const result = convertDelayStringToMS(value);
    if (result == null) {
      throw new CommandArgumentTypeError(`Could not convert ${value} to a delay`);
    }

    return result;
  },

  async resolvedUser(value, msg, bot: Client) {
    const result = resolveUser(bot, value);
    if (result == null || result instanceof UnknownUser) {
      throw new CommandArgumentTypeError(`User \`${value}\` was not found`);
    }
    return result;
  },

  async resolvedUserLoose(value, msg, bot: Client) {
    const result = resolveUser(bot, value);
    if (result == null) {
      throw new CommandArgumentTypeError(`Invalid user: ${value}`);
    }
    return result;
  },

  async resolvedMember(value, msg: Message, bot: Client) {
    if (!(msg.channel instanceof GuildChannel)) return null;

    const result = await resolveMember(bot, msg.channel.guild, value);
    if (result == null) {
      throw new CommandArgumentTypeError(`Member \`${value}\` was not found or they have left the server`);
    }
    return result;
  },
};
