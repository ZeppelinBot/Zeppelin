import * as t from "io-ts";
import { tNullable, UserNotificationMethod, UserNotificationResult } from "../../utils";
import { Mute } from "../../data/entities/Mute";
import { Member } from "eris";
import { Case } from "../../data/entities/Case";
import { BasePluginType } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildCases } from "../../data/GuildCases";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildMutes } from "../../data/GuildMutes";
import Timeout = NodeJS.Timeout;
import { CaseArgs } from "../Cases/types";

export const ConfigSchema = t.type({
  mute_role: tNullable(t.string),
  move_to_voice_channel: tNullable(t.string),

  dm_on_mute: t.boolean,
  dm_on_update: t.boolean,
  message_on_mute: t.boolean,
  message_on_update: t.boolean,
  message_channel: tNullable(t.string),
  mute_message: tNullable(t.string),
  timed_mute_message: tNullable(t.string),
  update_mute_message: tNullable(t.string),

  can_view_list: t.boolean,
  can_cleanup: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface MutesPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    mutes: GuildMutes;
    cases: GuildCases;
    serverLogs: GuildLogs;
    archives: GuildArchives;

    muteClearIntervalId: Timeout;
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
}
