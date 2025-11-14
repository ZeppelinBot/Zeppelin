import { ChatInputCommandInteraction, Message } from "discord.js";
import { EventEmitter } from "events";
import {
  BasePluginType,
  guildPluginEventListener,
  guildPluginMessageCommand,
  guildPluginSlashCommand,
  guildPluginSlashGroup,
  pluginUtils,
} from "vety";
import { z } from "zod";
import { Queue } from "../../Queue.js";
import { GuildCases } from "../../data/GuildCases.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildMutes } from "../../data/GuildMutes.js";
import { GuildTempbans } from "../../data/GuildTempbans.js";
import { Case } from "../../data/entities/Case.js";
import { UserNotificationMethod, UserNotificationResult } from "../../utils.js";
import { CaseArgs } from "../Cases/types.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export type AttachmentLinkReactionType = "none" | "warn" | "restrict" | null;

export const zModActionsConfig = z.strictObject({
  dm_on_warn: z.boolean().default(true),
  dm_on_kick: z.boolean().default(false),
  dm_on_ban: z.boolean().default(false),
  message_on_warn: z.boolean().default(false),
  message_on_kick: z.boolean().default(false),
  message_on_ban: z.boolean().default(false),
  message_channel: z.nullable(z.string()).default(null),
  warn_message: z.nullable(z.string()).default("You have received a warning on the {guildName} server: {reason}"),
  kick_message: z
    .nullable(z.string())
    .default("You have been kicked from the {guildName} server. Reason given: {reason}"),
  ban_message: z
    .nullable(z.string())
    .default("You have been banned from the {guildName} server. Reason given: {reason}"),
  tempban_message: z
    .nullable(z.string())
    .default("You have been banned from the {guildName} server for {banTime}. Reason given: {reason}"),
  alert_on_rejoin: z.boolean().default(false),
  alert_channel: z.nullable(z.string()).default(null),
  warn_notify_enabled: z.boolean().default(false),
  warn_notify_threshold: z.number().default(5),
  warn_notify_message: z
    .string()
    .default(
      "The user already has **{priorWarnings}** warnings!\n Please check their prior cases and assess whether or not to warn anyways.\n Proceed with the warning?",
    ),
  ban_delete_message_days: z.number().default(1),
  attachment_link_reaction: z
    .nullable(z.union([z.literal("none"), z.literal("warn"), z.literal("restrict")]))
    .default("warn"),
  can_note: z.boolean().default(false),
  can_warn: z.boolean().default(false),
  can_mute: z.boolean().default(false),
  can_kick: z.boolean().default(false),
  can_ban: z.boolean().default(false),
  can_unban: z.boolean().default(false),
  can_view: z.boolean().default(false),
  can_addcase: z.boolean().default(false),
  can_massunban: z.boolean().default(false),
  can_massban: z.boolean().default(false),
  can_massmute: z.boolean().default(false),
  can_hidecase: z.boolean().default(false),
  can_deletecase: z.boolean().default(false),
  can_act_as_other: z.boolean().default(false),
  create_cases_for_manual_actions: z.boolean().default(true),
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
  configSchema: typeof zModActionsConfig;
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

    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
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
  retryPromptContext?: Message | ChatInputCommandInteraction | null;
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

export const modActionsMsgCmd = guildPluginMessageCommand<ModActionsPluginType>();
export const modActionsSlashGroup = guildPluginSlashGroup<ModActionsPluginType>();
export const modActionsSlashCmd = guildPluginSlashCommand<ModActionsPluginType>();
export const modActionsEvt = guildPluginEventListener<ModActionsPluginType>();
