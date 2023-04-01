import { GuildTextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { deactivateMentions, disableCodeBlocks } from "knub/helpers";
import { resolveChannelIds } from "src/utils/resolveChannelIds";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser } from "../../../utils";
import {
  channelToTemplateSafeChannel,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
      bot: data.user instanceof User ? data.user.bot : false,
      ...resolveChannelIds(data.channel),
    },
  );
}
