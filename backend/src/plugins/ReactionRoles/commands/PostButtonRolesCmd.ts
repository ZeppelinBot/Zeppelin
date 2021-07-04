import { MessageActionRow, MessageButton, Snowflake, TextChannel } from "discord.js";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { reactionRolesCmd } from "../types";
import { createHash } from "crypto";
import moment from "moment";
import { splitButtonsIntoRows } from "../util/splitButtonsIntoRows";

export const PostButtonRolesCmd = reactionRolesCmd({
  trigger: "reaction_roles post",
  permission: "can_manage",

  signature: {
    channel: ct.textChannel(),
    buttonGroup: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const cfg = pluginData.config.get();
    if (!cfg.button_groups) {
      sendErrorMessage(pluginData, msg.channel, "No button groups defined in config");
      return;
    }
    const group = cfg.button_groups[args.buttonGroup];

    if (!group) {
      sendErrorMessage(pluginData, msg.channel, `No button group matches the name **${args.buttonGroup}**`);
      return;
    }

    const buttons: MessageButton[] = [];
    const toInsert: Array<{ customId; buttonGroup; buttonName }> = [];
    for (const [buttonName, button] of Object.entries(group.default_buttons)) {
      const customId = createHash("md5")
        .update(`${buttonName}${moment.utc().valueOf()}`)
        .digest("hex");

      const btn = new MessageButton()
        .setLabel(button.label ?? "")
        .setStyle(button.style ?? "PRIMARY")
        .setCustomId(customId)
        .setDisabled(button.disabled ?? false);

      if (button.emoji) {
        const emo = pluginData.client.emojis.resolve(button.emoji as Snowflake) ?? button.emoji;
        btn.setEmoji(emo);
      }

      buttons.push(btn);
      toInsert.push({ customId, buttonGroup: args.buttonGroup, buttonName });
    }
    const rows = splitButtonsIntoRows(buttons, Object.values(group.default_buttons)); // new MessageActionRow().addComponents(buttons);

    try {
      const newMsg = await args.channel.send({ content: group.message, components: rows });

      for (const btn of toInsert) {
        await pluginData.state.buttonRoles.add(
          args.channel.id,
          newMsg.id,
          btn.customId,
          btn.buttonGroup,
          btn.buttonName,
        );
      }
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, `Error trying to post message: ${e}`);
      return;
    }

    await sendSuccessMessage(pluginData, msg.channel, `Successfully posted message in <#${args.channel.id}>`);
  },
});
