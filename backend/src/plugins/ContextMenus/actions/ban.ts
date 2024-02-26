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
import { logger } from "../../../logger";
import { convertDelayStringToMS, renderUserUsername } from "../../../utils";
import { CaseArgs } from "../../Cases/types";
import { MODAL_TIMEOUT } from "../commands/ModMenuUserCtxCmd";
import { ContextMenuPluginType, ModMenuActionType } from "../types";
import { updateAction } from "./update";

async function banAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  duration: string | undefined,
  reason: string | undefined,
  evidence: string | undefined,
  target: string,
  interaction: ButtonInteraction | ContextMenuCommandInteraction,
  submitInteraction: ModalSubmitInteraction,
) {
  const interactionToReply = interaction.isButton() ? interaction : submitInteraction;
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });

  const modactions = pluginData.getPlugin(ModActionsPlugin);
  if (!userCfg.can_use || !(await modactions.hasBanPermission(executingMember, interaction.channelId))) {
    await interactionToReply
      .editReply({ content: "Cannot ban: insufficient permissions", embeds: [], components: [] })
      .catch((err) => logger.error(`Ban interaction reply failed: ${err}`));
    return;
  }

  const targetMember = await pluginData.guild.members.fetch(target);
  if (!canActOn(pluginData, executingMember, targetMember)) {
    await interactionToReply
      .editReply({ content: "Cannot ban: insufficient permissions", embeds: [], components: [] })
      .catch((err) => logger.error(`Ban interaction reply failed: ${err}`));
    return;
  }

  const caseArgs: Partial<CaseArgs> = {
    modId: executingMember.id,
  };

  const durationMs = duration ? convertDelayStringToMS(duration)! : undefined;
  const result = await modactions.banUserId(target, reason, reason, { caseArgs }, durationMs);
  if (result.status === "failed") {
    await interactionToReply
      .editReply({ content: "Error: Failed to ban user", embeds: [], components: [] })
      .catch((err) => logger.error(`Ban interaction reply failed: ${err}`));
    return;
  }

  const userName = renderUserUsername(targetMember.user);
  const messageResultText = result.notifyResult.text ? ` (${result.notifyResult.text})` : "";
  const banMessage = `Banned **${userName}** ${
    durationMs ? `for ${humanizeDuration(durationMs)}` : "indefinitely"
  } (Case #${result.case.case_number})${messageResultText}`;

  if (evidence) {
    await updateAction(pluginData, executingMember, result.case, evidence);
  }

  await interactionToReply
    .editReply({ content: banMessage, embeds: [], components: [] })
    .catch((err) => logger.error(`Ban interaction reply failed: ${err}`));
}

export async function launchBanActionModal(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ButtonInteraction | ContextMenuCommandInteraction,
  target: string,
) {
  const modalId = `${ModMenuActionType.BAN}:${interaction.id}`;
  const modal = new ModalBuilder().setCustomId(modalId).setTitle("Ban");
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
  const evidenceIn = new TextInputBuilder()
    .setCustomId("evidence")
    .setLabel("Evidence (Optional)")
    .setRequired(false)
    .setStyle(TextInputStyle.Paragraph);
  const durationRow = new ActionRowBuilder<TextInputBuilder>().addComponents(durationIn);
  const reasonRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonIn);
  const evidenceRow = new ActionRowBuilder<TextInputBuilder>().addComponents(evidenceIn);
  modal.addComponents(durationRow, reasonRow, evidenceRow);

  await interaction.showModal(modal);
  await interaction
    .awaitModalSubmit({ time: MODAL_TIMEOUT, filter: (i) => i.customId == modalId })
    .then(async (submitted) => {
      if (interaction.isButton()) {
        await submitted.deferUpdate().catch((err) => logger.error(`Ban interaction defer failed: ${err}`));
      } else if (interaction.isContextMenuCommand()) {
        await submitted
          .deferReply({ ephemeral: true })
          .catch((err) => logger.error(`Ban interaction defer failed: ${err}`));
      }

      const duration = submitted.fields.getTextInputValue("duration");
      const reason = submitted.fields.getTextInputValue("reason");
      const evidence = submitted.fields.getTextInputValue("evidence");

      await banAction(pluginData, duration, reason, evidence, target, interaction, submitted);
    })
    .catch((err) => logger.error(`Ban modal interaction failed: ${err}`));
}
