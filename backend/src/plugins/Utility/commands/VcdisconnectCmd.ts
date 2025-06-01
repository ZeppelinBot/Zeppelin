import { VoiceChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { canActOn, resolveMessageMember } from "../../../pluginUtils.js";
import { renderUsername } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { utilityCmd } from "../types.js";

export const VcdisconnectCmd = utilityCmd({
  trigger: ["vcdisconnect", "vcdisc", "vcdc", "vckick", "vck"],
  description: "Disconnect a member from their voice channel",
  usage: "!vcdc @Dark",
  permission: "can_vckick",

  signature: {
    member: ct.resolvedMember(),
  },

  async run({ message: msg, args, pluginData }) {
    const authorMember = await resolveMessageMember(msg);
    if (!canActOn(pluginData, authorMember, args.member)) {
      void pluginData.state.common.sendErrorMessage(msg, "Cannot move: insufficient permissions");
      return;
    }

    if (!args.member.voice?.channelId) {
      void pluginData.state.common.sendErrorMessage(msg, "Member is not in a voice channel");
      return;
    }
    const channel = pluginData.guild.channels.cache.get(args.member.voice.channelId) as VoiceChannel;

    try {
      await args.member.voice.disconnect();
    } catch {
      void pluginData.state.common.sendErrorMessage(msg, "Failed to disconnect member");
      return;
    }

    pluginData.getPlugin(LogsPlugin).logVoiceChannelForceDisconnect({
      mod: msg.author,
      member: args.member,
      oldChannel: channel,
    });

    pluginData.state.common.sendSuccessMessage(
      msg,
      `**${renderUsername(args.member)}** disconnected from **${channel.name}**`,
    );
  },
});
