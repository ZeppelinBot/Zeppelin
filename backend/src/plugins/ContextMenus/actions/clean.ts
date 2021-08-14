import { TextChannel } from "discord.js";
import * as t from "io-ts";
import { canActOn } from "src/pluginUtils";
import { LogType } from "../../../data/LogType";
import { UtilityPlugin } from "../../../plugins/Utility/UtilityPlugin";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { tNullable } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { contextMenuAction } from "../helpers";

export const CleanAction = contextMenuAction({
  configType: t.type({
    amount: tNullable(t.number),
    targetUserOnly: tNullable(t.boolean),
    "delete-pins": tNullable(t.boolean),
  }),

  defaultConfig: {
    amount: 10,
    targetUserOnly: false,
    "delete-pins": false,
  },

  async apply({ pluginData, actionConfig, actionName, interaction }) {
    interaction.deferReply({ ephemeral: true });
    const targetMessage = interaction.channel
      ? await interaction.channel.messages.fetch(interaction.targetId)
      : await (pluginData.guild.channels.resolve(interaction.channelId) as TextChannel).messages.fetch(
          interaction.targetId,
        );

    const amount = actionConfig.amount ?? 10;
    const targetUserOnly = actionConfig.targetUserOnly ?? false;
    const deletePins = actionConfig["delete-pins"] ?? false;

    const user = targetUserOnly ? targetMessage.author.id : undefined;
    const targetMember = await pluginData.guild.members.fetch(targetMessage.author.id);
    const executingMember = await pluginData.guild.members.fetch(interaction.user.id);
    const utility = pluginData.getPlugin(UtilityPlugin);

    if (targetUserOnly && !canActOn(pluginData, executingMember, targetMember)) {
      interaction.followUp({ ephemeral: true, content: "Cannot clean users messages: insufficient permissions" });
      return;
    }

    try {
      interaction.followUp(`Cleaning... Amount: ${amount}, User Only: ${targetUserOnly}, Pins: ${deletePins}`);
      utility.clean(
        { count: amount, user, channel: targetMessage.channel.id, "delete-pins": deletePins },
        targetMessage,
      );
    } catch (e) {
      interaction.followUp({ ephemeral: true, content: "Plugin error, please check your BOT_ALERTs" });

      if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
        pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
          body: `Failed to clean in <#${interaction.channelId}> in ContextMenu action \`${actionName}\``,
        });
      } else {
        throw e;
      }
    }
  },
});
