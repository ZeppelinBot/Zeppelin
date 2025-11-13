import { Snowflake, TextChannel } from "discord.js";
import { guildPluginMessageCommand } from "vety";
import { waitForReply } from "vety/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { UnknownUser, resolveUser } from "../../../utils.js";
import { setCounterValue } from "../functions/setCounterValue.js";
import { CountersPluginType } from "../types.js";

export const SetCounterCmd = guildPluginMessageCommand<CountersPluginType>()({
  trigger: ["counters set", "counter set", "setcounter"],
  permission: "can_edit",

  signature: [
    {
      counterName: ct.string(),
      value: ct.number(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
      value: ct.number(),
    },
    {
      counterName: ct.string(),
      channel: ct.textChannel(),
      value: ct.number(),
    },
    {
      counterName: ct.string(),
      channel: ct.textChannel(),
      user: ct.resolvedUser(),
      value: ct.number(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
      channel: ct.textChannel(),
      value: ct.number(),
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

    if (counter.can_edit === false) {
      void pluginData.state.common.sendErrorMessage(message, `Missing permissions to edit this counter's value`);
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
      message.channel.send(`Which channel's counter value would you like to change?`);
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        void pluginData.state.common.sendErrorMessage(message, "Cancelling");
        return;
      }

      const potentialChannel = pluginData.guild.channels.resolve(reply.content as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof TextChannel)) {
        void pluginData.state.common.sendErrorMessage(message, "Channel is not a text channel, cancelling");
        return;
      }

      channel = potentialChannel;
    }

    let user = args.user;
    if (!user && counter.per_user) {
      message.channel.send(`Which user's counter value would you like to change?`);
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        void pluginData.state.common.sendErrorMessage(message, "Cancelling");
        return;
      }

      const potentialUser = await resolveUser(pluginData.client, reply.content, "Counters:SetCounterCmd");
      if (!potentialUser || potentialUser instanceof UnknownUser) {
        void pluginData.state.common.sendErrorMessage(message, "Unknown user, cancelling");
        return;
      }

      user = potentialUser;
    }

    let value = args.value;
    if (!value) {
      message.channel.send("What would you like to set the counter's value to?");
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        void pluginData.state.common.sendErrorMessage(message, "Cancelling");
        return;
      }

      const potentialValue = parseInt(reply.content, 10);
      if (Number.isNaN(potentialValue)) {
        void pluginData.state.common.sendErrorMessage(message, "Not a number, cancelling");
        return;
      }

      value = potentialValue;
    }

    if (value < 0) {
      void pluginData.state.common.sendErrorMessage(message, "Cannot set counter value below 0");
      return;
    }

    await setCounterValue(pluginData, args.counterName, channel?.id ?? null, user?.id ?? null, value);

    if (channel && user) {
      message.channel.send(`Set **${args.counterName}** for <@!${user.id}> in <#${channel.id}> to ${value}`);
    } else if (channel) {
      message.channel.send(`Set **${args.counterName}** in <#${channel.id}> to ${value}`);
    } else if (user) {
      message.channel.send(`Set **${args.counterName}** for <@!${user.id}> to ${value}`);
    } else {
      message.channel.send(`Set **${args.counterName}** to ${value}`);
    }
  },
});
