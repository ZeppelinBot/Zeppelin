import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { canActOn } from "src/pluginUtils";
import { ModActionsPlugin } from "src/plugins/ModActions/ModActionsPlugin";
import { convertDelayStringToMS, renderUserUsername } from "../../../utils";
import { CaseArgs } from "../../Cases/types";
import { MODAL_TIMEOUT } from "../commands/ModMenuCmd";
import { ContextMenuPluginType } from "../types";

async function banAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  duration: string | undefined,
  reason: string | undefined,
  target: string,
  interaction: ButtonInteraction,
) {
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });

  const modactions = pluginData.getPlugin(ModActionsPlugin);
  if (!userCfg.can_use || !(await modactions.hasBanPermission(executingMember, interaction.channelId))) {
    await interaction.editReply({ content: "Cannot ban: insufficient permissions", embeds: [], components: [] });
    return;
  }

  const targetMember = await pluginData.guild.members.fetch(target);
  if (!canActOn(pluginData, executingMember, targetMember)) {
    await interaction.editReply({ content: "Cannot ban: insufficient permissions", embeds: [], components: [] });
    return;
  }

  const caseArgs: Partial<CaseArgs> = {
    modId: executingMember.id,
  };

  const durationMs = duration ? convertDelayStringToMS(duration)! : undefined;
  const result = await modactions.banUserId(target, reason, { caseArgs }, durationMs);
  if (result.status === "failed") {
    await interaction.editReply({ content: "ERROR: Failed to ban user", embeds: [], components: [] });
    return;
  }

  const userName = renderUserUsername(targetMember.user);
  const messageResultText = result.notifyResult.text ? ` (${result.notifyResult.text})` : "";
  const banMessage = `Banned **${userName}** ${
    durationMs ? `for ${humanizeDuration(durationMs)}` : "indefinitely"
  } (Case #${result.case.case_number})${messageResultText}`;

  await interaction.editReply({ content: banMessage, embeds: [], components: [] });
}

export async function launchBanActionModal(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ButtonInteraction,
  target: string,
) {
  const modal = new ModalBuilder().setCustomId("ban").setTitle("Ban");

  const durationIn = new TextInputBuilder()
    .setCustomId("duration")
    .setLabel("Duration (Optional)")
    .setRequired(false)
    .setStyle(TextInputStyle.Short);

  const reasonIn = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Reason (Optional)")
    .setRequired(false)
    .setStyle(TextInputStyle.Paragraph);

  const durationRow = new ActionRowBuilder<TextInputBuilder>().addComponents(durationIn);
  const reasonRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonIn);

  modal.addComponents(durationRow, reasonRow);

  await interaction.showModal(modal);
  const submitted: ModalSubmitInteraction = await interaction.awaitModalSubmit({ time: MODAL_TIMEOUT });
  if (submitted) {
    await submitted.deferUpdate();

    const duration = submitted.fields.getTextInputValue("duration");
    const reason = submitted.fields.getTextInputValue("reason");

    await banAction(pluginData, duration, reason, target, interaction);
  }
}
