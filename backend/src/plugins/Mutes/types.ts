import { GuildMember } from "discord.js";
import { EventEmitter } from "events";
import { BasePluginType, guildPluginEventListener, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildMutes } from "../../data/GuildMutes";
import { Case } from "../../data/entities/Case";
import { Mute } from "../../data/entities/Mute";
import { UserNotificationMethod, UserNotificationResult, zSnowflake } from "../../utils";
import { CaseArgs } from "../Cases/types";
import { CommonPlugin } from "../Common/CommonPlugin";

export const zMutesConfig = z.strictObject({
  mute_role: zSnowflake.nullable(),
  move_to_voice_channel: zSnowflake.nullable(),
  kick_from_voice_channel: z.boolean(),

  dm_on_mute: z.boolean(),
  dm_on_update: z.boolean(),
  message_on_mute: z.boolean(),
  message_on_update: z.boolean(),
  message_channel: z.string().nullable(),
  mute_message: z.string().nullable(),
  timed_mute_message: z.string().nullable(),
  update_mute_message: z.string().nullable(),
  remove_roles_on_mute: z.union([z.boolean(), z.array(zSnowflake)]).default(false),
  restore_roles_on_mute: z.union([z.boolean(), z.array(zSnowflake)]).default(false),

  can_view_list: z.boolean(),
  can_cleanup: z.boolean(),
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
  config: z.infer<typeof zMutesConfig>;
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
