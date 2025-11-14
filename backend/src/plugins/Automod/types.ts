import { GuildMember, GuildTextBasedChannel, PartialGuildMember, ThreadChannel, User } from "discord.js";
import { BasePluginType, CooldownManager, pluginUtils } from "vety";
import { z } from "zod";
import { Queue } from "../../Queue.js";
import { RegExpRunner } from "../../RegExpRunner.js";
import { GuildAntiraidLevels } from "../../data/GuildAntiraidLevels.js";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { SavedMessage } from "../../data/entities/SavedMessage.js";
import { entries, zBoundedRecord, zDelayString } from "../../utils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { CounterEvents } from "../Counters/types.js";
import { ModActionType, ModActionsEvents } from "../ModActions/types.js";
import { MutesEvents } from "../Mutes/types.js";
import { availableActions } from "./actions/availableActions.js";
import { RecentActionType } from "./constants.js";
import { availableTriggers } from "./triggers/availableTriggers.js";

import Timeout = NodeJS.Timeout;

export type ZTriggersMapHelper = {
  [TriggerName in keyof typeof availableTriggers]: (typeof availableTriggers)[TriggerName]["configSchema"];
};
const zTriggersMap = z
  .strictObject(
    entries(availableTriggers).reduce((map, [triggerName, trigger]) => {
      map[triggerName] = trigger.configSchema;
      return map;
    }, {} as ZTriggersMapHelper),
  )
  .partial();

type ZActionsMapHelper = {
  [ActionName in keyof typeof availableActions]: (typeof availableActions)[ActionName]["configSchema"];
};
const zActionsMap = z
  .strictObject(
    entries(availableActions).reduce((map, [actionName, action]) => {
      // @ts-expect-error TS can't infer this properly but it works fine thanks to our helper
      map[actionName] = action.configSchema;
      return map;
    }, {} as ZActionsMapHelper),
  )
  .partial();

const zRule = z.strictObject({
  enabled: z.boolean().default(true),
  pretty_name: z.string().optional(),
  presets: z.array(z.string().max(100)).max(25).default([]),
  affects_bots: z.boolean().default(false),
  affects_self: z.boolean().default(false),
  cooldown: zDelayString.nullable().default(null),
  allow_further_rules: z.boolean().default(false),
  triggers: z.array(zTriggersMap),
  actions: zActionsMap,
});
export type TRule = z.infer<typeof zRule>;

export const zAutomodConfig = z.strictObject({
  rules: zBoundedRecord(z.record(z.string().max(100), zRule), 0, 255).default({}),
  antiraid_levels: z.array(z.string().max(100)).max(10).default(["low", "medium", "high"]),
  can_set_antiraid: z.boolean().default(false),
  can_view_antiraid: z.boolean().default(false),
  can_debug_automod: z.boolean().default(false),
});

export interface AutomodPluginType extends BasePluginType {
  configSchema: typeof zAutomodConfig;

  customOverrideCriteria: {
    antiraid_level?: string;
  };

  state: {
    /**
     * Automod checks/actions are handled in a queue so we don't get overlap on the same user
     */
    queue: Queue;

    /**
     * Per-server regex runner
     */
    regexRunner: RegExpRunner;

    /**
     * Recent actions are used for spam triggers
     */
    recentActions: RecentAction[];
    clearRecentActionsInterval: Timeout;

    /**
     * After a spam trigger is tripped and the rule's action carried out, a unique identifier is placed here so further
     * spam (either messages that were sent before the bot managed to mute the user or, with global spam, other users
     * continuing to spam) is "included" in the same match and doesn't generate duplicate cases or logs.
     * Key: rule_name-match_identifier
     */
    recentSpam: RecentSpam[];
    clearRecentSpamInterval: Timeout;

    recentNicknameChanges: Map<string, { timestamp: number }>;
    clearRecentNicknameChangesInterval: Timeout;

    ignoredRoleChanges: Set<{
      memberId: string;
      roleId: string;
      timestamp: number;
    }>;

    cachedAntiraidLevel: string | null;

    cooldownManager: CooldownManager;

    savedMessages: GuildSavedMessages;
    logs: GuildLogs;
    antiraidLevels: GuildAntiraidLevels;
    archives: GuildArchives;

    onMessageCreateFn: any;
    onMessageUpdateFn: any;

    onCounterTrigger: CounterEvents["trigger"];
    onCounterReverseTrigger: CounterEvents["reverseTrigger"];

    modActionsListeners: Map<keyof ModActionsEvents, any>;
    mutesListeners: Map<keyof MutesEvents, any>;

    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export interface AutomodContext {
  timestamp: number;
  actioned?: boolean;

  counterTrigger?: {
    counter: string;
    trigger: string;
    prettyCounter: string;
    prettyTrigger: string;
    channelId: string | null;
    userId: string | null;
    reverse: boolean;
  };
  user?: User;
  message?: SavedMessage;
  member?: GuildMember;
  partialMember?: GuildMember | PartialGuildMember;
  joined?: boolean;
  rolesChanged?: {
    added?: string[];
    removed?: string[];
  };
  modAction?: {
    type: ModActionType;
    reason?: string;
    isAutomodAction: boolean;
  };
  antiraid?: {
    level: string | null;
    oldLevel?: string | null;
  };
  threadChange?: {
    created?: ThreadChannel;
    deleted?: ThreadChannel;
    archived?: ThreadChannel;
    unarchived?: ThreadChannel;
    locked?: ThreadChannel;
    unlocked?: ThreadChannel;
  };
  channel?: GuildTextBasedChannel;
}

export interface RecentAction {
  type: RecentActionType;
  identifier: string | null;
  count: number;
  context: AutomodContext;
}

export interface RecentSpam {
  archiveId: string | null;
  type: RecentActionType;
  identifiers: string[];
  timestamp: number;
}
