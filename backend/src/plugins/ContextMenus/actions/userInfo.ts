import { GuildPluginData } from "knub";
import { UtilityPlugin } from "../../../plugins/Utility/UtilityPlugin";
import { ContextMenuPluginType } from "../types";

export async function userInfoAction(pluginData: GuildPluginData<ContextMenuPluginType>, interaction) {
  interaction.deferReply({ ephemeral: true });
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });

  // TODO: Add can_userinfo perm check
  if (userCfg.can_use) {
    const util = pluginData.getPlugin(UtilityPlugin);
    const embed = await util.userInfo(interaction.targetId, interaction.user.id);
    await interaction.followUp({ embeds: [embed] });
  } else {
    await interaction.followUp({ content: "Cannot info: insufficient permissions" });
  }
}
