import { ContextMenuCommandInteraction } from "discord.js";
import { GuildPluginData } from "knub";
import { UtilityPlugin } from "../../../plugins/Utility/UtilityPlugin";
import { ContextMenuPluginType } from "../types";

export async function userInfoAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ContextMenuCommandInteraction,
) {
  await interaction.deferReply({ ephemeral: true });
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });
  const utility = pluginData.getPlugin(UtilityPlugin);

  if (userCfg.can_use && (await utility.hasPermission(executingMember, interaction.channelId, "can_userinfo"))) {
    const embed = await utility.userInfo(interaction.targetId, interaction.user.id);
    if (!embed) {
      await interaction.followUp({ content: "Cannot info: internal error" });
      return;
    }
    await interaction.followUp({ embeds: [embed] });
  } else {
    await interaction.followUp({ content: "Cannot info: insufficient permissions" });
  }
}
