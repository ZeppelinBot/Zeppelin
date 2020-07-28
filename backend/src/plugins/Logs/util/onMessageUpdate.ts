import { PluginData } from "knub";
import { LogsPluginType } from "../types";
import { SavedMessage } from "src/data/entities/SavedMessage";
import { Embed } from "eris";
import { LogType } from "src/data/LogType";
import { stripObjectToScalars, resolveUser } from "src/utils";
import cloneDeep from "lodash.clonedeep";

export async function onMessageUpdate(
  pluginData: PluginData<LogsPluginType>,
  savedMessage: SavedMessage,
  oldSavedMessage: SavedMessage,
) {
  // To log a message update, either the message content or a rich embed has to change
  let logUpdate = false;

  const oldEmbedsToCompare = ((oldSavedMessage.data.embeds || []) as Embed[])
    .map(e => cloneDeep(e))
    .filter(e => (e as Embed).type === "rich");

  const newEmbedsToCompare = ((savedMessage.data.embeds || []) as Embed[])
    .map(e => cloneDeep(e))
    .filter(e => (e as Embed).type === "rich");

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
  const channel = pluginData.guild.channels.get(savedMessage.channel_id);

  pluginData.state.guildLogs.log(LogType.MESSAGE_EDIT, {
    user: stripObjectToScalars(user),
    channel: stripObjectToScalars(channel),
    before: oldSavedMessage,
    after: savedMessage,
  });
}
