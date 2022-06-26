import { BaseGuildTextChannel, GuildTextBasedChannel, MessageEmbed, Snowflake, ThreadChannel } from "discord.js";
import { GuildPluginData } from "knub";
import cloneDeep from "lodash.clonedeep";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { resolveUser } from "../../../utils";
import { LogsPluginType } from "../types";
import { logMessageEdit } from "../logFunctions/logMessageEdit";

export async function onMessageUpdate(
  pluginData: GuildPluginData<LogsPluginType>,
  savedMessage: SavedMessage,
  oldSavedMessage: SavedMessage,
) {
  // To log a message update, either the message content or a rich embed has to change
  let logUpdate = false;

  const oldEmbedsToCompare = ((oldSavedMessage.data.embeds || []) as MessageEmbed[])
    .map((e) => cloneDeep(e))
    .filter((e) => (e as MessageEmbed).type === "rich");

  const newEmbedsToCompare = ((savedMessage.data.embeds || []) as MessageEmbed[])
    .map((e) => cloneDeep(e))
    .filter((e) => (e as MessageEmbed).type === "rich");

  for (const embed of [...oldEmbedsToCompare, ...newEmbedsToCompare]) {
    if (embed.thumbnail) {
      delete embed.thumbnail.width;
      delete embed.thumbnail.height;
    }

    if (embed.image) {
      delete embed.image.width;
      delete embed.image.height;
    }
  }

  if (
    oldSavedMessage.data.content !== savedMessage.data.content ||
    oldEmbedsToCompare.length !== newEmbedsToCompare.length ||
    JSON.stringify(oldEmbedsToCompare) !== JSON.stringify(newEmbedsToCompare)
  ) {
    logUpdate = true;
  }

  if (!logUpdate) {
    return;
  }

  const user = await resolveUser(pluginData.client, savedMessage.user_id);
  const channel = pluginData.guild.channels.resolve(savedMessage.channel_id as Snowflake)! as GuildTextBasedChannel;

  logMessageEdit(pluginData, {
    user,
    channel,
    before: oldSavedMessage,
    after: savedMessage,
  });
}
