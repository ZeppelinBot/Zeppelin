import { MessageComponentInteraction } from "discord.js";
import moment from "moment";
import { LogType } from "src/data/LogType";
import { logger } from "src/logger";
import { LogsPlugin } from "src/plugins/Logs/LogsPlugin";
import { MINUTES } from "src/utils";
import { idToTimestamp } from "src/utils/idToTimestamp";
import { reactionRolesEvt } from "../types";
import { resolveStatefulCustomId, BUTTON_CONTEXT_SEPARATOR } from "../util/buttonCustomIdFunctions";
import { ButtonMenuActions } from "../util/buttonMenuActions";
import humanizeDuration from "humanize-duration";
import { handleModifyRole, handleOpenMenu } from "../util/buttonActionHandlers";

const BUTTON_INVALIDATION_TIME = 15 * MINUTES;

export const ButtonInteractionEvt = reactionRolesEvt({
  event: "interactionCreate",

  async listener(meta) {
    const int = meta.args.interaction.isMessageComponent()
      ? (meta.args.interaction as MessageComponentInteraction)
      : null;
    if (!int) return;

    const cfg = meta.pluginData.config.get();
    const split = int.customId.split(BUTTON_CONTEXT_SEPARATOR);
    const context = (await resolveStatefulCustomId(meta.pluginData, int.customId)) ?? {
      groupName: split[0],
      action: split[1],
      roleOrMenu: split[2],
      stateless: true,
    };

    if (context.stateless) {
      const timeSinceCreation = moment.utc().valueOf() - idToTimestamp(int.message.id)!;
      if (timeSinceCreation >= BUTTON_INVALIDATION_TIME) {
        sendEphemeralReply(
          int,
          `Sorry, but these buttons are invalid because they are older than ${humanizeDuration(
            BUTTON_INVALIDATION_TIME,
          )}.\nIf the menu is still available, open it again to assign yourself roles!`,
        );
        return;
      }
    }

    const group = cfg.button_groups[context.groupName];
    if (!group) {
      await sendEphemeralReply(int, `A configuration error was encountered, please contact the Administrators!`);
      meta.pluginData
        .getPlugin(LogsPlugin)
        .log(
          LogType.BOT_ALERT,
          `**A configuration error occured** on buttons for message ${int.message.id}, group **${context.groupName}** not found in config`,
        );
      return;
    }

    // Verify that detected action is known by us
    if (!(<any>Object).values(ButtonMenuActions).includes(context.action)) {
      await sendEphemeralReply(int, `A internal error was encountered, please contact the Administrators!`);
      meta.pluginData
        .getPlugin(LogsPlugin)
        .log(
          LogType.BOT_ALERT,
          `**A internal error occured** on buttons for message ${int.message.id}, action **${context.action}** is not known`,
        );
      return;
    }

    if (context.action === ButtonMenuActions.MODIFY_ROLE) {
      await handleModifyRole(meta.pluginData, int, group, context);
      return;
    }

    if (context.action === ButtonMenuActions.OPEN_MENU) {
      await handleOpenMenu(meta.pluginData, int, group, context);
      return;
    }

    logger.warn(
      `Action ${context.action} on button ${int.customId} (Guild: ${int.guildId}, Channel: ${int.channelId}) is unknown!`,
    );
    await sendEphemeralReply(int, `A internal error was encountered, please contact the Administrators!`);
  },
});

async function sendEphemeralReply(interaction: MessageComponentInteraction, message: string) {
  await interaction.reply({ content: message, ephemeral: true });
}
