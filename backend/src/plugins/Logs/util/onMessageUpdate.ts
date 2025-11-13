import { EmbedData, GuildTextBasedChannel, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { resolveUser } from "../../../utils.js";
import { logMessageEdit } from "../logFunctions/logMessageEdit.js";
import { LogsPluginType } from "../types.js";

export async function onMessageUpdate(
  pluginData: GuildPluginData<LogsPluginType>,
  savedMessage: SavedMessage,
  oldSavedMessage: SavedMessage,
) {
  // To log a message update, either the message content or a rich embed has to change
  let logUpdate = false;

  const oldEmbedsToCompare = ((oldSavedMessage.data.embeds || []) as EmbedData[])
    .map((e) => structuredClone(e))
    .filter((e) => e.type === "rich");

  const newEmbedsToCompare = ((savedMessage.data.embeds || []) as EmbedData[])
    .map((e) => structuredClone(e))
    .filter((e) => e.type === "rich");

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

  const user = await resolveUser(pluginData.client, savedMessage.user_id, "Logs:onMessageUpdate");
  const channel = pluginData.guild.channels.resolve(savedMessage.channel_id as Snowflake)! as GuildTextBasedChannel;

  logMessageEdit(pluginData, {
    user,
    channel,
    before: oldSavedMessage,
    after: savedMessage,
  });
}
