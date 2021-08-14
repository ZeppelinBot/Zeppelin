import { GuildMember, Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { sendErrorMessage } from "../../../pluginUtils";
import { LocateUserPluginType } from "../types";

export async function moveMember(
  pluginData: GuildPluginData<LocateUserPluginType>,
  toMoveID: string,
  target: GuildMember,
  errorChannel: TextChannel,
) {
  const modMember: GuildMember = await pluginData.guild.members.fetch(toMoveID as Snowflake);
  if (modMember.voice.channelId != null) {
    try {
      await modMember.edit({
        channel: target.voice.channelId,
      });
    } catch {
      sendErrorMessage(pluginData, errorChannel, "Failed to move you. Are you in a voice channel?");
      return;
    }
  } else {
    sendErrorMessage(pluginData, errorChannel, "Failed to move you. Are you in a voice channel?");
  }
}
