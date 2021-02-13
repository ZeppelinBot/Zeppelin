import { guildCommand } from "knub";
import { CountersPluginType } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { resolveChannel, waitForReply } from "knub/dist/helpers";
import { TextChannel, User } from "eris";
import { resolveUser, UnknownUser } from "../../../utils";
import { changeCounterValue } from "../functions/changeCounterValue";

export const AddCounterCmd = guildCommand<CountersPluginType>()({
  trigger: ["counters add", "counter add", "addcounter"],
  permission: "can_edit",

  signature: [
    {
      counterName: ct.string(),
      amount: ct.number(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
      amount: ct.number(),
    },
    {
      counterName: ct.string(),
      channel: ct.textChannel(),
      amount: ct.number(),
    },
    {
      counterName: ct.string(),
      channel: ct.textChannel(),
      user: ct.resolvedUser(),
      amount: ct.number(),
    },
    {
      counterName: ct.string(),
      user: ct.resolvedUser(),
      channel: ct.textChannel(),
      amount: ct.number(),
    },
  ],

  async run({ pluginData, message, args }) {
    const config = pluginData.config.getForMessage(message);
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
      message.channel.createMessage(`Which channel's counter value would you like to add to?`);
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        sendErrorMessage(pluginData, message.channel, "Cancelling");
        return;
      }

      const potentialChannel = resolveChannel(pluginData.guild, reply.content);
      if (!potentialChannel || !(potentialChannel instanceof TextChannel)) {
        sendErrorMessage(pluginData, message.channel, "Channel is not a text channel, cancelling");
        return;
      }

      channel = potentialChannel;
    }

    let user = args.user;
    if (!user && counter.per_user) {
      message.channel.createMessage(`Which user's counter value would you like to add to?`);
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

    let amount = args.amount;
    if (!amount) {
      message.channel.createMessage("How much would you like to add to the counter's value?");
      const reply = await waitForReply(pluginData.client, message.channel, message.author.id);
      if (!reply || !reply.content) {
        sendErrorMessage(pluginData, message.channel, "Cancelling");
        return;
      }

      const potentialAmount = parseInt(reply.content, 10);
      if (!potentialAmount) {
        sendErrorMessage(pluginData, message.channel, "Not a number, cancelling");
        return;
      }

      amount = potentialAmount;
    }

    await changeCounterValue(pluginData, args.counterName, channel?.id ?? null, user?.id ?? null, amount);
    const newValue = await pluginData.state.counters.getCurrentValue(counterId, channel?.id ?? null, user?.id ?? null);
    const counterName = counter.name || args.counterName;

    if (channel && user) {
      message.channel.createMessage(
        `Added ${amount} to **${counterName}** for <@!${user.id}> in <#${channel.id}>. The value is now ${newValue}.`,
      );
    } else if (channel) {
      message.channel.createMessage(
        `Added ${amount} to **${counterName}** in <#${channel.id}>. The value is now ${newValue}.`,
      );
    } else if (user) {
      message.channel.createMessage(
        `Added ${amount} to **${counterName}** for <@!${user.id}>. The value is now ${newValue}.`,
      );
    } else {
      message.channel.createMessage(`Added ${amount} to **${counterName}**. The value is now ${newValue}.`);
    }
  },
});
