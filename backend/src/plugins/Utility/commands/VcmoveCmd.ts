import { Snowflake, VoiceChannel } from "discord.js";
import {
  channelToTemplateSafeChannel,
  memberToTemplateSafeMember,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { LogType } from "../../../data/LogType";
import { canActOn, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { channelMentionRegex, isSnowflake, simpleClosestStringMatch } from "../../../utils";
import { utilityCmd } from "../types";
import { ChannelTypeStrings } from "../../../types";
import { LogsPlugin } from "../../Logs/LogsPlugin";

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
      const potentialChannel = pluginData.guild.channels.cache.get(args.channel as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        sendErrorMessage(pluginData, msg.channel, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else if (channelMentionRegex.test(args.channel)) {
      // Channel mention -> parse channel id and resolve channel from that
      const channelId = args.channel.match(channelMentionRegex)![1];
      const potentialChannel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        sendErrorMessage(pluginData, msg.channel, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else {
      // Search string -> find closest matching voice channel name
      const voiceChannels = [...pluginData.guild.channels.cache.values()].filter(
        (c): c is VoiceChannel => c.type === ChannelTypeStrings.VOICE,
      );
      const closestMatch = simpleClosestStringMatch(args.channel, voiceChannels, ch => ch.name);
      if (!closestMatch) {
        sendErrorMessage(pluginData, msg.channel, "No matching voice channels");
        return;
      }

      channel = closestMatch;
    }

    if (!args.member.voice?.channelId) {
      sendErrorMessage(pluginData, msg.channel, "Member is not in a voice channel");
      return;
    }

    if (args.member.voice.channelId === channel.id) {
      sendErrorMessage(pluginData, msg.channel, "Member is already on that channel!");
      return;
    }

    const oldVoiceChannel = pluginData.guild.channels.cache.get(args.member.voice.channelId);

    try {
      await args.member.edit({
        channel: channel.id,
      });
    } catch {
      sendErrorMessage(pluginData, msg.channel, "Failed to move member");
      return;
    }

    pluginData.getPlugin(LogsPlugin).logVoiceChannelForceMove({
      mod: msg.author,
      member: args.member,
      oldChannel: oldVoiceChannel!,
      newChannel: channel,
    });

    sendSuccessMessage(pluginData, msg.channel, `**${args.member.user.tag}** moved to **${channel.name}**`);
  },
});

export const VcmoveAllCmd = utilityCmd({
  trigger: "vcmoveall",
  description: "Move all members of a voice channel to another voice channel",
  usage: "!vcmoveall 551767166395875334 767497573560352798",
  permission: "can_vcmove",

  signature: {
    oldChannel: ct.voiceChannel(),
    channel: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    let channel: VoiceChannel;

    if (isSnowflake(args.channel)) {
      // Snowflake -> resolve channel directly
      const potentialChannel = pluginData.guild.channels.cache.get(args.channel as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        sendErrorMessage(pluginData, msg.channel, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else if (channelMentionRegex.test(args.channel)) {
      // Channel mention -> parse channel id and resolve channel from that
      const channelId = args.channel.match(channelMentionRegex)![1];
      const potentialChannel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        sendErrorMessage(pluginData, msg.channel, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else {
      // Search string -> find closest matching voice channel name
      const voiceChannels = [...pluginData.guild.channels.cache.values()].filter(
        (c): c is VoiceChannel => c.type === ChannelTypeStrings.VOICE,
      );
      const closestMatch = simpleClosestStringMatch(args.channel, voiceChannels, ch => ch.name);
      if (!closestMatch) {
        sendErrorMessage(pluginData, msg.channel, "No matching voice channels");
        return;
      }

      channel = closestMatch;
    }

    if (args.oldChannel.members.size === 0) {
      sendErrorMessage(pluginData, msg.channel, "Voice channel is empty");
      return;
    }

    if (args.oldChannel.id === channel.id) {
      sendErrorMessage(pluginData, msg.channel, "Cant move from and to the same channel!");
      return;
    }

    // Cant leave null, otherwise we get an assignment error in the catch
    let currMember = msg.member;
    const moveAmt = args.oldChannel.members.size;
    let errAmt = 0;
    for (const memberWithId of args.oldChannel.members) {
      currMember = memberWithId[1];

      // Check for permissions but allow self-moves
      if (currMember.id !== msg.member.id && !canActOn(pluginData, msg.member, currMember)) {
        sendErrorMessage(
          pluginData,
          msg.channel,
          `Failed to move ${currMember.user.tag} (${currMember.id}): You cannot act on this member`,
        );
        errAmt++;
        continue;
      }

      try {
        currMember.edit({
          channel: channel.id,
        });
      } catch {
        if (msg.member.id === currMember.id) {
          sendErrorMessage(pluginData, msg.channel, "Unknown error when trying to move members");
          return;
        }
        sendErrorMessage(pluginData, msg.channel, `Failed to move ${currMember.user.tag} (${currMember.id})`);
        errAmt++;
        continue;
      }

      pluginData.getPlugin(LogsPlugin).logVoiceChannelForceMove({
        mod: msg.author,
        member: currMember,
        oldChannel: args.oldChannel,
        newChannel: channel,
      });
    }

    if (moveAmt !== errAmt) {
      sendSuccessMessage(
        pluginData,
        msg.channel,
        `${moveAmt - errAmt} members from **${args.oldChannel.name}** moved to **${channel.name}**`,
      );
    } else {
      sendErrorMessage(pluginData, msg.channel, `Failed to move any members.`);
    }
  },
});
