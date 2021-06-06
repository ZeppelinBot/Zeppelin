import { TextChannel } from "discord.js";
import { EventEmitter } from "events";
import * as t from "io-ts";
import { BasePluginType, typedGuildCommand, typedGuildEventListener } from "knub";
import { Case } from "../../data/entities/Case";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildMutes } from "../../data/GuildMutes";
import { GuildTempbans } from "../../data/GuildTempbans";
import { Queue } from "../../Queue";
import { tNullable, UserNotificationMethod, UserNotificationResult } from "../../utils";
import { CaseArgs } from "../Cases/types";

import Timeout = NodeJS.Timeout;

export const ConfigSchema = t.type({
  dm_on_warn: t.boolean,
  dm_on_kick: t.boolean,
  dm_on_ban: t.boolean,
  message_on_warn: t.boolean,
  message_on_kick: t.boolean,
  message_on_ban: t.boolean,
  message_channel: tNullable(t.string),
  warn_message: tNullable(t.string),
  kick_message: tNullable(t.string),
  ban_message: tNullable(t.string),
  tempban_message: tNullable(t.string),
  alert_on_rejoin: t.boolean,
  alert_channel: tNullable(t.string),
  warn_notify_enabled: t.boolean,
  warn_notify_threshold: t.number,
  warn_notify_message: t.string,
  ban_delete_message_days: t.number,
  can_note: t.boolean,
  can_warn: t.boolean,
  can_mute: t.boolean,
  can_kick: t.boolean,
  can_ban: t.boolean,
  can_unban: t.boolean,
  can_view: t.boolean,
  can_addcase: t.boolean,
  can_massunban: t.boolean,
  can_massban: t.boolean,
  can_massmute: t.boolean,
  can_hidecase: t.boolean,
  can_deletecase: t.boolean,
  can_act_as_other: t.boolean,
  create_cases_for_manual_actions: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface ModActionsEvents {
  note: (userId: string, reason?: string) => void;
  warn: (userId: string, reason?: string, isAutomodAction?: boolean) => void;
  kick: (userId: string, reason?: string, isAutomodAction?: boolean) => void;
  ban: (userId: string, reason?: string, isAutomodAction?: boolean) => void;
  unban: (userId: string, reason?: string) => void;
  // mute/unmute are in the Mutes plugin
}

export interface ModActionsEventEmitter extends EventEmitter {
  on<U extends keyof ModActionsEvents>(event: U, listener: ModActionsEvents[U]): this;
  emit<U extends keyof ModActionsEvents>(event: U, ...args: Parameters<ModActionsEvents[U]>): boolean;
}

export interface ModActionsPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    mutes: GuildMutes;
    cases: GuildCases;
    tempbans: GuildTempbans;
    serverLogs: GuildLogs;

    unloaded: boolean;
    outdatedTempbansTimeout: Timeout | null;
    ignoredEvents: IIgnoredEvent[];
    massbanQueue: Queue;

    events: ModActionsEventEmitter;
  };
}

export enum IgnoredEventType {
  Ban = 1,
  Unban,
  Kick,
}

export interface IIgnoredEvent {
  type: IgnoredEventType;
  userId: string;
}

export type WarnResult =
  | {
      status: "failed";
      error: string;
    }
  | {
      status: "success";
      case: Case;
      notifyResult: UserNotificationResult;
    };

export type KickResult =
  | {
      status: "failed";
      error: string;
    }
  | {
      status: "success";
      case: Case;
      notifyResult: UserNotificationResult;
    };

export type BanResult =
  | {
      status: "failed";
      error: string;
    }
  | {
      status: "success";
      case: Case;
      notifyResult: UserNotificationResult;
    };

export type WarnMemberNotifyRetryCallback = () => boolean | Promise<boolean>;

export interface WarnOptions {
  caseArgs?: Partial<CaseArgs> | null;
  contactMethods?: UserNotificationMethod[] | null;
  retryPromptChannel?: TextChannel | null;
  isAutomodAction?: boolean;
}

export interface KickOptions {
  caseArgs?: Partial<CaseArgs>;
  contactMethods?: UserNotificationMethod[];
  isAutomodAction?: boolean;
}

export interface BanOptions {
  caseArgs?: Partial<CaseArgs>;
  contactMethods?: UserNotificationMethod[];
  deleteMessageDays?: number;
  modId?: string;
  isAutomodAction?: boolean;
}

export type ModActionType = "note" | "warn" | "mute" | "unmute" | "kick" | "ban" | "unban";

export const modActionsCmd = typedGuildCommand<ModActionsPluginType>();
export const modActionsEvt = typedGuildEventListener<ModActionsPluginType>();
