import { SavedMessage } from "../../../data/entities/SavedMessage.js";

export function getMessageSpamIdentifier(message: SavedMessage, perChannel: boolean) {
  return perChannel ? `${message.channel_id}-${message.user_id}` : message.user_id;
}
