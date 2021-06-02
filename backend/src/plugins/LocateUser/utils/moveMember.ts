import { GuildPluginData } from "knub";
import { LocateUserPluginType } from "../types";
import { sendErrorMessage } from "../../../pluginUtils";
import { GuildMember, TextChannel } from "discord.js";

export async function moveMember(
  pluginData: GuildPluginData<LocateUserPluginType>,
  toMoveID: string,
  target: GuildMember,
  errorChannel: TextChannel,
) {
  const modMember: GuildMember = await pluginData.guild.members.fetch(toMoveID);
  if (modMember.voice.channelID != null) {
    try {
      await modMember.edit({
        channel: target.voice.channelID,
      });
    } catch {
      sendErrorMessage(pluginData, errorChannel, "Failed to move you. Are you in a voice channel?");
      return;
    }
  } else {
    sendErrorMessage(pluginData, errorChannel, "Failed to move you. Are you in a voice channel?");
  }
}
