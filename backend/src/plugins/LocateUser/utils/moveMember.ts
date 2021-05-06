import { Member, TextableChannel } from "eris";
import { GuildPluginData } from "knub";
import { LocateUserPluginType } from "../types";
import { sendErrorMessage } from "../../../pluginUtils";

export async function moveMember(
  pluginData: GuildPluginData<LocateUserPluginType>,
  toMoveID: string,
  target: Member,
  errorChannel: TextableChannel,
) {
  const modMember: Member = await pluginData.client.getRESTGuildMember(pluginData.guild.id, toMoveID);
  if (modMember.voiceState.channelID != null) {
    try {
      await modMember.edit({
        channelID: target.voiceState.channelID,
      });
    } catch {
      sendErrorMessage(pluginData, errorChannel, "Failed to move you. Are you in a voice channel?");
      return;
    }
  } else {
    sendErrorMessage(pluginData, errorChannel, "Failed to move you. Are you in a voice channel?");
  }
}
