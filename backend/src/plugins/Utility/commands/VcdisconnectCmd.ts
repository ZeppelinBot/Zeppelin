import { VoiceChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn } from "../../../pluginUtils";
import { renderUsername } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
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
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Cannot move: insufficient permissions");
      return;
    }

    if (!args.member.voice?.channelId) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Member is not in a voice channel");
      return;
    }
    const channel = pluginData.guild.channels.cache.get(args.member.voice.channelId) as VoiceChannel;

    try {
      await args.member.voice.disconnect();
    } catch {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Failed to disconnect member");
      return;
    }

    pluginData.getPlugin(LogsPlugin).logVoiceChannelForceDisconnect({
      mod: msg.author,
      member: args.member,
      oldChannel: channel,
    });

    pluginData
      .getPlugin(CommonPlugin)
      .sendSuccessMessage(msg, `**${renderUsername(args.member)}** disconnected from **${channel.name}**`);
  },
});
