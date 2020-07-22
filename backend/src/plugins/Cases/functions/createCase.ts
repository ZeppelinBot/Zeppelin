import { CaseArgs, CasesPluginType } from "../types";
import { resolveUser } from "../../../utils";
import { PluginData } from "knub";
import { createCaseNote } from "./createCaseNote";
import { postCaseToCaseLogChannel } from "./postToCaseLogChannel";
import { logger } from "../../../logger";

export async function createCase(pluginData: PluginData<CasesPluginType>, args: CaseArgs) {
  const user = await resolveUser(pluginData.client, args.userId);
  const userName = `${user.username}#${user.discriminator}`;

  const mod = await resolveUser(pluginData.client, args.modId);
  const modName = `${mod.username}#${mod.discriminator}`;

  let ppName = null;
  if (args.ppId) {
    const pp = await resolveUser(pluginData.client, args.ppId);
    ppName = `${pp.username}#${pp.discriminator}`;
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
    user_id: args.userId,
    user_name: userName,
    mod_id: args.modId,
    mod_name: modName,
    audit_log_id: args.auditLogId,
    pp_id: args.ppId,
    pp_name: ppName,
  });

  if (args.reason || (args.noteDetails && args.noteDetails.length)) {
    await createCaseNote(pluginData, {
      caseId: createdCase.id,
      modId: args.modId,
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
        modId: args.modId,
        body: extraNote,
        automatic: args.automatic,
        postInCaseLogOverride: false,
      });
    }
  }

  const config = pluginData.config.get();

  if (
    config.case_log_channel &&
    (!args.automatic || config.log_automatic_actions) &&
    args.postInCaseLogOverride !== false
  ) {
    await postCaseToCaseLogChannel(pluginData, createdCase);
  }

  return createdCase;
}
