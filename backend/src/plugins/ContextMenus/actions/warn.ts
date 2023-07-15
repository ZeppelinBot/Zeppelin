import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { GuildPluginData } from "knub";
import { canActOn } from "src/pluginUtils";
import { ModActionsPlugin } from "src/plugins/ModActions/ModActionsPlugin";
import { renderUserUsername } from "../../../utils";
import { CaseArgs } from "../../Cases/types";
import { MODAL_TIMEOUT } from "../commands/ModMenuCmd";
import { ContextMenuPluginType } from "../types";

async function warnAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  reason: string,
  target: string,
  interaction: ButtonInteraction,
) {
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });

  const modactions = pluginData.getPlugin(ModActionsPlugin);
  if (!userCfg.can_use || !(await modactions.hasWarnPermission(executingMember, interaction.channelId))) {
    await interaction.editReply({ content: "Cannot warn: insufficient permissions", embeds: [], components: [] });
    return;
  }

  const targetMember = await pluginData.guild.members.fetch(target);
  if (!canActOn(pluginData, executingMember, targetMember)) {
    await interaction.editReply({ content: "Cannot warn: insufficient permissions", embeds: [], components: [] });
    return;
  }

  const caseArgs: Partial<CaseArgs> = {
    modId: executingMember.id,
  };

  const result = await modactions.warnMember(targetMember, reason, { caseArgs });
  if (result.status === "failed") {
    await interaction.editReply({ content: "Error: Failed to warn user", embeds: [], components: [] });
    return;
  }

  const userName = renderUserUsername(targetMember.user);
  const messageResultText = result.notifyResult.text ? ` (${result.notifyResult.text})` : "";
  const muteMessage = `Warned **${userName}** (Case #${result.case.case_number})${messageResultText}`;

  await interaction.editReply({ content: muteMessage, embeds: [], components: [] });
}

export async function launchWarnActionModal(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ButtonInteraction,
  target: string,
) {
  const modal = new ModalBuilder().setCustomId("warn").setTitle("Warn");
  const reasonIn = new TextInputBuilder().setCustomId("reason").setLabel("Reason").setStyle(TextInputStyle.Paragraph);
  const reasonRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonIn);
  modal.addComponents(reasonRow);

  await interaction.showModal(modal);
  const submitted: ModalSubmitInteraction = await interaction.awaitModalSubmit({ time: MODAL_TIMEOUT });
  if (submitted) {
    await submitted.deferUpdate();

    const reason = submitted.fields.getTextInputValue("reason");

    await warnAction(pluginData, reason, target, interaction);
  }
}
