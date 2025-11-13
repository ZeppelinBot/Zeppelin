import type { Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { logger } from "../../../logger.js";
import { renderUsername, resolveUser } from "../../../utils.js";
import { CaseArgs, CasesPluginType } from "../types.js";
import { createCaseNote } from "./createCaseNote.js";
import { postCaseToCaseLogChannel } from "./postToCaseLogChannel.js";

export async function createCase(pluginData: GuildPluginData<CasesPluginType>, args: CaseArgs) {
  const user = await resolveUser(pluginData.client, args.userId, "Cases:createCase");
  const name = renderUsername(user);

  const mod = await resolveUser(pluginData.client, args.modId, "Cases:createCase");
  const modName = renderUsername(mod);

  let ppName: string | null = null;
  let ppId: Snowflake | null = null;
  if (args.ppId) {
    const pp = await resolveUser(pluginData.client, args.ppId, "Cases:createCase");
    ppName = renderUsername(pp);
    ppId = pp.id;
  }

  if (args.auditLogId) {
    const existingAuditLogCase = await pluginData.state.cases.findByAuditLogId(args.auditLogId);
    if (existingAuditLogCase) {
      delete args.auditLogId;
      logger.warn(`Duplicate audit log ID for mod case: ${args.auditLogId}`);
    }
  }

  const createdCase = await pluginData.state.cases.create({
    type: args.type,
    user_id: user.id,
    user_name: name,
    mod_id: mod.id,
    mod_name: modName,
    audit_log_id: args.auditLogId,
    pp_id: ppId,
    pp_name: ppName,
    is_hidden: Boolean(args.hide),
  });

  if (args.reason || args.noteDetails?.length) {
    await createCaseNote(pluginData, {
      caseId: createdCase.id,
      modId: mod.id,
      body: args.reason || "",
      automatic: args.automatic,
      postInCaseLogOverride: false,
      noteDetails: args.noteDetails,
    });
  }

  if (args.extraNotes) {
    for (const extraNote of args.extraNotes) {
      await createCaseNote(pluginData, {
        caseId: createdCase.id,
        modId: mod.id,
        body: extraNote,
        automatic: args.automatic,
        postInCaseLogOverride: false,
      });
    }
  }

  const config = pluginData.config.get();

  const shouldPostToCaseLogChannel =
    args.postInCaseLogOverride === true ||
    ((!args.automatic || config.log_automatic_actions) && args.postInCaseLogOverride !== false);

  if (config.case_log_channel && shouldPostToCaseLogChannel) {
    await postCaseToCaseLogChannel(pluginData, createdCase);
  }

  return createdCase;
}
