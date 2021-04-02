import * as t from "io-ts";
import { tNullable, UnknownUser } from "../../utils";
import { BasePluginType, CooldownManager } from "knub";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildLogs } from "../../data/GuildLogs";
import { SavedMessage } from "../../data/entities/SavedMessage";
import { Member, User } from "eris";
import { AvailableTriggers } from "./triggers/availableTriggers";
import { AvailableActions } from "./actions/availableActions";
import { Queue } from "../../Queue";
import { GuildAntiraidLevels } from "../../data/GuildAntiraidLevels";
import { GuildArchives } from "../../data/GuildArchives";
import { RecentActionType } from "./constants";
import Timeout = NodeJS.Timeout;
import { RegExpRunner } from "../../RegExpRunner";
import { CounterEvents } from "../Counters/types";
import { ModActionsEvents, ModActionType } from "../ModActions/types";
import { MutesEvents } from "../Mutes/types";

export const Rule = t.type({
  enabled: t.boolean,
  name: t.string,
  presets: tNullable(t.array(t.string)),
  affects_bots: t.boolean,
  triggers: t.array(t.partial(AvailableTriggers.props)),
  actions: t.partial(AvailableActions.props),
  cooldown: tNullable(t.string),
});
export type TRule = t.TypeOf<typeof Rule>;

export const ConfigSchema = t.type({
  rules: t.record(t.string, Rule),
  antiraid_levels: t.array(t.string),
  can_set_antiraid: t.boolean,
  can_view_antiraid: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface AutomodPluginType extends BasePluginType {
  config: TConfigSchema;

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
  member?: Member;
  joined?: boolean;
  rolesChanged?: {
    added?: string[];
    removed?: string[];
  };
  modAction?: {
    type: ModActionType;
    reason?: string;
  };
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
