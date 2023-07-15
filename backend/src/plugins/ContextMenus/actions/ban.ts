import {
  ActionRowBuilder,
  ButtonInteraction,
  ContextMenuCommandInteraction,
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
import { MODAL_TIMEOUT } from "../commands/ModMenuUserCtxCmd";
import { ContextMenuPluginType } from "../types";

async function banAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  duration: string | undefined,
  reason: string | undefined,
  target: string,
  interaction: ButtonInteraction | ContextMenuCommandInteraction,
  submitInteraction: ModalSubmitInteraction,
) {
  const interactionToReply = interaction instanceof ButtonInteraction ? interaction : submitInteraction;
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });

  const modactions = pluginData.getPlugin(ModActionsPlugin);
  if (!userCfg.can_use || !(await modactions.hasBanPermission(executingMember, interaction.channelId))) {
    await interactionToReply.editReply({ content: "Cannot ban: insufficient permissions", embeds: [], components: [] });
    return;
  }

  const targetMember = await pluginData.guild.members.fetch(target);
  if (!canActOn(pluginData, executingMember, targetMember)) {
    await interactionToReply.editReply({ content: "Cannot ban: insufficient permissions", embeds: [], components: [] });
    return;
  }

  const caseArgs: Partial<CaseArgs> = {
    modId: executingMember.id,
  };

  const durationMs = duration ? convertDelayStringToMS(duration)! : undefined;
  const result = await modactions.banUserId(target, reason, { caseArgs }, durationMs);
  if (result.status === "failed") {
    await interactionToReply.editReply({ content: "Error: Failed to ban user", embeds: [], components: [] });
    return;
  }

  const userName = renderUserUsername(targetMember.user);
  const messageResultText = result.notifyResult.text ? ` (${result.notifyResult.text})` : "";
  const banMessage = `Banned **${userName}** ${
    durationMs ? `for ${humanizeDuration(durationMs)}` : "indefinitely"
  } (Case #${result.case.case_number})${messageResultText}`;

  await interactionToReply.editReply({ content: banMessage, embeds: [], components: [] });
}

export async function launchBanActionModal(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ButtonInteraction | ContextMenuCommandInteraction,
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
    if (interaction instanceof ButtonInteraction) {
      await submitted.deferUpdate();
    } else {
      await submitted.deferReply({ ephemeral: true });
    }

    const duration = submitted.fields.getTextInputValue("duration");
    const reason = submitted.fields.getTextInputValue("reason");

    await banAction(pluginData, duration, reason, target, interaction, submitted);
  }
}
