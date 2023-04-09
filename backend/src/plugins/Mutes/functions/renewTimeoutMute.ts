import { PermissionFlagsBits } from "discord.js";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { Mute } from "../../../data/entities/Mute";
import { MAX_TIMEOUT_DURATION } from "../../../data/Mutes";
import { DBDateFormat, resolveMember } from "../../../utils";
import { MutesPluginType } from "../types";

export async function renewTimeoutMute(pluginData: GuildPluginData<MutesPluginType>, mute: Mute) {
  const me =
    pluginData.client.user && (await resolveMember(pluginData.client, pluginData.guild, pluginData.client.user.id));
  if (!me || !me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return;
  }

  const member = await resolveMember(pluginData.client, pluginData.guild, mute.user_id, true);
  if (!member) {
    return;
  }

  let newExpiryTime = moment.utc().add(MAX_TIMEOUT_DURATION).format(DBDateFormat);
  if (mute.expires_at && newExpiryTime > mute.expires_at) {
    newExpiryTime = mute.expires_at;
  }

  const expiryTimestamp = moment.utc(newExpiryTime).valueOf();
  await member.disableCommunicationUntil(expiryTimestamp);
  await pluginData.state.mutes.updateTimeoutExpiresAt(mute.user_id, expiryTimestamp);
}
