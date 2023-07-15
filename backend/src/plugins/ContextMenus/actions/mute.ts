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
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { convertDelayStringToMS } from "../../../utils";
import { CaseArgs } from "../../Cases/types";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { MutesPlugin } from "../../Mutes/MutesPlugin";
import { MODAL_TIMEOUT } from "../commands/ModMenuUserCtxCmd";
import { ContextMenuPluginType } from "../types";

async function muteAction(
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
    const result = await mutes.muteUser(target, durationMs, reason, { caseArgs });

    const messageResultText = result.notifyResult.text ? ` (${result.notifyResult.text})` : "";
    const muteMessage = `Muted **${result.case.user_name}** ${
      durationMs ? `for ${humanizeDuration(durationMs)}` : "indefinitely"
    } (Case #${result.case.case_number})${messageResultText}`;

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
  const modal = new ModalBuilder().setCustomId("mute").setTitle("Mute");
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

    await muteAction(pluginData, duration, reason, target, interaction, submitted);
  }
}
