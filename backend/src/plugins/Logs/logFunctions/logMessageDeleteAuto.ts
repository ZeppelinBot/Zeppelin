import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildTextChannel, User } from "discord.js";
import {
  channelToTemplateSafeChannel,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { UnknownUser } from "../../../utils";

interface LogMessageDeleteAutoData {
  message: SavedMessage;
  user: User | UnknownUser;
  channel: BaseGuildTextChannel;
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
      bot: data.user.bot,
      channel: data.channel.id,
      category: data.channel.parentId,
    },
  );
}
