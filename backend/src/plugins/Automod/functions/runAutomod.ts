import { Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { availableActions } from "../actions/availableActions";
import { CleanAction } from "../actions/clean";
import { AutomodTriggerMatchResult } from "../helpers";
import { availableTriggers } from "../triggers/availableTriggers";
import { AutomodContext, AutomodPluginType } from "../types";
import { checkAndUpdateCooldown } from "./checkAndUpdateCooldown";

export async function runAutomod(pluginData: GuildPluginData<AutomodPluginType>, context: AutomodContext) {
  const userId = context.user?.id || context.member?.id || context.message?.user_id;
  const user = context.user || (userId && pluginData.client.users!.cache.get(userId as Snowflake));
  const member = context.member || (userId && pluginData.guild.members.cache.get(userId as Snowflake)) || null;
  const channelId = context.message?.channel_id;
  const channel = channelId ? (pluginData.guild.channels.cache.get(channelId as Snowflake) as TextChannel) : null;
  const categoryId = channel?.parentId;

  const config = await pluginData.config.getMatchingConfig({
    channelId,
    categoryId,
    userId,
    member,
  });

  for (const [ruleName, rule] of Object.entries(config.rules)) {
    if (rule.enabled === false) continue;
    if (!rule.affects_bots && (!user || user.bot) && !context.counterTrigger && !context.antiraid) continue;

    if (rule.cooldown && checkAndUpdateCooldown(pluginData, rule, context)) {
      continue;
    }

    let matchResult: AutomodTriggerMatchResult<any> | null | undefined;
    let contexts: AutomodContext[] = [];

    triggerLoop: for (const triggerItem of rule.triggers) {
      for (const [triggerName, triggerConfig] of Object.entries(triggerItem)) {
        const trigger = availableTriggers[triggerName];
        matchResult = await trigger.match({
          ruleName,
          pluginData,
          context,
          triggerConfig,
        });

        if (matchResult) {
          contexts = [context, ...(matchResult.extraContexts || [])];

          for (const _context of contexts) {
            _context.actioned = true;
          }

          if (matchResult.silentClean) {
            await CleanAction.apply({
              ruleName,
              pluginData,
              contexts,
              actionConfig: true,
              matchResult,
            });
            return;
          }

          matchResult.summary =
            (await trigger.renderMatchInformation({
              ruleName,
              pluginData,
              contexts,
              matchResult,
              triggerConfig,
            })) ?? "";

          matchResult.fullSummary = `Triggered automod rule **${ruleName}**\n${matchResult.summary}`.trim();

          break triggerLoop;
        }
      }
    }

    if (matchResult) {
      for (const [actionName, actionConfig] of Object.entries(rule.actions)) {
        if (actionConfig == null || actionConfig === false) {
          continue;
        }

        const action = availableActions[actionName];

        action.apply({
          ruleName,
          pluginData,
          contexts,
          actionConfig,
          matchResult,
        });
      }

      break;
    }
  }
}
