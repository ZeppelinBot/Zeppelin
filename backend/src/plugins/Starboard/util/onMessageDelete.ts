import { SavedMessage } from "src/data/entities/SavedMessage";
import { PluginData } from "knub";
import { StarboardPluginType } from "../types";
import { removeMessageFromStarboard } from "./removeMessageFromStarboard";
import { removeMessageFromStarboardMessages } from "./removeMessageFromStarboardMessages";

export async function onMessageDelete(pluginData: PluginData<StarboardPluginType>, msg: SavedMessage) {
  // Deleted source message
  const starboardMessages = await pluginData.state.starboardMessages.getStarboardMessagesForMessageId(msg.id);
  for (const starboardMessage of starboardMessages) {
    removeMessageFromStarboard(pluginData, starboardMessage);
  }

  // Deleted message from the starboard
  const deletedStarboardMessages = await pluginData.state.starboardMessages.getStarboardMessagesForStarboardMessageId(
    msg.id,
  );
  if (deletedStarboardMessages.length === 0) return;

  for (const starboardMessage of deletedStarboardMessages) {
    removeMessageFromStarboardMessages(
      pluginData,
      starboardMessage.starboard_message_id,
      starboardMessage.starboard_channel_id,
    );
  }
}
