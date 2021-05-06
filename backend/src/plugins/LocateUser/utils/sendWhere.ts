import { Invite, Member, TextableChannel, VoiceChannel } from "eris";
import { getInviteLink } from "knub/dist/helpers";
import { createOrReuseInvite } from "./createOrReuseInvite";
import { GuildPluginData } from "knub";
import { LocateUserPluginType } from "../types";
import { sendErrorMessage } from "../../../pluginUtils";

export async function sendWhere(
  pluginData: GuildPluginData<LocateUserPluginType>,
  member: Member,
  channel: TextableChannel,
  prepend: string,
) {
  const voice = member.voiceState.channelID
    ? (pluginData.guild.channels.get(member.voiceState.channelID) as VoiceChannel)
    : null;

  if (voice == null) {
    channel.createMessage(prepend + "That user is not in a channel");
  } else {
    let invite: Invite;
    try {
      invite = await createOrReuseInvite(voice);
    } catch {
      sendErrorMessage(pluginData, channel, "Cannot create an invite to that channel!");
      return;
    }
    channel.createMessage({
      content: prepend + `${member.mention} is in the following channel: \`${voice.name}\` ${getInviteLink(invite)}`,
      allowedMentions: { users: true },
    });
  }
}
