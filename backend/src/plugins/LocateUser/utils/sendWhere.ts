import { GuildMember, Invite, TextChannel, VoiceChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { getInviteLink } from "knub/dist/helpers";
import { sendErrorMessage } from "../../../pluginUtils";
import { LocateUserPluginType } from "../types";
import { createOrReuseInvite } from "./createOrReuseInvite";

export async function sendWhere(
  pluginData: GuildPluginData<LocateUserPluginType>,
  member: GuildMember,
  channel: TextChannel,
  prepend: string,
) {
  const voice = member.voice.channelId
    ? (pluginData.guild.channels.resolve(member.voice.channelId) as VoiceChannel)
    : null;

  if (voice == null) {
    channel.send(prepend + "That user is not in a channel");
  } else {
    let invite: Invite;
    try {
      invite = await createOrReuseInvite(voice);
    } catch {
      sendErrorMessage(pluginData, channel, "Cannot create an invite to that channel!");
      return;
    }
    channel.send({
      content: prepend + `<@${member.id}> is in the following channel: \`${voice.name}\` ${getInviteLink(invite)}`,
      allowedMentions: { parse: ["users"] },
    });
  }
}
