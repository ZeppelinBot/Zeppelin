import * as t from "io-ts";
import { tNullable, UserNotificationMethod, UserNotificationResult } from "../../utils";
import { Mute } from "../../data/entities/Mute";
import { Member } from "eris";
import { Case } from "../../data/entities/Case";
import { BasePluginType, guildCommand, guildEventListener } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildCases } from "../../data/GuildCases";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildMutes } from "../../data/GuildMutes";
import { CaseArgs } from "../Cases/types";
import Timeout = NodeJS.Timeout;
import { EventEmitter } from "events";

export const ConfigSchema = t.type({
  mute_role: tNullable(t.string),
  move_to_voice_channel: tNullable(t.string),
  kick_from_voice_channel: t.boolean,

  dm_on_mute: t.boolean,
  dm_on_update: t.boolean,
  message_on_mute: t.boolean,
  message_on_update: t.boolean,
  message_channel: tNullable(t.string),
  mute_message: tNullable(t.string),
  timed_mute_message: tNullable(t.string),
  update_mute_message: tNullable(t.string),
  remove_roles_on_mute: t.union([t.boolean, t.array(t.string)]),
  restore_roles_on_mute: t.union([t.boolean, t.array(t.string)]),

  can_view_list: t.boolean,
  can_cleanup: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface MutesEvents {
  mute: (userId: string, reason?: string, isAutomodAction?: boolean) => void;
  unmute: (userId: string, reason?: string) => void;
}

export interface MutesEventEmitter extends EventEmitter {
  on<U extends keyof MutesEvents>(event: U, listener: MutesEvents[U]): this;
  emit<U extends keyof MutesEvents>(event: U, ...args: Parameters<MutesEvents[U]>): boolean;
}

export interface MutesPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    mutes: GuildMutes;
    cases: GuildCases;
    serverLogs: GuildLogs;
    archives: GuildArchives;

    muteClearIntervalId: Timeout;

    events: MutesEventEmitter;
  };
}

export interface IMuteWithDetails extends Mute {
  member?: Member;
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

export const mutesCmd = guildCommand<MutesPluginType>();
export const mutesEvt = guildEventListener<MutesPluginType>();
