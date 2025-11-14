import {
  ActionRowBuilder,
  ButtonInteraction,
  ContextMenuCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { GuildPluginData } from "vety";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError.js";
import { humanizeDuration } from "../../../humanizeDuration.js";
import { logger } from "../../../logger.js";
import { canActOn } from "../../../pluginUtils.js";
import { convertDelayStringToMS } from "../../../utils.js";
import { CaseArgs } from "../../Cases/types.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin.js";
import { MutesPlugin } from "../../Mutes/MutesPlugin.js";
import { MODAL_TIMEOUT } from "../commands/ModMenuUserCtxCmd.js";
import { ContextMenuPluginType, ModMenuActionType } from "../types.js";
import { updateAction } from "./update.js";

async function muteAction(
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
  if (!userCfg.can_use || !(await modactions.hasMutePermission(executingMember, interaction.channelId))) {
    await interactionToReply.editReply({
      content: "Cannot mute: insufficient permissions",
      embeds: [],
      components: [],
    });
    return;
  }

  const targetMember = await pluginData.guild.members.fetch(target);
  if (!canActOn(pluginData, executingMember, targetMember)) {
    await interactionToReply.editReply({
      content: "Cannot mute: insufficient permissions",
      embeds: [],
      components: [],
    });
    return;
  }

  const caseArgs: Partial<CaseArgs> = {
    modId: executingMember.id,
  };
  const mutes = pluginData.getPlugin(MutesPlugin);
  const durationMs = duration ? convertDelayStringToMS(duration)! : undefined;

  try {
    const result = await mutes.muteUser(target, durationMs, reason, reason, { caseArgs });
    const messageResultText = result.notifyResult.text ? ` (${result.notifyResult.text})` : "";
    const muteMessage = `Muted **${result.case!.user_name}** ${
      durationMs ? `for ${humanizeDuration(durationMs)}` : "indefinitely"
    } (Case #${result.case!.case_number})${messageResultText}`;

    if (evidence) {
      await updateAction(pluginData, executingMember, result.case!, evidence);
    }

    await interactionToReply.editReply({ content: muteMessage, embeds: [], components: [] });
  } catch (e) {
    await interactionToReply.editReply({
      content: "Plugin error, please check your BOT_ALERTs",
      embeds: [],
      components: [],
    });

    if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Failed to mute <@!${target}> in ContextMenu action \`mute\` because a mute role has not been specified in server config`,
      });
    } else {
      throw e;
    }
  }
}

export async function launchMuteActionModal(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ButtonInteraction | ContextMenuCommandInteraction,
  target: string,
) {
  const modalId = `${ModMenuActionType.MUTE}:${interaction.id}`;
  const modal = new ModalBuilder().setCustomId(modalId).setTitle("Mute");
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
        await submitted.deferUpdate().catch((err) => logger.error(`Mute interaction defer failed: ${err}`));
      } else if (interaction.isContextMenuCommand()) {
        await submitted.deferReply({ ephemeral: true });
      }

      const duration = submitted.fields.getTextInputValue("duration");
      const reason = submitted.fields.getTextInputValue("reason");
      const evidence = submitted.fields.getTextInputValue("evidence");

      await muteAction(pluginData, duration, reason, evidence, target, interaction, submitted);
    });
}
