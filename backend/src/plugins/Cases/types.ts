import { BasePluginType } from "knub";
import { U } from "ts-toolbelt";
import z from "zod";
import { CaseNameToType, CaseTypes } from "../../data/CaseTypes.js";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildCases } from "../../data/GuildCases.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { keys, zBoundedCharacters, zDelayString, zSnowflake } from "../../utils.js";
import { zColor } from "../../utils/zColor.js";

const caseKeys = keys(CaseNameToType) as U.ListOf<keyof typeof CaseNameToType>;

export const zCasesConfig = z.strictObject({
  log_automatic_actions: z.boolean(),
  case_log_channel: zSnowflake.nullable(),
  show_relative_times: z.boolean(),
  relative_time_cutoff: zDelayString.default("1w"),
  case_colors: z.record(z.enum(caseKeys), zColor).nullable(),
  case_icons: z.record(z.enum(caseKeys), zBoundedCharacters(0, 100)).nullable(),
});

export interface CasesPluginType extends BasePluginType {
  config: z.infer<typeof zCasesConfig>;
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
