import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import {
  channelMentionRegex,
  errorMessage,
  isSnowflake,
  simpleClosestStringMatch,
  stripObjectToScalars,
} from "../../../utils";
import { canActOn, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { VoiceChannel } from "eris";
import { LogType } from "../../../data/LogType";
import { resolveChannel } from "knub/dist/helpers";

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

    if (!args.member.voiceState || !args.member.voiceState.channelID) {
      sendErrorMessage(pluginData, msg.channel, "Member is not in a voice channel");
      return;
    }
    const channel = (await resolveChannel(pluginData.guild, args.member.voiceState.channelID)) as VoiceChannel;

    try {
      await args.member.edit({
        channelID: null,
      });
    } catch {
      sendErrorMessage(pluginData, msg.channel, "Failed to disconnect member");
      return;
    }

    pluginData.state.logs.log(LogType.VOICE_CHANNEL_FORCE_DISCONNECT, {
      mod: stripObjectToScalars(msg.author),
      member: stripObjectToScalars(args.member, ["user", "roles"]),
      oldChannel: stripObjectToScalars(channel),
    });

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `**${args.member.user.username}#${args.member.user.discriminator}** disconnected from **${channel.name}**`,
    );
  },
});
