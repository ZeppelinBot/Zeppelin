import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { isStaffPreFilter, sendErrorMessage } from "../../../pluginUtils.js";
import { botControlCmd } from "../types.js";

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
      sendErrorMessage(pluginData, msg.channel, "Channel not found in cache!");
      return;
    }

    const channelName = channel.isVoiceBased() ? channel.name : `#${"name" in channel ? channel.name : channel.id}`;

    const guild = "guild" in channel ? channel.guild : null;
    const guildInfo = guild ? `${guild.name} (\`${guild.id}\`)` : "Not a server";

    msg.channel.send(`**Channel:** ${channelName} (\`${channel.type}\`) (<#${channel.id}>)\n**Server:** ${guildInfo}`);
  },
});
