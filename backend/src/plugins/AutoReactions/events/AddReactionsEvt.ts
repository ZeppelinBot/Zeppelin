import { autoReactionsEvt } from "../types";
import { isDiscordRESTError } from "../../../utils";
import { LogType } from "../../../data/LogType";
import { logger } from "../../../logger";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { Constants, GuildChannel } from "eris";
import { getMissingChannelPermissions } from "../../../utils/getMissingChannelPermissions";
import { readChannelPermissions } from "../../../utils/readChannelPermissions";
import { missingPermissionError } from "../../../utils/missingPermissionError";

const p = Constants.Permissions;

export const AddReactionsEvt = autoReactionsEvt({
  event: "messageCreate",
  allowBots: true,
  allowSelf: true,

  async listener({ pluginData, args: { message } }) {
    const autoReaction = await pluginData.state.autoReactions.getForChannel(message.channel.id);
    if (!autoReaction) return;

    const me = pluginData.guild.members.get(pluginData.client.user.id)!;
    const missingPermissions = getMissingChannelPermissions(
      me,
      message.channel as GuildChannel,
      readChannelPermissions | p.addReactions,
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
