import { Interaction, MessageComponentInteraction, MessageComponentInteractionCollector } from "discord.js";
import { LogType } from "src/data/LogType";
import { pluginInfo } from "src/plugins/Automod/info";
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
        await sendEphemeralReply(int, `You have removed the role <@&${role.id}>`);
      } else {
        await member.roles.add(role, `Button Roles on message ${int.message.id}`);
        await sendEphemeralReply(int, `You have added the role <@&${role.id}>`);
      }

      return;
    }

    // TODO: Send ephemeral reply with buttons that are part of the selected menu
    if (action === ButtonMenuActions.OPEN_MENU) {
      console.log("Disable TSLint error");
    }

    await sendEphemeralReply(int, split.join("\n")); // TODO: Remove debug output
  },
});

async function sendEphemeralReply(interaction: MessageComponentInteraction, message: string) {
  await interaction.reply(message, { ephemeral: true });
}
