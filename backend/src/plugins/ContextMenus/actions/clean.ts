import {
  ActionRowBuilder,
  Message,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { GuildPluginData } from "knub";
import { logger } from "../../../logger";
import { UtilityPlugin } from "../../../plugins/Utility/UtilityPlugin";
import { MODAL_TIMEOUT } from "../commands/ModMenuUserCtxCmd";
import { ContextMenuPluginType, ModMenuActionType } from "../types";

export async function cleanAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  amount: number,
  target: string,
  targetMessage: Message,
  targetChannel: string,
  interaction: ModalSubmitInteraction,
) {
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });
  const utility = pluginData.getPlugin(UtilityPlugin);

  if (!userCfg.can_use || !(await utility.hasPermission(executingMember, targetChannel, "can_clean"))) {
    await interaction
      .editReply({ content: "Cannot clean: insufficient permissions", embeds: [], components: [] })
      .catch((err) => logger.error(`Clean interaction reply failed: ${err}`));
    return;
  }

  await interaction
    .editReply({
      content: `Cleaning ${amount} messages from ${target}...`,
      embeds: [],
      components: [],
    })
    .catch((err) => logger.error(`Clean interaction reply failed: ${err}`));

  await utility.clean({ count: amount, channel: targetChannel, "response-interaction": interaction }, targetMessage);
}

export async function launchCleanActionModal(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: MessageContextMenuCommandInteraction,
  target: string,
) {
  const modalId = `${ModMenuActionType.CLEAN}:${interaction.id}`;
  const modal = new ModalBuilder().setCustomId(modalId).setTitle("Clean");
  const amountIn = new TextInputBuilder().setCustomId("amount").setLabel("Amount").setStyle(TextInputStyle.Short);
  const amountRow = new ActionRowBuilder<TextInputBuilder>().addComponents(amountIn);
  modal.addComponents(amountRow);

  await interaction.showModal(modal);
  await interaction
    .awaitModalSubmit({ time: MODAL_TIMEOUT, filter: (i) => i.customId == modalId })
    .then(async (submitted) => {
      await submitted.deferReply({ ephemeral: true });

      const amount = submitted.fields.getTextInputValue("amount");
      if (isNaN(Number(amount))) {
        interaction.editReply({ content: `Error: Amount '${amount}' is invalid`, embeds: [], components: [] });
        return;
      }

      await cleanAction(
        pluginData,
        Number(amount),
        target,
        interaction.targetMessage,
        interaction.channelId,
        submitted,
      );
    });
}
