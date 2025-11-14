import { GuildMember, GuildTextBasedChannel, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { LocateUserPluginType } from "../types.js";

export async function moveMember(
  pluginData: GuildPluginData<LocateUserPluginType>,
  toMoveID: string,
  target: GuildMember,
  errorChannel: GuildTextBasedChannel,
) {
  const modMember: GuildMember = await pluginData.guild.members.fetch(toMoveID as Snowflake);
  if (modMember.voice.channelId != null) {
    try {
      await modMember.edit({
        channel: target.voice.channelId,
      });
    } catch {
      void pluginData.state.common.sendErrorMessage(errorChannel, "Failed to move you. Are you in a voice channel?");
      return;
    }
  } else {
    void pluginData.state.common.sendErrorMessage(errorChannel, "Failed to move you. Are you in a voice channel?");
  }
}
