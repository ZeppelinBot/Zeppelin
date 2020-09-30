import { StarboardMessage } from "../../../data/entities/StarboardMessage";
import { noop } from "../../../utils";

export async function removeMessageFromStarboard(pluginData, msg: StarboardMessage) {
  await pluginData.client.deleteMessage(msg.starboard_channel_id, msg.starboard_message_id).catch(noop);
}
