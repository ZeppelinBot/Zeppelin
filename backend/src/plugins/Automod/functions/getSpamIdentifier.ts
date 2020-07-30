import { SavedMessage } from "../../../data/entities/SavedMessage";

export function getMessageSpamIdentifier(message: SavedMessage, perChannel: boolean) {
  return perChannel ? `${message.channel_id}-${message.user_id}` : message.user_id;
}
