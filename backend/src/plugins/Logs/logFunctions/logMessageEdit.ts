import { GuildTextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "vety";
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

export interface LogMessageEditData {
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
