import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { GuildPluginData } from "knub";
import { UtilityPlugin } from "../../../plugins/Utility/UtilityPlugin";
import { MODAL_TIMEOUT } from "../commands/ModMenuCmd";
import { ContextMenuPluginType } from "../types";

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
    await interaction.editReply({ content: "Cannot clean: insufficient permissions", embeds: [], components: [] });
    return;
  }

  // TODO: Implement message cleaning
  await interaction.editReply({
    content: `TODO: Implementation incomplete`,
    embeds: [],
    components: [],
  });
}

export async function launchCleanActionModal(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ButtonInteraction,
  target: string,
) {
  const modal = new ModalBuilder().setCustomId("clean").setTitle("Clean");
  const amountIn = new TextInputBuilder().setCustomId("amount").setLabel("Amount").setStyle(TextInputStyle.Short);
  const amountRow = new ActionRowBuilder<TextInputBuilder>().addComponents(amountIn);
  modal.addComponents(amountRow);

  await interaction.showModal(modal);
  const submitted: ModalSubmitInteraction = await interaction.awaitModalSubmit({ time: MODAL_TIMEOUT });
  if (submitted) {
    await submitted.deferUpdate();

    const amount = submitted.fields.getTextInputValue("amount");
    if (isNaN(Number(amount))) {
      interaction.editReply({ content: `Error: Amount '${amount}' is invalid`, embeds: [], components: [] });
      return;
    }

    await cleanAction(pluginData, Number(amount), target, interaction);
  }
}
