import { ChannelType, Snowflake, VoiceChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn } from "../../../pluginUtils";
import { channelMentionRegex, isSnowflake, renderUsername, simpleClosestStringMatch } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { utilityCmd } from "../types";

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
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else if (channelMentionRegex.test(args.channel)) {
      // Channel mention -> parse channel id and resolve channel from that
      const channelId = args.channel.match(channelMentionRegex)![1];
      const potentialChannel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else {
      // Search string -> find closest matching voice channel name
      const voiceChannels = [...pluginData.guild.channels.cache.values()].filter(
        (c): c is VoiceChannel => c.type === ChannelType.GuildVoice,
      );
      const closestMatch = simpleClosestStringMatch(args.channel, voiceChannels, (ch) => ch.name);
      if (!closestMatch) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "No matching voice channels");
        return;
      }

      channel = closestMatch;
    }

    if (!args.member.voice?.channelId) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Member is not in a voice channel");
      return;
    }

    if (args.member.voice.channelId === channel.id) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Member is already on that channel!");
      return;
    }

    const oldVoiceChannel = pluginData.guild.channels.cache.get(args.member.voice.channelId) as VoiceChannel;

    try {
      await args.member.edit({
        channel: channel.id,
      });
    } catch {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Failed to move member");
      return;
    }

    pluginData.getPlugin(LogsPlugin).logVoiceChannelForceMove({
      mod: msg.author,
      member: args.member,
      oldChannel: oldVoiceChannel,
      newChannel: channel,
    });

    pluginData
      .getPlugin(CommonPlugin)
      .sendSuccessMessage(msg, `**${renderUsername(args.member)}** moved to **${channel.name}**`);
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
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else if (channelMentionRegex.test(args.channel)) {
      // Channel mention -> parse channel id and resolve channel from that
      const channelId = args.channel.match(channelMentionRegex)![1];
      const potentialChannel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else {
      // Search string -> find closest matching voice channel name
      const voiceChannels = [...pluginData.guild.channels.cache.values()].filter(
        (c): c is VoiceChannel => c.type === ChannelType.GuildVoice,
      );
      const closestMatch = simpleClosestStringMatch(args.channel, voiceChannels, (ch) => ch.name);
      if (!closestMatch) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "No matching voice channels");
        return;
      }

      channel = closestMatch;
    }

    if (args.oldChannel.members.size === 0) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Voice channel is empty");
      return;
    }

    if (args.oldChannel.id === channel.id) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Cant move from and to the same channel!");
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
        pluginData
          .getPlugin(CommonPlugin)
          .sendErrorMessage(
            msg,
            `Failed to move ${renderUsername(currMember)} (${currMember.id}): You cannot act on this member`,
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
          pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Unknown error when trying to move members");
          return;
        }
        pluginData
          .getPlugin(CommonPlugin)
          .sendErrorMessage(msg, `Failed to move ${renderUsername(currMember)} (${currMember.id})`);
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
      pluginData
        .getPlugin(CommonPlugin)
        .sendSuccessMessage(
          msg,
          `${moveAmt - errAmt} members from **${args.oldChannel.name}** moved to **${channel.name}**`,
        );
    } else {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, `Failed to move any members.`);
    }
  },
});
