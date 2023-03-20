import { VoiceChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { utilityCmd } from "../types";

export const VcdisconnectCmd = utilityCmd({
  trigger: ["vcdisconnect", "vcdisc", "vcdc", "vckick", "vck"],
  description: "Disconnect a member from their voice channel",
  usage: "!vcdc @Dark",
  permission: "can_vckick",

  signature: {
    member: ct.resolvedMember(),
  },

  async run({ message: msg, args, pluginData }) {
    if (!canActOn(pluginData, msg.member, args.member)) {
      sendErrorMessage(pluginData, msg.channel, "Cannot move: insufficient permissions");
      return;
    }

    if (!args.member.voice?.channelId) {
      sendErrorMessage(pluginData, msg.channel, "Member is not in a voice channel");
      return;
    }
    const channel = pluginData.guild.channels.cache.get(args.member.voice.channelId) as VoiceChannel;

    try {
      await args.member.voice.disconnect();
    } catch {
      sendErrorMessage(pluginData, msg.channel, "Failed to disconnect member");
      return;
    }

    pluginData.getPlugin(LogsPlugin).logVoiceChannelForceDisconnect({
      mod: msg.author,
      member: args.member,
      oldChannel: channel,
    });

    sendSuccessMessage(pluginData, msg.channel, `**${args.member.user.tag}** disconnected from **${channel.name}**`);
  },
});
