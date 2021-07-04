import { MessageButton, MessageActionRow, MessageComponentInteraction, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { LogsPlugin } from "../../../plugins/Logs/LogsPlugin";
import { ReactionRolesPluginType, TButtonPairOpts } from "../types";
import { generateStatelessCustomId } from "./buttonCustomIdFunctions";
import { splitButtonsIntoRows } from "./splitButtonsIntoRows";

export async function handleOpenMenu(
  pluginData: GuildPluginData<ReactionRolesPluginType>,
  int: MessageComponentInteraction,
  group: TButtonPairOpts,
  context,
) {
  const menuButtons: MessageButton[] = [];
  if (group.button_menus == null) {
    await int.reply({
      content: `A configuration error was encountered, please contact the Administrators!`,
      ephemeral: true,
    });
    pluginData
      .getPlugin(LogsPlugin)
      .log(
        LogType.BOT_ALERT,
        `**A configuration error occured** on buttons for message ${int.message.id}, no menus found in config`,
      );
    return;
  }

  for (const menuButton of Object.values(group.button_menus[context.roleOrMenu])) {
    const customId = await generateStatelessCustomId(pluginData, context.groupName, menuButton.role_or_menu);

    const btn = new MessageButton()
      .setLabel(menuButton.label ?? "")
      .setStyle("PRIMARY")
      .setCustomId(customId)
      .setDisabled(menuButton.disabled ?? false);

    if (menuButton.emoji) {
      const emo = pluginData.client.emojis.resolve(menuButton.emoji as Snowflake) ?? menuButton.emoji;
      btn.setEmoji(emo);
    }
    menuButtons.push(btn);
  }

  if (menuButtons.length === 0) {
    await int.reply({
      content: `A configuration error was encountered, please contact the Administrators!`,
      ephemeral: true,
    });
    pluginData
      .getPlugin(LogsPlugin)
      .log(
        LogType.BOT_ALERT,
        `**A configuration error occured** on buttons for message ${int.message.id}, menu **${context.roleOrMenu}** not found in config`,
      );
    return;
  }
  const rows = splitButtonsIntoRows(menuButtons, Object.values(group.button_menus[context.roleOrMenu])); // new MessageActionRow().addComponents(menuButtons);

  int.reply({ content: `Click to add/remove a role`, components: rows, ephemeral: true });
  return;
}

export async function handleModifyRole(
  pluginData: GuildPluginData<ReactionRolesPluginType>,
  int: MessageComponentInteraction,
  group: TButtonPairOpts,
  context,
) {
  const role = await pluginData.guild.roles.fetch(context.roleOrMenu);
  if (!role) {
    await int.reply({
      content: `A configuration error was encountered, please contact the Administrators!`,
      ephemeral: true,
    });
    pluginData
      .getPlugin(LogsPlugin)
      .log(
        LogType.BOT_ALERT,
        `**A configuration error occured** on buttons for message ${int.message.id}, role **${context.roleOrMenu}** not found on server`,
      );
    return;
  }

  const member = await pluginData.guild.members.fetch(int.user.id);
  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role, `Button Roles on message ${int.message.id}`);
      await int.reply({ content: `Role **${role.name}** removed`, ephemeral: true });
    } else {
      await member.roles.add(role, `Button Roles on message ${int.message.id}`);
      await int.reply({ content: `Role **${role.name}** added`, ephemeral: true });
    }
  } catch (e) {
    await int.reply({
      content: "A configuration error was encountered, please contact the Administrators!",
      ephemeral: true,
    });
    pluginData
      .getPlugin(LogsPlugin)
      .log(
        LogType.BOT_ALERT,
        `**A configuration error occured** on buttons for message ${int.message.id}, error: ${e}. We might be missing permissions!`,
      );
    return;
  }

  return;
}
