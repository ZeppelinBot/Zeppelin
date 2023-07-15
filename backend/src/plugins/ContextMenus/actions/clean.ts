import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { GuildPluginData } from "knub";
import { logger } from "../../../logger";
import { UtilityPlugin } from "../../../plugins/Utility/UtilityPlugin";
import { MODAL_TIMEOUT } from "../commands/ModMenuUserCtxCmd";
import { ContextMenuPluginType, ModMenuActionType } from "../types";

export async function cleanAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  amount: number,
  target: string,
  interaction: ButtonInteraction,
) {
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });
  const utility = pluginData.getPlugin(UtilityPlugin);

  if (!userCfg.can_use || !(await utility.hasPermission(executingMember, interaction.channelId, "can_clean"))) {
    await interaction
      .editReply({ content: "Cannot clean: insufficient permissions", embeds: [], components: [] })
      .catch((err) => logger.error(`Clean interaction reply failed: ${err}`));
    return;
  }

  // TODO: Implement message cleaning
  await interaction
    .editReply({
      content: `TODO: Implementation incomplete`,
      embeds: [],
      components: [],
    })
    .catch((err) => logger.error(`Clean interaction reply failed: ${err}`));
}

export async function launchCleanActionModal(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ButtonInteraction,
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
      await submitted.deferUpdate().catch((err) => logger.error(`Clean interaction defer failed: ${err}`));

      const amount = submitted.fields.getTextInputValue("amount");
      if (isNaN(Number(amount))) {
        interaction
          .editReply({ content: `Error: Amount '${amount}' is invalid`, embeds: [], components: [] })
          .catch((err) => logger.error(`Clean interaction reply failed: ${err}`));
        return;
      }

      await cleanAction(pluginData, Number(amount), target, interaction);
    })
    .catch((err) => logger.error(`Clean modal interaction failed: ${err}`));
}
