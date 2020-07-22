import { Member, TextableChannel } from "eris";
import { PluginData } from "knub";
import { LocateUserPluginType } from "../types";
import { sendErrorMessage } from "src/pluginUtils";

export async function moveMember(
  pluginData: PluginData<LocateUserPluginType>,
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
    } catch (e) {
      sendErrorMessage(pluginData, errorChannel, "Failed to move you. Are you in a voice channel?");
      return;
    }
  } else {
    sendErrorMessage(pluginData, errorChannel, "Failed to move you. Are you in a voice channel?");
  }
}
