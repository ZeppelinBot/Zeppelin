import { autoReactionsEvt } from "../types";
import { isDiscordRESTError } from "../../../utils";
import { LogType } from "../../../data/LogType";
import { LogsPlugin } from "../../Logs/LogsPlugin";

import { getMissingChannelPermissions } from "../../../utils/getMissingChannelPermissions";
import { readChannelPermissions } from "../../../utils/readChannelPermissions";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { GuildChannel, Permissions } from "discord.js";

const p = Permissions.FLAGS;

export const AddReactionsEvt = autoReactionsEvt({
  event: "message",
  allowBots: true,
  allowSelf: true,

  async listener({ pluginData, args: { message } }) {
    const autoReaction = await pluginData.state.autoReactions.getForChannel(message.channel.id);
    if (!autoReaction) return;

    const me = pluginData.guild.members.cache.get(pluginData.client.user!.id)!;
    const missingPermissions = getMissingChannelPermissions(
      me,
      message.channel as GuildChannel,
      readChannelPermissions | p.ADD_REACTIONS,
    );
    if (missingPermissions) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.BOT_ALERT, {
        body: `Cannot apply auto-reactions in <#${message.channel.id}>. ${missingPermissionError(missingPermissions)}`,
      });
      return;
    }

    for (const reaction of autoReaction.reactions) {
      try {
        await message.react(reaction);
      } catch (e) {
        if (isDiscordRESTError(e)) {
          const logs = pluginData.getPlugin(LogsPlugin);
          if (e.code === 10008) {
            logs.log(LogType.BOT_ALERT, {
              body: `Could not apply auto-reactions in <#${message.channel.id}> for message \`${message.id}\`. Make sure nothing is deleting the message before the reactions are applied.`,
            });
          } else {
            logs.log(LogType.BOT_ALERT, {
              body: `Could not apply auto-reactions in <#${message.channel.id}> for message \`${message.id}\`. Error code ${e.code}.`,
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
