import { autoReactionsEvt } from "../types";
import { isDiscordRESTError } from "src/utils";
import { LogType } from "src/data/LogType";
import { logger } from "../../../logger";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { Constants, GuildChannel } from "eris";
import { memberHasChannelPermissions } from "../../../utils/memberHasChannelPermissions";

const p = Constants.Permissions;

export const AddReactionsEvt = autoReactionsEvt({
  event: "messageCreate",
  allowBots: true,
  allowSelf: true,

  async listener({ pluginData, args: { message } }) {
    const autoReaction = await pluginData.state.autoReactions.getForChannel(message.channel.id);
    if (!autoReaction) return;

    if (
      !memberHasChannelPermissions(message.member, message.channel as GuildChannel, [
        p.readMessages,
        p.readMessageHistory,
        p.addReactions,
      ])
    ) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.BOT_ALERT, {
        body: `Missing permissions to apply auto-reactions in <#${message.channel.id}>. Ensure I can read messages, read message history, and add reactions.`,
      });
      return;
    }

    for (const reaction of autoReaction.reactions) {
      try {
        await message.addReaction(reaction);
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
