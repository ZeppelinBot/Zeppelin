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
import { CaseTypes } from "../../../data/CaseTypes.js";
import { logger } from "../../../logger.js";
import { canActOn } from "../../../pluginUtils.js";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin.js";
import { renderUserUsername } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin.js";
import { MODAL_TIMEOUT } from "../commands/ModMenuUserCtxCmd.js";
import { ContextMenuPluginType, ModMenuActionType } from "../types.js";

async function noteAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  reason: string,
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
  if (!userCfg.can_use || !(await modactions.hasNotePermission(executingMember, interaction.channelId))) {
    await interactionToReply.editReply({
      content: "Cannot note: insufficient permissions",
      embeds: [],
      components: [],
    });
    return;
  }

  const targetMember = await pluginData.guild.members.fetch(target);
  if (!canActOn(pluginData, executingMember, targetMember)) {
    await interactionToReply.editReply({
      content: "Cannot note: insufficient permissions",
      embeds: [],
      components: [],
    });
    return;
  }

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    userId: target,
    modId: executingMember.id,
    type: CaseTypes.Note,
    reason,
  });

  pluginData.getPlugin(LogsPlugin).logMemberNote({
    mod: interaction.user,
    user: targetMember.user,
    caseNumber: createdCase.case_number,
    reason,
  });

  const userName = renderUserUsername(targetMember.user);
  await interactionToReply.editReply({
    content: `Note added on **${userName}** (Case #${createdCase.case_number})`,
    embeds: [],
    components: [],
  });
}

export async function launchNoteActionModal(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ButtonInteraction | ContextMenuCommandInteraction,
  target: string,
) {
  const modalId = `${ModMenuActionType.NOTE}:${interaction.id}`;
  const modal = new ModalBuilder().setCustomId(modalId).setTitle("Note");
  const reasonIn = new TextInputBuilder().setCustomId("reason").setLabel("Note").setStyle(TextInputStyle.Paragraph);
  const reasonRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonIn);
  modal.addComponents(reasonRow);

  await interaction.showModal(modal);
  await interaction
    .awaitModalSubmit({ time: MODAL_TIMEOUT, filter: (i) => i.customId == modalId })
    .then(async (submitted) => {
      if (interaction.isButton()) {
        await submitted.deferUpdate().catch((err) => logger.error(`Note interaction defer failed: ${err}`));
      } else if (interaction.isContextMenuCommand()) {
        await submitted.deferReply({ ephemeral: true });
      }

      const reason = submitted.fields.getTextInputValue("reason");

      await noteAction(pluginData, reason, target, interaction, submitted);
    });
}
