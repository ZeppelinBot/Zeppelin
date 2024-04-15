import { Snowflake } from "discord.js";
import { guildPluginMessageCommand } from "knub";
import { waitForReply } from "knub/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { resolveUser, UnknownUser } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { CountersPluginType } from "../types";

export const ViewCounterCmd = guildPluginMessageCommand<CountersPluginType>()({
  trigger: ["counters view", "counter view", "viewcounter", "counter"],
  permission: "can_view",

  signature: [
    {
      counterName: ct.string(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
    },
    {
      counterName: ct.string(),
      channel: ct.guildTextBasedChannel(),
    },
    {
      counterName: ct.string(),
      channel: ct.guildTextBasedChannel(),
      user: ct.resolvedUser(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
      channel: ct.guildTextBasedChannel(),
    },
  ],

  async run({ pluginData, message, args }) {
    const config = await pluginData.config.getForMessage(message);
    const counter = config.counters[args.counterName];
    const counterId = pluginData.state.counterIds[args.counterName];
    if (!counter || !counterId) {
      void pluginData.state.common.sendErrorMessage(message, `Unknown counter: ${args.counterName}`);
      return;
    }

    if (counter.can_view === false) {
      void pluginData.state.common.sendErrorMessage(message, `Missing permissions to view this counter's value`);
      return;
    }

    if (args.channel && !counter.per_channel) {
      void pluginData.state.common.sendErrorMessage(message, `This counter is not per-channel`);
      return;
    }

    if (args.user && !counter.per_user) {
      void pluginData.state.common.sendErrorMessage(message, `This counter is not per-user`);
      return;
    }

    let channel = args.channel;
    if (!channel && counter.per_channel) {
      message.channel.send(`Which channel's counter value would you like to view?`);
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        void pluginData.state.common.sendErrorMessage(message, "Cancelling");
        return;
      }

      const potentialChannel = pluginData.guild.channels.resolve(reply.content as Snowflake);
      if (!potentialChannel?.isTextBased()) {
        void pluginData.state.common.sendErrorMessage(message, "Channel is not a text channel, cancelling");
        return;
      }

      channel = potentialChannel;
    }

    let user = args.user;
    if (!user && counter.per_user) {
      message.channel.send(`Which user's counter value would you like to view?`);
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        void pluginData.state.common.sendErrorMessage(message, "Cancelling");
        return;
      }

      const potentialUser = await resolveUser(pluginData.client, reply.content);
      if (!potentialUser || potentialUser instanceof UnknownUser) {
        void pluginData.state.common.sendErrorMessage(message, "Unknown user, cancelling");
        return;
      }

      user = potentialUser;
    }

    const value = await pluginData.state.counters.getCurrentValue(counterId, channel?.id ?? null, user?.id ?? null);
    const finalValue = value ?? counter.initial_value;
    const counterName = counter.name || args.counterName;

    if (channel && user) {
      message.channel.send(`**${counterName}** for <@!${user.id}> in <#${channel.id}> is ${finalValue}`);
    } else if (channel) {
      message.channel.send(`**${counterName}** in <#${channel.id}> is ${finalValue}`);
    } else if (user) {
      message.channel.send(`**${counterName}** for <@!${user.id}> is ${finalValue}`);
    } else {
      message.channel.send(`**${counterName}** is ${finalValue}`);
    }
  },
});
