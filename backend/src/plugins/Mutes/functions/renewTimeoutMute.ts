import { PermissionFlagsBits } from "discord.js";
import { GuildPluginData } from "vety";
import moment from "moment-timezone";
import { MAX_TIMEOUT_DURATION } from "../../../data/Mutes.js";
import { Mute } from "../../../data/entities/Mute.js";
import { DBDateFormat, noop, resolveMember } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { MutesPluginType } from "../types.js";

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
  if (!member.moderatable) {
    pluginData.getPlugin(LogsPlugin).logBotAlert({
      body: `Cannot renew user's timeout, specified user is not moderatable`,
    });
    return;
  }

  await member.disableCommunicationUntil(expiryTimestamp).catch(noop);
  await pluginData.state.mutes.updateTimeoutExpiresAt(mute.user_id, expiryTimestamp);
}
