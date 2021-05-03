import * as t from "io-ts";
import { tDelayString, tPartialDictionary, tNullable } from "../../utils";
import { CaseNameToType, CaseTypes } from "../../data/CaseTypes";
import { BasePluginType, guildCommand, guildEventListener } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildCases } from "../../data/GuildCases";
import { GuildArchives } from "../../data/GuildArchives";
import { tColor } from "../../utils/tColor";

export const ConfigSchema = t.type({
  log_automatic_actions: t.boolean,
  case_log_channel: tNullable(t.string),
  show_relative_times: t.boolean,
  relative_time_cutoff: tDelayString,
  case_colors: tNullable(tPartialDictionary(t.keyof(CaseNameToType), tColor)),
  case_icons: tNullable(tPartialDictionary(t.keyof(CaseNameToType), t.string)),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface CasesPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    logs: GuildLogs;
    cases: GuildCases;
    archives: GuildArchives;
  };
}

/**
 * Can also be used as a config object for functions that create cases
 */
export type CaseArgs = {
  userId: string;
  modId: string;
  ppId?: string;
  type: CaseTypes;
  auditLogId?: string;
  reason?: string;
  automatic?: boolean;
  postInCaseLogOverride?: boolean;
  noteDetails?: string[];
  extraNotes?: string[];
  hide?: boolean;
};

export type CaseNoteArgs = {
  caseId: number;
  modId: string;
  body: string;
  automatic?: boolean;
  postInCaseLogOverride?: boolean;
  noteDetails?: string[];
};
