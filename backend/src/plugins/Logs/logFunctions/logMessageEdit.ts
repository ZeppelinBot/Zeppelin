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

interface LogMessageEditData {
  user: User | UnknownUser;
  channel: GuildTextBasedChannel;
  before: SavedMessage;
  after: SavedMessage;
}

export function logMessageEdit(pluginData: GuildPluginData<LogsPluginType>, data: LogMessageEditData) {
  return log(
    pluginData,
    LogType.MESSAGE_EDIT,
    createTypedTemplateSafeValueContainer({
      user: userToTemplateSafeUser(data.user),
      channel: channelToTemplateSafeChannel(data.channel),
      before: savedMessageToTemplateSafeSavedMessage(data.before),
      after: savedMessageToTemplateSafeSavedMessage(data.after),
    }),
    {
      userId: data.user.id,
      channel: data.channel.id,
      messageTextContent: data.after.data.content,
      bot: data.user instanceof User ? data.user.bot : false,
    },
  );
}
