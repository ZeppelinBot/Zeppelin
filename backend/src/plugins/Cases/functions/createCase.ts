import type { Snowflake } from "discord-api-types/globals";
import { GuildPluginData } from "knub";
import { logger } from "../../../logger";
import { resolveUser } from "../../../utils";
import { CaseArgs, CasesPluginType } from "../types";
import { createCaseNote } from "./createCaseNote";
import { postCaseToCaseLogChannel } from "./postToCaseLogChannel";
import { getDashboardUrl } from "../../../pluginUtils";
import { CaseTypes } from "../../../data/CaseTypes";

export async function createCase(pluginData: GuildPluginData<CasesPluginType>, args: CaseArgs) {
  const casesTypesWithoutArchive = [CaseTypes.Note, CaseTypes.Unban];
  const user = await resolveUser(pluginData.client, args.userId);
  const userName = user.tag;

  const mod = await resolveUser(pluginData.client, args.modId);
  const modName = mod.tag;

  let ppName: string | null = null;
  let ppId: Snowflake | null = null;
  if (args.ppId) {
    const pp = await resolveUser(pluginData.client, args.ppId);
    ppName = pp.tag;
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
    user_name: userName,
    mod_id: mod.id,
    mod_name: modName,
    audit_log_id: args.auditLogId,
    pp_id: ppId,
    pp_name: ppName,
    is_hidden: Boolean(args.hide),
  });

  if (!casesTypesWithoutArchive.includes(args.type)) {
    const messagesToArchive = Array.from(await pluginData.state.savedMessages.getUserMessages(user.id, 50)).sort(
      (a, b) => (a.posted_at > b.posted_at ? 1 : -1),
    );
    let noteBody = `No automatic archive was created because no messages were found for this user.`;

    if (messagesToArchive.length > 0) {
      const archiveId = await pluginData.state.archives.createFromSavedMessages(messagesToArchive, pluginData.guild);
      const baseUrl = getDashboardUrl(pluginData);

      noteBody = `Automatically archived messages: ${pluginData.state.archives.getUrl(baseUrl, archiveId)}`;
    }

    await createCaseNote(pluginData, {
      caseId: createdCase.id,
      modId: mod.id,
      body: noteBody,
      automatic: args.automatic,
      postInCaseLogOverride: false,
    });
  }

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
