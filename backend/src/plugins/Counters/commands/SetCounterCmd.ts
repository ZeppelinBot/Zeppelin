import { Snowflake, TextChannel } from "discord.js";
import { typedGuildCommand } from "knub";
import { waitForReply } from "knub/dist/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { resolveUser, UnknownUser } from "../../../utils";
import { setCounterValue } from "../functions/setCounterValue";
import { CountersPluginType } from "../types";

export const SetCounterCmd = typedGuildCommand<CountersPluginType>()({
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
      sendErrorMessage(pluginData, message.channel, `Unknown counter: ${args.counterName}`);
      return;
    }

    if (counter.can_edit === false) {
      sendErrorMessage(pluginData, message.channel, `Missing permissions to edit this counter's value`);
      return;
    }

    if (args.channel && !counter.per_channel) {
      sendErrorMessage(pluginData, message.channel, `This counter is not per-channel`);
      return;
    }

    if (args.user && !counter.per_user) {
      sendErrorMessage(pluginData, message.channel, `This counter is not per-user`);
      return;
    }

    let channel = args.channel;
    if (!channel && counter.per_channel) {
      message.channel.send(`Which channel's counter value would you like to change?`);
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        sendErrorMessage(pluginData, message.channel, "Cancelling");
        return;
      }

      const potentialChannel = pluginData.guild.channels.resolve(reply.content as Snowflake);
      if (!potentialChannel || !(potentialChannel instanceof TextChannel)) {
        sendErrorMessage(pluginData, message.channel, "Channel is not a text channel, cancelling");
        return;
      }

      channel = potentialChannel;
    }

    let user = args.user;
    if (!user && counter.per_user) {
      message.channel.send(`Which user's counter value would you like to change?`);
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        sendErrorMessage(pluginData, message.channel, "Cancelling");
        return;
      }

      const potentialUser = await resolveUser(pluginData.client, reply.content);
      if (!potentialUser || potentialUser instanceof UnknownUser) {
        sendErrorMessage(pluginData, message.channel, "Unknown user, cancelling");
        return;
      }

      user = potentialUser;
    }

    let value = args.value;
    if (!value) {
      message.channel.send("What would you like to set the counter's value to?");
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        sendErrorMessage(pluginData, message.channel, "Cancelling");
        return;
      }

      const potentialValue = parseInt(reply.content, 10);
      if (Number.isNaN(potentialValue)) {
        sendErrorMessage(pluginData, message.channel, "Not a number, cancelling");
        return;
      }

      value = potentialValue;
    }

    if (value < 0) {
      sendErrorMessage(pluginData, message.channel, "Cannot set counter value below 0");
      return;
    }

    await setCounterValue(pluginData, args.counterName, channel?.id ?? null, user?.id ?? null, value);
    const counterName = counter.name || args.counterName;

    if (channel && user) {
      message.channel.send(`Set **${counterName}** for <@!${user.id}> in <#${channel.id}> to ${value}`);
    } else if (channel) {
      message.channel.send(`Set **${counterName}** in <#${channel.id}> to ${value}`);
    } else if (user) {
      message.channel.send(`Set **${counterName}** for <@!${user.id}> to ${value}`);
    } else {
      message.channel.send(`Set **${counterName}** to ${value}`);
    }
  },
});
