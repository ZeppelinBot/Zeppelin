import { GuildMember } from "discord.js";
import { EventEmitter } from "events";
import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildCases } from "../../data/GuildCases.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildMutes } from "../../data/GuildMutes.js";
import { Case } from "../../data/entities/Case.js";
import { Mute } from "../../data/entities/Mute.js";
import { UserNotificationMethod, UserNotificationResult, zSnowflake } from "../../utils.js";
import { CaseArgs } from "../Cases/types.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

export const zMutesConfig = z.strictObject({
  mute_role: zSnowflake.nullable().default(null),
  move_to_voice_channel: zSnowflake.nullable().default(null),
  kick_from_voice_channel: z.boolean().default(false),

  dm_on_mute: z.boolean().default(false),
  dm_on_update: z.boolean().default(false),
  message_on_mute: z.boolean().default(false),
  message_on_update: z.boolean().default(false),
  message_channel: z.string().nullable().default(null),
  mute_message: z.string().nullable().default("You have been muted on the {guildName} server. Reason given: {reason}"),
  timed_mute_message: z
    .string()
    .nullable()
    .default("You have been muted on the {guildName} server for {time}. Reason given: {reason}"),
  update_mute_message: z.string().nullable().default("Your mute on the {guildName} server has been updated to {time}."),
  remove_roles_on_mute: z.union([z.boolean(), z.array(zSnowflake)]).default(false),
  restore_roles_on_mute: z.union([z.boolean(), z.array(zSnowflake)]).default(false),

  can_view_list: z.boolean().default(false),
  can_cleanup: z.boolean().default(false),
});

export interface MutesEvents {
  mute: (userId: string, reason?: string, isAutomodAction?: boolean) => void;
  unmute: (userId: string, reason?: string) => void;
}

export interface MutesEventEmitter extends EventEmitter {
  on<U extends keyof MutesEvents>(event: U, listener: MutesEvents[U]): this;
  emit<U extends keyof MutesEvents>(event: U, ...args: Parameters<MutesEvents[U]>): boolean;
}

export interface MutesPluginType extends BasePluginType {
  configSchema: typeof zMutesConfig;
  state: {
    mutes: GuildMutes;
    cases: GuildCases;
    serverLogs: GuildLogs;
    archives: GuildArchives;

    unregisterExpiredRoleMuteListener: () => void;
    unregisterTimeoutMuteToRenewListener: () => void;

    events: MutesEventEmitter;

    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export interface IMuteWithDetails extends Mute {
  member?: GuildMember;
  banned?: boolean;
}

export type MuteResult = {
  case: Case;
  notifyResult: UserNotificationResult;
  updatedExistingMute: boolean;
};

export type UnmuteResult = {
  case: Case;
};

export interface MuteOptions {
  caseArgs?: Partial<CaseArgs>;
  contactMethods?: UserNotificationMethod[];
  isAutomodAction?: boolean;
}

export const mutesCmd = guildPluginMessageCommand<MutesPluginType>();
export const mutesEvt = guildPluginEventListener<MutesPluginType>();
