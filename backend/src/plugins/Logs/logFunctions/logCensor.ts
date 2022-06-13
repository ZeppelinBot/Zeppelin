import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildTextChannel, GuildTextBasedChannel, ThreadChannel, User } from "discord.js";
import {
  channelToTemplateSafeChannel,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { UnknownUser } from "../../../utils";
import { deactivateMentions, disableCodeBlocks } from "knub/dist/helpers";

interface LogCensorData {
  user: User | UnknownUser;
  channel: GuildTextBasedChannel;
  reason: string;
  message: SavedMessage;
}

export function logCensor(pluginData: GuildPluginData<LogsPluginType>, data: LogCensorData) {
  return log(
    pluginData,
    LogType.CENSOR,
    createTypedTemplateSafeValueContainer({
      user: userToTemplateSafeUser(data.user),
      channel: channelToTemplateSafeChannel(data.channel),
      reason: data.reason,
      message: savedMessageToTemplateSafeSavedMessage(data.message),
      messageText: disableCodeBlocks(deactivateMentions(data.message.data.content)),
    }),
    {
      userId: data.user.id,
      channel: data.channel.id,
      category: data.channel.parentId,
      bot: data.user instanceof User ? data.user.bot : false,
    },
  );
}
