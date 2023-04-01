import { ContextMenuCommandInteraction } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { ModActionsPlugin } from "src/plugins/ModActions/ModActionsPlugin";
import { canActOn } from "src/pluginUtils";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { convertDelayStringToMS } from "../../../utils";
import { CaseArgs } from "../../Cases/types";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { MutesPlugin } from "../../Mutes/MutesPlugin";
import { ContextMenuPluginType } from "../types";

export async function muteAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  duration: string | undefined,
  interaction: ContextMenuCommandInteraction,
) {
  await interaction.deferReply({ ephemeral: true });
  const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
  const userCfg = await pluginData.config.getMatchingConfig({
    channelId: interaction.channelId,
    member: executingMember,
  });

  const modactions = pluginData.getPlugin(ModActionsPlugin);
  if (!userCfg.can_use || !(await modactions.hasMutePermission(executingMember, interaction.channelId))) {
    await interaction.followUp({ content: "Cannot mute: insufficient permissions" });
    return;
  }

  const durationMs = duration ? convertDelayStringToMS(duration)! : undefined;
  const mutes = pluginData.getPlugin(MutesPlugin);
  const userId = interaction.targetId;
  const targetMember = await pluginData.guild.members.fetch(interaction.targetId);

  if (!canActOn(pluginData, executingMember, targetMember)) {
    await interaction.followUp({ ephemeral: true, content: "Cannot mute: insufficient permissions" });
    return;
  }

  const caseArgs: Partial<CaseArgs> = {
    modId: executingMember.id,
  };

  try {
    const result = await mutes.muteUser(userId, durationMs, "Context Menu Action", { caseArgs });

    const muteMessage = `Muted **${result.case.user_name}** ${
      durationMs ? `for ${humanizeDuration(durationMs)}` : "indefinitely"
    } (Case #${result.case.case_number}) (user notified via ${
      result.notifyResult.method ?? "dm"
    })\nPlease update the new case with the \`update\` command`;

    await interaction.followUp({ ephemeral: true, content: muteMessage });
  } catch (e) {
    await interaction.followUp({ ephemeral: true, content: "Plugin error, please check your BOT_ALERTs" });

    if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Failed to mute <@!${userId}> in ContextMenu action \`mute\` because a mute role has not been specified in server config`,
      });
    } else {
      throw e;
    }
  }
}
