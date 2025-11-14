import { GuildPluginData } from "vety";
import { StarboardPluginType } from "../types.js";

export async function removeMessageFromStarboardMessages(
  pluginData: GuildPluginData<StarboardPluginType>,
  starboard_message_id: string,
  channel_id: string,
) {
  await pluginData.state.starboardMessages.deleteStarboardMessage(starboard_message_id, channel_id);
}
