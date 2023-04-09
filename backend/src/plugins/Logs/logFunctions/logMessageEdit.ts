import { GuildTextBasedChannel, User } from "discord.js";
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
      messageTextContent: data.after.data.content,
      bot: data.user instanceof User ? data.user.bot : false,
      ...resolveChannelIds(data.channel),
    },
  );
}
