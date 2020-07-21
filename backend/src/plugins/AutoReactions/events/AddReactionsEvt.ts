import { autoReactionsEvt } from "../types";
import { isDiscordRESTError } from "src/utils";
import { logger } from "knub";
import { LogType } from "src/data/LogType";

export const AddReactionsEvt = autoReactionsEvt({
  event: "messageCreate",
  allowOutsideOfGuild: false,

  async listener(meta) {
    const pluginData = meta.pluginData;
    const msg = meta.args.message;

    const autoReaction = await pluginData.state.autoReactions.getForChannel(msg.channel.id);
    if (!autoReaction) return;

    for (const reaction of autoReaction.reactions) {
      try {
        await msg.addReaction(reaction);
      } catch (e) {
        if (isDiscordRESTError(e)) {
          logger.warn(
            `Could not apply auto-reaction to ${msg.channel.id}/${msg.id} in guild ${pluginData.guild.name} (${pluginData.guild.id}) (error code ${e.code})`,
          );

          if (e.code === 10008) {
            pluginData.state.logs.log(LogType.BOT_ALERT, {
              body: `Could not apply auto-reactions in <#${msg.channel.id}> for message \`${msg.id}\`. Make sure nothing is deleting the message before the reactions are applied.`,
            });
          } else {
            pluginData.state.logs.log(LogType.BOT_ALERT, {
              body: `Could not apply auto-reactions in <#${msg.channel.id}> for message \`${msg.id}\`. Error code ${e.code}.`,
            });
          }

          return;
        } else {
          throw e;
        }
      }
    }
  },
});
