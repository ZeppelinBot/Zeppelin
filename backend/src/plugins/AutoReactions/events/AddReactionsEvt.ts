import { GuildChannel, GuildTextBasedChannel, Permissions } from "discord.js";
import { LogType } from "../../../data/LogType";
import { isDiscordAPIError } from "../../../utils";
import { getMissingChannelPermissions } from "../../../utils/getMissingChannelPermissions";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { readChannelPermissions } from "../../../utils/readChannelPermissions";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { autoReactionsEvt } from "../types";
import { AutoReaction } from "../../../data/entities/AutoReaction";

const p = Permissions.FLAGS;

export const AddReactionsEvt = autoReactionsEvt({
  event: "messageCreate",
  allowBots: true,
  allowSelf: true,

  async listener({ pluginData, args: { message } }) {
    const channel = (await message.guild?.channels.fetch(message.channelId)) as
      | GuildTextBasedChannel
      | null
      | undefined;
    if (!channel) {
      return;
    }

    let autoReaction: AutoReaction | null = null;
    const lock = await pluginData.locks.acquire(`auto-reactions-${channel.id}`);
    if (pluginData.state.cache.has(channel.id)) {
      autoReaction = pluginData.state.cache.get(channel.id) ?? null;
    } else {
      autoReaction = (await pluginData.state.autoReactions.getForChannel(channel.id)) ?? null;
      pluginData.state.cache.set(channel.id, autoReaction);
    }
    lock.unlock();

    if (!autoReaction) {
      return;
    }

    const me = pluginData.guild.members.cache.get(pluginData.client.user!.id)!;
    if (me) {
      const missingPermissions = getMissingChannelPermissions(me, channel, readChannelPermissions | p.ADD_REACTIONS);
      if (missingPermissions) {
        const logs = pluginData.getPlugin(LogsPlugin);
        logs.logBotAlert({
          body: `Cannot apply auto-reactions in <#${channel.id}>. ${missingPermissionError(missingPermissions)}`,
        });
        return;
      }
    }

    for (const reaction of autoReaction.reactions) {
      try {
        await message.react(reaction);
      } catch (e) {
        if (isDiscordAPIError(e)) {
          const logs = pluginData.getPlugin(LogsPlugin);
          if (e.code === 10008) {
            logs.logBotAlert({
              body: `Could not apply auto-reactions in <#${channel.id}> for message \`${message.id}\`. Make sure nothing is deleting the message before the reactions are applied.`,
            });
          } else {
            logs.logBotAlert({
              body: `Could not apply auto-reactions in <#${channel.id}> for message \`${message.id}\`. Error code ${e.code}.`,
            });
          }

          break;
        } else {
          throw e;
        }
      }
    }
  },
});
