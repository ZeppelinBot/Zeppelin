import { GuildTextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "vety";
import { deactivateMentions, disableCodeBlocks } from "vety/helpers";
import { LogType } from "../../../data/LogType.js";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownUser } from "../../../utils.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import {
  channelToTemplateSafeChannel,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogCensorData {
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
      bot: data.user instanceof User ? data.user.bot : false,
      ...resolveChannelIds(data.channel),
    },
  );
}
