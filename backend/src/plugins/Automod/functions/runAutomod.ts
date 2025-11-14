import { GuildTextBasedChannel, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { performance } from "perf_hooks";
import { calculateBlocking, profilingEnabled } from "../../../utils/easyProfiler.js";
import { availableActions } from "../actions/availableActions.js";
import { CleanAction } from "../actions/clean.js";
import { AutomodTriggerBlueprint, AutomodTriggerMatchResult } from "../helpers.js";
import { availableTriggers } from "../triggers/availableTriggers.js";
import { AutomodContext, AutomodPluginType, TRule } from "../types.js";
import { applyCooldown } from "./applyCooldown.js";
import { checkCooldown } from "./checkCooldown.js";

const ruleFailReason = {
  disabled: "rule is disabled",
  cooldown: "rule is on cooldown",
  doesNotAffectBots: "rule does not affect bots",
  doesNotAffectSelf: "rule does not affect self",
  unknownUser: "rule does not affect bots, and user is unknown",
  noMatch: "no triggers matched",
};

interface MatchedTriggerResult {
  name: string;
  num: number;
  config: AutomodTriggerBlueprint<any, any>;
}

interface RuleResultOutcomeSuccess {
  success: true;
  matchedTrigger: MatchedTriggerResult;
}

interface RuleResultOutcomeFailure {
  success: false;
  reason: (typeof ruleFailReason)[keyof typeof ruleFailReason];
}

type RuleResultOutcome = RuleResultOutcomeSuccess | RuleResultOutcomeFailure;

interface RuleResult {
  ruleName: string;
  config: TRule;
  outcome: RuleResultOutcome;
}

interface AutomodRunResult {
  triggered: boolean;
  rulesChecked: RuleResult[];
}

export async function runAutomod(
  pluginData: GuildPluginData<AutomodPluginType>,
  context: AutomodContext,
  dryRun = false,
): Promise<AutomodRunResult> {
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

  const result: AutomodRunResult = {
    triggered: false,
    rulesChecked: [],
  };

  for (const [ruleName, rule] of Object.entries(config.rules)) {
    const prettyName = rule.pretty_name;

    const ruleResult: RuleResult = {
      ruleName,
      config: rule,
      outcome: { success: false, reason: ruleFailReason.noMatch },
    };
    result.rulesChecked.push(ruleResult);

    if (rule.enabled === false) {
      ruleResult.outcome = { success: false, reason: ruleFailReason.disabled };
      continue;
    }
    if (
      !rule.affects_bots &&
      (!user || user.bot) &&
      !context.counterTrigger &&
      !context.antiraid &&
      !context.threadChange?.deleted
    ) {
      if (user) {
        ruleResult.outcome = { success: false, reason: ruleFailReason.doesNotAffectBots };
      } else {
        ruleResult.outcome = { success: false, reason: ruleFailReason.unknownUser };
      }
      continue;
    }
    if (!rule.affects_self && userId && userId === pluginData.client.user?.id) {
      ruleResult.outcome = { success: false, reason: ruleFailReason.doesNotAffectSelf };
      continue;
    }

    if (rule.cooldown && checkCooldown(pluginData, rule, ruleName, context)) {
      ruleResult.outcome = { success: false, reason: ruleFailReason.cooldown };
      continue;
    }

    const ruleStartTime = performance.now();

    let matchResult: AutomodTriggerMatchResult<any> | null | undefined;
    let contexts: AutomodContext[] = [];

    let triggerNum = 0;
    triggerLoop: for (const triggerItem of rule.triggers) {
      for (const [triggerName, triggerConfig] of Object.entries(triggerItem)) {
        const triggerStartTime = performance.now();

        const trigger = availableTriggers[triggerName];
        triggerNum++;

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
            .getVetyInstance()
            .profiler.addDataPoint(
              `automod:${pluginData.guild.id}:${ruleName}:triggers:${triggerName}:blocking`,
              blockingTime,
            );
        }

        if (matchResult) {
          if (rule.cooldown) applyCooldown(pluginData, rule, ruleName, context);

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
              prettyName,
            });
            return result;
          }

          matchResult.summary =
            (await trigger.renderMatchInformation({
              ruleName,
              pluginData,
              contexts,
              matchResult,
              triggerConfig,
            })) ?? "";

          matchResult.fullSummary = `Triggered automod rule **${prettyName ?? ruleName}**\n${
            matchResult.summary
          }`.trim();
        }

        if (profilingEnabled()) {
          pluginData
            .getVetyInstance()
            .profiler.addDataPoint(
              `automod:${pluginData.guild.id}:${ruleName}:triggers:${triggerName}`,
              performance.now() - triggerStartTime,
            );
        }

        if (matchResult) {
          ruleResult.outcome = {
            success: true,
            matchedTrigger: {
              name: triggerName,
              num: triggerNum,
              config: trigger,
            },
          };

          break triggerLoop;
        }
      }
    }

    if (matchResult && !dryRun) {
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
          prettyName,
        });

        if (profilingEnabled()) {
          pluginData
            .getVetyInstance()
            .profiler.addDataPoint(
              `automod:${pluginData.guild.id}:${ruleName}:actions:${actionName}`,
              performance.now() - actionStartTime,
            );
        }
      }

      // Log all automod rules by default
      if (rule.actions.log == null) {
        availableActions.log.apply({
          ruleName,
          pluginData,
          contexts,
          actionConfig: true,
          matchResult,
          prettyName,
        });
      }
    }

    if (profilingEnabled()) {
      pluginData
        .getVetyInstance()
        .profiler.addDataPoint(`automod:${pluginData.guild.id}:${ruleName}`, performance.now() - ruleStartTime);
    }

    if (matchResult && !rule.allow_further_rules) {
      break;
    }
  }

  return result;
}
