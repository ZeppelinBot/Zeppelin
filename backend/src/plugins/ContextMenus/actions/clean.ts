import {
  ActionRowBuilder,
  Message,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { GuildPluginData } from "vety";
import { logger } from "../../../logger.js";
import { UtilityPlugin } from "../../../plugins/Utility/UtilityPlugin.js";
import { MODAL_TIMEOUT } from "../commands/ModMenuUserCtxCmd.js";
import { ContextMenuPluginType, ModMenuActionType } from "../types.js";

export async function cleanAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  amount: number,
  target: string,
  targetMessage: Message,
  targetChannelId: string,
  interaction: ModalSubmitInteraction,
) {
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });
  const utility = pluginData.getPlugin(UtilityPlugin);

  if (!userCfg.can_use || !(await utility.hasPermission(executingMember, targetChannelId, "can_clean"))) {
    await interaction
      .editReply({ content: "Cannot clean: insufficient permissions", embeds: [], components: [] })
      .catch((err) => logger.error(`Clean interaction reply failed: ${err}`));
    return;
  }

  const targetChannel = await pluginData.guild.channels.fetch(targetChannelId);
  if (!targetChannel?.isTextBased()) {
    await interaction
      .editReply({ content: "Cannot clean: target channel is not a text channel", embeds: [], components: [] })
      .catch((err) => logger.error(`Clean interaction reply failed: ${err}`));
    return;
  }

  await interaction
    .editReply({
      content: `Cleaning ${amount} messages from ${target}...`,
      embeds: [],
      components: [],
    })
    .catch((err) => logger.error(`Clean interaction reply failed: ${err}`));

  const fetchMessagesResult = await utility.fetchChannelMessagesToClean(targetChannel, {
    count: amount,
    beforeId: targetMessage.id,
  });
  if ("error" in fetchMessagesResult) {
    interaction.editReply(fetchMessagesResult.error);
    return;
  }

  if (fetchMessagesResult.messages.length > 0) {
    await utility.cleanMessages(targetChannel, fetchMessagesResult.messages, interaction.user);
    interaction.editReply(
      `Cleaned ${fetchMessagesResult.messages.length} ${
        fetchMessagesResult.messages.length === 1 ? "message" : "messages"
      }`,
    );
  } else {
    interaction.editReply("No messages to clean");
  }
}

export async function launchCleanActionModal(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: MessageContextMenuCommandInteraction,
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
      await submitted.deferReply({ ephemeral: true });

      const amount = submitted.fields.getTextInputValue("amount");
      if (isNaN(Number(amount))) {
        interaction.editReply({ content: `Error: Amount '${amount}' is invalid`, embeds: [], components: [] });
        return;
      }

      await cleanAction(
        pluginData,
        Number(amount),
        target,
        interaction.targetMessage,
        interaction.channelId,
        submitted,
      );
    });
}
