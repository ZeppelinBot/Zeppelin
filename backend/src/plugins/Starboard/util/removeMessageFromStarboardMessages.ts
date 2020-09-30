import { GuildPluginData } from "knub";
import { StarboardPluginType } from "../types";

export async function removeMessageFromStarboardMessages(
  pluginData: GuildPluginData<StarboardPluginType>,
  starboard_message_id: string,
  channel_id: string,
) {
  await pluginData.state.starboardMessages.deleteStarboardMessage(starboard_message_id, channel_id);
}
