import { GuildTextBasedChannel } from "discord.js";
import { EventEmitter } from "events";
import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand } from "knub";
import z from "zod";
import { Queue } from "../../Queue.js";
import { GuildCases } from "../../data/GuildCases.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildMutes } from "../../data/GuildMutes.js";
import { GuildTempbans } from "../../data/GuildTempbans.js";
import { Case } from "../../data/entities/Case.js";
import { UserNotificationMethod, UserNotificationResult } from "../../utils.js";
import { CaseArgs } from "../Cases/types.js";

export const zModActionsConfig = z.strictObject({
  dm_on_warn: z.boolean(),
  dm_on_kick: z.boolean(),
  dm_on_ban: z.boolean(),
  message_on_warn: z.boolean(),
  message_on_kick: z.boolean(),
  message_on_ban: z.boolean(),
  message_channel: z.nullable(z.string()),
  warn_message: z.nullable(z.string()),
  kick_message: z.nullable(z.string()),
  ban_message: z.nullable(z.string()),
  tempban_message: z.nullable(z.string()),
  alert_on_rejoin: z.boolean(),
  alert_channel: z.nullable(z.string()),
  warn_notify_enabled: z.boolean(),
  warn_notify_threshold: z.number(),
  warn_notify_message: z.string(),
  ban_delete_message_days: z.number(),
  can_note: z.boolean(),
  can_warn: z.boolean(),
  can_mute: z.boolean(),
  can_kick: z.boolean(),
  can_ban: z.boolean(),
  can_unban: z.boolean(),
  can_view: z.boolean(),
  can_addcase: z.boolean(),
  can_massunban: z.boolean(),
  can_massban: z.boolean(),
  can_massmute: z.boolean(),
  can_hidecase: z.boolean(),
  can_deletecase: z.boolean(),
  can_act_as_other: z.boolean(),
  create_cases_for_manual_actions: z.boolean(),
});

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
  config: z.infer<typeof zModActionsConfig>;
  state: {
    mutes: GuildMutes;
    cases: GuildCases;
    tempbans: GuildTempbans;
    serverLogs: GuildLogs;

    unloaded: boolean;
    unregisterGuildEventListener: () => void;
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
  retryPromptChannel?: GuildTextBasedChannel | null;
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

export const modActionsCmd = guildPluginMessageCommand<ModActionsPluginType>();
export const modActionsEvt = guildPluginEventListener<ModActionsPluginType>();
