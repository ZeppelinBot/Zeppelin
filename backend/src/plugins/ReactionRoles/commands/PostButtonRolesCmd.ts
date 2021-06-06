import { reactionRolesCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { MessageActionRow, MessageButton, TextChannel } from "discord.js";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { ButtonMenuActions } from "../util/buttonMenuActions";

export const PostButtonRolesCmd = reactionRolesCmd({
  trigger: "reaction_roles post",
  permission: "can_manage",

  signature: {
    button_group: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const cfg = pluginData.config.get();
    const group = cfg.button_groups[args.button_group];

    if (!group) {
      sendErrorMessage(pluginData, msg.channel, `No button group matches the name **${args.button_group}**`);
    }

    const channel = pluginData.guild.channels.resolve(group.channel_id);
    if (!channel) {
      await sendErrorMessage(
        pluginData,
        msg.channel,
        `The ID ${group.channel_id} does not match a channel on the server`,
      );
      return;
    }

    const buttons: MessageButton[] = [];
    for (const button of Object.values(group.default_buttons)) {
      let customId = "";
      if ((await pluginData.guild.roles.fetch(button.role_or_menu)) != null) {
        customId = `${args.button_group}::${ButtonMenuActions.GRANT_ROLE}::${button.role_or_menu}`;
      } else {
        customId = `${args.button_group}::${ButtonMenuActions.OPEN_MENU}::${button.role_or_menu}`;
      }

      const btn = new MessageButton()
        .setLabel(button.label)
        .setStyle("PRIMARY")
        .setType("BUTTON")
        .setCustomID(customId);

      if (button.emoji) {
        const emo = pluginData.client.emojis.resolve(button.emoji) ?? button.emoji;
        btn.setEmoji(emo);
      }

      buttons.push(btn);
    }
    const row = new MessageActionRow().addComponents(buttons);

    try {
      await (channel as TextChannel).send({ content: group.message, components: [row], split: false });
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, `Error trying to post message: ${e}`);
      return;
    }
    await sendSuccessMessage(pluginData, msg.channel, `Successfully posted message in <#${channel.id}>`);
  },
});
