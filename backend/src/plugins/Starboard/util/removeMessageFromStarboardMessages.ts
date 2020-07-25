export async function removeMessageFromStarboardMessages(pluginData, starboard_message_id: string, channel_id: string) {
  await pluginData.state.starboardMessages.deleteStarboardMessage(starboard_message_id, channel_id);
}
