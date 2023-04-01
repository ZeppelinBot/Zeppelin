import { ContextMenuCommandInteraction, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { UtilityPlugin } from "../../../plugins/Utility/UtilityPlugin";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { ContextMenuPluginType } from "../types";

export async function cleanAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  amount: number,
  interaction: ContextMenuCommandInteraction,
) {
  await interaction.deferReply({ ephemeral: true });
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });
  const utility = pluginData.getPlugin(UtilityPlugin);

  if (!userCfg.can_use || !(await utility.hasPermission(executingMember, interaction.channelId, "can_clean"))) {
    await interaction.followUp({ content: "Cannot clean: insufficient permissions" });
    return;
  }

  const targetMessage = interaction.channel
    ? await interaction.channel.messages.fetch(interaction.targetId)
    : await (pluginData.guild.channels.resolve(interaction.channelId) as TextChannel).messages.fetch(
        interaction.targetId,
      );

  const targetUserOnly = false;
  const deletePins = false;
  const user = undefined;

  try {
    await interaction.followUp(`Cleaning... Amount: ${amount}, User Only: ${targetUserOnly}, Pins: ${deletePins}`);
    utility.clean({ count: amount, user, channel: targetMessage.channel.id, "delete-pins": deletePins }, targetMessage);
  } catch (e) {
    await interaction.followUp({ ephemeral: true, content: "Plugin error, please check your BOT_ALERTs" });

    if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Failed to clean in <#${interaction.channelId}> in ContextMenu action \`clean\`:_ ${e}`,
      });
    } else {
      throw e;
    }
  }
}
