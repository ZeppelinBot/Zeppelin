import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import {
  channelMentionRegex,
  errorMessage,
  isSnowflake,
  simpleClosestStringMatch,
  stripObjectToScalars,
} from "../../../utils";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { VoiceChannel } from "eris";
import { LogType } from "../../../data/LogType";

export const VcmoveCmd = utilityCmd({
  trigger: "vcmove",
  description: "Move a member to another voice channel",
  usage: "!vcmove @Dragory 473223047822704651",
  permission: "can_vcmove",

  signature: {
    member: ct.resolvedMember(),
    channel: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    let channel: VoiceChannel;

    if (isSnowflake(args.channel)) {
      // Snowflake -> resolve channel directly
      const potentialChannel = pluginData.guild.channels.get(args.channel);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        sendErrorMessage(pluginData, msg.channel, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else if (channelMentionRegex.test(args.channel)) {
      // Channel mention -> parse channel id and resolve channel from that
      const channelId = args.channel.match(channelMentionRegex)![1];
      const potentialChannel = pluginData.guild.channels.get(channelId);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        sendErrorMessage(pluginData, msg.channel, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else {
      // Search string -> find closest matching voice channel name
      const voiceChannels = pluginData.guild.channels.filter(theChannel => {
        return theChannel instanceof VoiceChannel;
      }) as VoiceChannel[];
      const closestMatch = simpleClosestStringMatch(args.channel, voiceChannels, ch => ch.name);
      if (!closestMatch) {
        sendErrorMessage(pluginData, msg.channel, "No matching voice channels");
        return;
      }

      channel = closestMatch;
    }

    if (!args.member.voiceState || !args.member.voiceState.channelID) {
      sendErrorMessage(pluginData, msg.channel, "Member is not in a voice channel");
      return;
    }

    if (args.member.voiceState.channelID === channel.id) {
      sendErrorMessage(pluginData, msg.channel, "Member is already on that channel!");
      return;
    }

    const oldVoiceChannel = pluginData.guild.channels.get(args.member.voiceState.channelID);

    try {
      await args.member.edit({
        channelID: channel.id,
      });
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, "Failed to move member");
      return;
    }

    pluginData.state.logs.log(LogType.VOICE_CHANNEL_FORCE_MOVE, {
      mod: stripObjectToScalars(msg.author),
      member: stripObjectToScalars(args.member, ["user", "roles"]),
      oldChannel: stripObjectToScalars(oldVoiceChannel),
      newChannel: stripObjectToScalars(channel),
    });

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `**${args.member.user.username}#${args.member.user.discriminator}** moved to **${channel.name}**`,
    );
  },
});
