import { Guild, GuildChannel, TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isStaffPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { GuildInvite, isGuildInvite, resolveInvite, verboseUserMention } from "../../../utils";
import { botControlCmd } from "../types";
import { isEligible } from "../functions/isEligible";

export const ChannelToServerCmd = botControlCmd({
  trigger: ["channel_to_server", "channel2server"],
  permission: null,
  config: {
    preFilters: [isStaffPreFilter],
  },

  signature: {
    channelId: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    const channel = pluginData.client.channels.cache.get(args.channelId);
    if (!channel) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Channel not found in cache!");
      return;
    }

    const channelName = channel.isVoice() ? channel.name : `#${(channel as TextChannel).name}`;

    const guild: Guild | null = (channel as GuildChannel).guild ?? null;
    const guildInfo = guild ? `${guild.name} (\`${guild.id}\`)` : "Not a server";

    msg.channel.send(`**Channel:** ${channelName} (\`${channel.type}\`) (<#${channel.id}>)\n**Server:** ${guildInfo}`);
  },
});
