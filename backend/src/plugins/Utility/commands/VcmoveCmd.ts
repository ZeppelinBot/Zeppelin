import { ChannelType, Snowflake, VoiceChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { canActOn, resolveMessageMember } from "../../../pluginUtils.js";
import { channelMentionRegex, isSnowflake, renderUsername, simpleClosestStringMatch } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { utilityCmd } from "../types.js";

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
        void pluginData.state.common.sendErrorMessage(msg, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else if (channelMentionRegex.test(args.channel)) {
      // Channel mention -> parse channel id and resolve channel from that
      const channelId = args.channel.match(channelMentionRegex)![1];
      const potentialChannel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        void pluginData.state.common.sendErrorMessage(msg, "Unknown or non-voice channel");
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
        void pluginData.state.common.sendErrorMessage(msg, "No matching voice channels");
        return;
      }

      channel = closestMatch;
    }

    if (!args.member.voice?.channelId) {
      void pluginData.state.common.sendErrorMessage(msg, "Member is not in a voice channel");
      return;
    }

    if (args.member.voice.channelId === channel.id) {
      void pluginData.state.common.sendErrorMessage(msg, "Member is already on that channel!");
      return;
    }

    const oldVoiceChannel = pluginData.guild.channels.cache.get(args.member.voice.channelId) as VoiceChannel;

    try {
      await args.member.edit({
        channel: channel.id,
      });
    } catch {
      void pluginData.state.common.sendErrorMessage(msg, "Failed to move member");
      return;
    }

    pluginData.getPlugin(LogsPlugin).logVoiceChannelForceMove({
      mod: msg.author,
      member: args.member,
      oldChannel: oldVoiceChannel,
      newChannel: channel,
    });

    void pluginData.state.common.sendSuccessMessage(
      msg,
      `**${renderUsername(args.member)}** moved to **${channel.name}**`,
    );
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
        void pluginData.state.common.sendErrorMessage(msg, "Unknown or non-voice channel");
        return;
      }

      channel = potentialChannel;
    } else if (channelMentionRegex.test(args.channel)) {
      // Channel mention -> parse channel id and resolve channel from that
      const channelId = args.channel.match(channelMentionRegex)![1];
      const potentialChannel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof VoiceChannel)) {
        void pluginData.state.common.sendErrorMessage(msg, "Unknown or non-voice channel");
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
        void pluginData.state.common.sendErrorMessage(msg, "No matching voice channels");
        return;
      }

      channel = closestMatch;
    }

    if (args.oldChannel.members.size === 0) {
      void pluginData.state.common.sendErrorMessage(msg, "Voice channel is empty");
      return;
    }

    if (args.oldChannel.id === channel.id) {
      void pluginData.state.common.sendErrorMessage(msg, "Cant move from and to the same channel!");
      return;
    }

    const authorMember = await resolveMessageMember(msg);

    // Cant leave null, otherwise we get an assignment error in the catch
    let currMember = authorMember;
    const moveAmt = args.oldChannel.members.size;
    let errAmt = 0;
    for (const memberWithId of args.oldChannel.members) {
      currMember = memberWithId[1];

      // Check for permissions but allow self-moves
      if (currMember.id !== authorMember.id && !canActOn(pluginData, authorMember, currMember)) {
        void pluginData.state.common.sendErrorMessage(
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
        if (authorMember.id === currMember.id) {
          void pluginData.state.common.sendErrorMessage(msg, "Unknown error when trying to move members");
          return;
        }
        void pluginData.state.common.sendErrorMessage(
          msg,
          `Failed to move ${renderUsername(currMember)} (${currMember.id})`,
        );
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
      void pluginData.state.common.sendSuccessMessage(
        msg,
        `${moveAmt - errAmt} members from **${args.oldChannel.name}** moved to **${channel.name}**`,
      );
    } else {
      void pluginData.state.common.sendErrorMessage(msg, `Failed to move any members.`);
    }
  },
});
