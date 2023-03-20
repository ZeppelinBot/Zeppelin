import { GuildTextBasedChannel, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { performance } from "perf_hooks";
import { calculateBlocking, profilingEnabled } from "../../../utils/easyProfiler";
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

  const channelIdOrThreadId = context.message?.channel_id;
  const channelOrThread =
    context.channel ??
    (channelIdOrThreadId
      ? (pluginData.guild.channels.cache.get(channelIdOrThreadId as Snowflake) as GuildTextBasedChannel)
      : null);
  const channelId = channelOrThread?.isThread() ? channelOrThread.parent?.id : channelIdOrThreadId;
  const threadId = channelOrThread?.isThread() ? channelOrThread.id : null;
  const channel = channelOrThread?.isThread() ? channelOrThread.parent : channelOrThread;
  const categoryId = channel?.parentId;

  const config = await pluginData.config.getMatchingConfig({
    channelId,
    categoryId,
    threadId,
    userId,
    member,
  });

  for (const [ruleName, rule] of Object.entries(config.rules)) {
    if (rule.enabled === false) continue;
    if (
      !rule.affects_bots &&
      (!user || user.bot) &&
      !context.counterTrigger &&
      !context.antiraid &&
      !context.threadChange?.deleted
    ) {
      continue;
    }
    if (!rule.affects_self && userId && userId === pluginData.client.user?.id) continue;

    if (rule.cooldown && checkAndUpdateCooldown(pluginData, rule, context)) {
      continue;
    }

    const ruleStartTime = performance.now();

    let matchResult: AutomodTriggerMatchResult<any> | null | undefined;
    let contexts: AutomodContext[] = [];

    triggerLoop: for (const triggerItem of rule.triggers) {
      for (const [triggerName, triggerConfig] of Object.entries(triggerItem)) {
        const triggerStartTime = performance.now();

        const trigger = availableTriggers[triggerName];

        let getBlockingTime: ReturnType<typeof calculateBlocking> | null = null;
        if (profilingEnabled()) {
          getBlockingTime = calculateBlocking();
        }

        matchResult = await trigger.match({
          ruleName,
          pluginData,
          context,
          triggerConfig,
        });

        if (profilingEnabled()) {
          const blockingTime = getBlockingTime?.() || 0;
          pluginData
            .getKnubInstance()
            .profiler.addDataPoint(
              `automod:${pluginData.guild.id}:${ruleName}:triggers:${triggerName}:blocking`,
              blockingTime,
            );
        }

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
        }

        if (profilingEnabled()) {
          pluginData
            .getKnubInstance()
            .profiler.addDataPoint(
              `automod:${pluginData.guild.id}:${ruleName}:triggers:${triggerName}`,
              performance.now() - triggerStartTime,
            );
        }

        if (matchResult) {
          break triggerLoop;
        }
      }
    }

    if (matchResult) {
      for (const [actionName, actionConfig] of Object.entries(rule.actions)) {
        if (actionConfig == null || actionConfig === false) {
          continue;
        }

        const actionStartTime = performance.now();

        const action = availableActions[actionName];

        action.apply({
          ruleName,
          pluginData,
          contexts,
          actionConfig,
          matchResult,
        });

        if (profilingEnabled()) {
          pluginData
            .getKnubInstance()
            .profiler.addDataPoint(
              `automod:${pluginData.guild.id}:${ruleName}:actions:${actionName}`,
              performance.now() - actionStartTime,
            );
        }
      }
    }

    if (profilingEnabled()) {
      pluginData
        .getKnubInstance()
        .profiler.addDataPoint(`automod:${pluginData.guild.id}:${ruleName}`, performance.now() - ruleStartTime);
    }

    if (matchResult && !rule.allow_further_rules) {
      break;
    }
  }
}
