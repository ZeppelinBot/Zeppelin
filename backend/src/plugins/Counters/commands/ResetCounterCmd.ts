import { Snowflake, TextChannel } from "discord.js";
import { typedGuildCommand } from "knub";
import { waitForReply } from "knub/dist/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { resolveUser, UnknownUser } from "../../../utils";
import { setCounterValue } from "../functions/setCounterValue";
import { CountersPluginType } from "../types";

export const ResetCounterCmd = typedGuildCommand<CountersPluginType>()({
  trigger: ["counters reset", "counter reset", "resetcounter"],
  permission: "can_edit",

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
      channel: ct.textChannel(),
    },
    {
      counterName: ct.string(),
      channel: ct.textChannel(),
      user: ct.resolvedUser(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
      channel: ct.textChannel(),
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
      sendErrorMessage(pluginData, message.channel, `Missing permissions to reset this counter's value`);
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
      message.channel.send(`Which channel's counter value would you like to reset?`);
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
      message.channel.send(`Which user's counter value would you like to reset?`);
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

    await setCounterValue(pluginData, args.counterName, channel?.id ?? null, user?.id ?? null, counter.initial_value);
    const counterName = counter.name || args.counterName;

    if (channel && user) {
      message.channel.send(`Reset **${counterName}** for <@!${user.id}> in <#${channel.id}>`);
    } else if (channel) {
      message.channel.send(`Reset **${counterName}** in <#${channel.id}>`);
    } else if (user) {
      message.channel.send(`Reset **${counterName}** for <@!${user.id}>`);
    } else {
      message.channel.send(`Reset **${counterName}**`);
    }
  },
});
