import { MessageActionRow, MessageButton, MessageComponentInteraction } from "discord.js";
import moment from "moment";
import { LogType } from "src/data/LogType";
import { logger } from "src/logger";
import { LogsPlugin } from "src/plugins/Logs/LogsPlugin";
import { MINUTES } from "src/utils";
import { idToTimestamp } from "src/utils/idToTimestamp";
import { reactionRolesEvt } from "../types";
import {
  generateStatelessCustomId,
  resolveStatefulCustomId,
  BUTTON_CONTEXT_SEPARATOR,
} from "../util/buttonCustomIdFunctions";
import { ButtonMenuActions } from "../util/buttonMenuActions";
import humanizeDuration from "humanize-duration";

const BUTTON_INVALIDATION_TIME = 15 * MINUTES;

export const ButtonInteractionEvt = reactionRolesEvt({
  event: "interaction",

  async listener(meta) {
    const int = meta.args.interaction.isMessageComponent()
      ? (meta.args.interaction as MessageComponentInteraction)
      : null;
    if (!int) return;
    const cfg = meta.pluginData.config.get();
    const split = int.customID.split(BUTTON_CONTEXT_SEPARATOR);
    const context = (await resolveStatefulCustomId(meta.pluginData, int.customID)) ?? {
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

    if (context.action === ButtonMenuActions.GRANT_ROLE) {
      const role = await meta.pluginData.guild.roles.fetch(context.roleOrMenu);
      if (!role) {
        await sendEphemeralReply(int, `A configuration error was encountered, please contact the Administrators!`);
        meta.pluginData
          .getPlugin(LogsPlugin)
          .log(
            LogType.BOT_ALERT,
            `**A configuration error occured** on buttons for message ${int.message.id}, group **${context.groupName}** not found in config`,
          );
        return;
      }

      const member = await meta.pluginData.guild.members.fetch(int.user.id);
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role, `Button Roles on message ${int.message.id}`);
        await sendEphemeralReply(int, `Role **${role.name}** removed`);
      } else {
        await member.roles.add(role, `Button Roles on message ${int.message.id}`);
        await sendEphemeralReply(int, `Role **${role.name}** added`);
      }

      return;
    }

    if (context.action === ButtonMenuActions.OPEN_MENU) {
      const menuButtons: MessageButton[] = [];
      for (const menuButton of Object.values(group.button_menus[context.roleOrMenu])) {
        const customId = await generateStatelessCustomId(meta.pluginData, context.groupName, menuButton.role_or_menu);

        const btn = new MessageButton()
          .setLabel(menuButton.label)
          .setStyle("PRIMARY")
          .setType("BUTTON")
          .setCustomID(customId);

        if (menuButton.emoji) {
          const emo = meta.pluginData.client.emojis.resolve(menuButton.emoji) ?? menuButton.emoji;
          btn.setEmoji(emo);
        }
        menuButtons.push(btn);
      }

      if (menuButtons.length === 0) {
        await sendEphemeralReply(int, `A configuration error was encountered, please contact the Administrators!`);
        meta.pluginData
          .getPlugin(LogsPlugin)
          .log(
            LogType.BOT_ALERT,
            `**A configuration error occured** on buttons for message ${int.message.id}, menu **${context.roleOrMenu}** not found in config`,
          );
        return;
      }
      const row = new MessageActionRow().addComponents(menuButtons);

      int.reply({ content: `Click to add/remove a role`, components: [row], ephemeral: true, split: false });
      return;
    }

    logger.warn(
      `Action ${context.action} on button ${int.customID} (Guild: ${int.guildID}, Channel: ${int.channelID}) is unknown!`,
    );
    await sendEphemeralReply(int, `A internal error was encountered, please contact the Administrators!`);
  },
});

async function sendEphemeralReply(interaction: MessageComponentInteraction, message: string) {
  await interaction.reply(message, { ephemeral: true });
}
