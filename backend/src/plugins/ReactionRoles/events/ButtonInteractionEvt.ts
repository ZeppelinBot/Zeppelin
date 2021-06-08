import { MessageActionRow, MessageButton, MessageComponentInteraction } from "discord.js";
import { LogType } from "src/data/LogType";
import { logger } from "src/logger";
import { LogsPlugin } from "src/plugins/Logs/LogsPlugin";
import { reactionRolesEvt } from "../types";
import { ButtonMenuActions } from "../util/buttonMenuActions";

export const ButtonInteractionEvt = reactionRolesEvt({
  event: "interaction",

  async listener(meta) {
    const int = meta.args.interaction.isMessageComponent()
      ? (meta.args.interaction as MessageComponentInteraction)
      : null;
    if (!int) return;
    const cfg = meta.pluginData.config.get();
    const split = int.customID.split("::");
    const [groupName, action, roleOrMenu] = [split[0], split[1], split[2]];

    const group = cfg.button_groups[groupName];
    if (!group) {
      await sendEphemeralReply(int, `A configuration error was encountered, please contact the Administrators!`);
      meta.pluginData
        .getPlugin(LogsPlugin)
        .log(
          LogType.BOT_ALERT,
          `**A configuration error occured** on buttons for message ${int.message.id}, group **${groupName}** not found in config`,
        );
      return;
    }

    // Verify that detected action is known by us
    if (!(<any>Object).values(ButtonMenuActions).includes(action)) {
      await sendEphemeralReply(int, `A internal error was encountered, please contact the Administrators!`);
      meta.pluginData
        .getPlugin(LogsPlugin)
        .log(
          LogType.BOT_ALERT,
          `**A internal error occured** on buttons for message ${int.message.id}, action **${action}** is not known`,
        );
      return;
    }

    if (action === ButtonMenuActions.GRANT_ROLE) {
      const role = await meta.pluginData.guild.roles.fetch(roleOrMenu);
      if (!role) {
        await sendEphemeralReply(int, `A configuration error was encountered, please contact the Administrators!`);
        meta.pluginData
          .getPlugin(LogsPlugin)
          .log(
            LogType.BOT_ALERT,
            `**A configuration error occured** on buttons for message ${int.message.id}, group **${groupName}** not found in config`,
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

    if (action === ButtonMenuActions.OPEN_MENU) {
      const menuButtons: MessageButton[] = [];
      for (const menuButton of Object.values(group.button_menus[roleOrMenu])) {
        let customId = "";
        customId = `${groupName}::${ButtonMenuActions.GRANT_ROLE}::${menuButton.role}`;

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
            `**A configuration error occured** on buttons for message ${int.message.id}, menu **${roleOrMenu}** not found in config`,
          );
        return;
      }
      const row = new MessageActionRow().addComponents(menuButtons);

      int.reply({ content: `Click to add/remove a role`, components: [row], ephemeral: true, split: false });
      return;
    }

    logger.warn(
      `Action ${action} on button ${int.customID} (Guild: ${int.guildID}, Channel: ${int.channelID}) is unknown!`,
    );
    await sendEphemeralReply(int, `A internal error was encountered, please contact the Administrators!`);
  },
});

async function sendEphemeralReply(interaction: MessageComponentInteraction, message: string) {
  await interaction.reply(message, { ephemeral: true });
}
