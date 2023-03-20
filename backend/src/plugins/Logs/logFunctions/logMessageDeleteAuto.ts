import { GuildBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser } from "../../../utils";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import {
  channelToTemplateSafeChannel,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMessageDeleteAutoData {
  message: SavedMessage;
  user: User | UnknownUser;
  channel: GuildBasedChannel;
  messageDate: string;
}

export function logMessageDeleteAuto(pluginData: GuildPluginData<LogsPluginType>, data: LogMessageDeleteAutoData) {
  return log(
    pluginData,
    LogType.MESSAGE_DELETE_AUTO,
    createTypedTemplateSafeValueContainer({
      message: savedMessageToTemplateSafeSavedMessage(data.message),
      user: userToTemplateSafeUser(data.user),
      channel: channelToTemplateSafeChannel(data.channel),
      messageDate: data.messageDate,
    }),
    {
      userId: data.user.id,
      bot: data.user instanceof User ? data.user.bot : false,
      ...resolveChannelIds(data.channel),
    },
  );
}
