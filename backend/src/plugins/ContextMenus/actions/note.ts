import {
  ActionRowBuilder,
  ButtonInteraction,
  ContextMenuCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { GuildPluginData } from "knub";
import { canActOn } from "src/pluginUtils";
import { ModActionsPlugin } from "src/plugins/ModActions/ModActionsPlugin";
import { CaseTypes } from "../../../data/CaseTypes";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { renderUserUsername } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { MODAL_TIMEOUT } from "../commands/ModMenuUserCtxCmd";
import { ContextMenuPluginType } from "../types";

async function noteAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  reason: string,
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
  const modal = new ModalBuilder().setCustomId("note").setTitle("Note");
  const reasonIn = new TextInputBuilder().setCustomId("reason").setLabel("Note").setStyle(TextInputStyle.Paragraph);
  const reasonRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonIn);
  modal.addComponents(reasonRow);

  await interaction.showModal(modal);
  const submitted: ModalSubmitInteraction = await interaction.awaitModalSubmit({ time: MODAL_TIMEOUT });
  if (submitted) {
    if (interaction instanceof ButtonInteraction) {
      await submitted.deferUpdate();
    } else {
      await submitted.deferReply({ ephemeral: true });
    }

    const reason = submitted.fields.getTextInputValue("reason");

    await noteAction(pluginData, reason, target, interaction, submitted);
  }
}
